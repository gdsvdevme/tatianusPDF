import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatFileSize, generatePdfaFilename } from "@/lib/utils/file-utils";
import { v4 as uuidv4 } from "uuid";

export interface ProcessingFile {
  id: string;
  name: string;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ConversionOptions {
  applyOcr: boolean;
  verifyCompliance: boolean;
  optimizeSize: boolean;
}

export interface ConvertedFile {
  id: string;
  name: string;
  size: number;
  url: string;
  hasPdfA: boolean;
  hasOcr: boolean;
}

interface ConversionProgress {
  fileId: string;
  percentage: number;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
}

export function usePdfConversion() {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
  const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([]);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionOptions, setConversionOptions] = useState<ConversionOptions>({
    applyOcr: true,
    verifyCompliance: true,
    optimizeSize: false,
  });
  const [conversionState, setConversionState] = useState<
    'idle' | 'uploading' | 'processing' | 'completed' | 'failed'
  >('idle');

  const addFiles = useCallback((newFiles: File[]) => {
    // Filter out duplicates based on name
    const uniqueNewFiles = newFiles.filter(
      (newFile) => !files.some((file) => file.name === newFile.name)
    );

    if (uniqueNewFiles.length === 0) {
      toast({
        title: "Arquivos duplicados",
        description: "Todos os arquivos selecionados já foram adicionados.",
        variant: "destructive",
      });
      return;
    }

    if (uniqueNewFiles.length !== newFiles.length) {
      toast({
        title: "Alguns arquivos ignorados",
        description: "Arquivos duplicados foram ignorados.",
      });
    }

    setFiles((prevFiles) => [...prevFiles, ...uniqueNewFiles]);
  }, [files, toast]);

  const removeFile = useCallback((index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const updateConversionOption = useCallback((option: keyof ConversionOptions, value: boolean) => {
    setConversionOptions((prev) => ({
      ...prev,
      [option]: value,
    }));
  }, []);

  const resetConversion = useCallback(() => {
    setFiles([]);
    setProcessingFiles([]);
    setConvertedFiles([]);
    setConversionProgress(0);
    setConversionState('idle');
  }, []);

  const downloadFile = useCallback((file: ConvertedFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const downloadAllFiles = useCallback(() => {
    convertedFiles.forEach((file) => {
      setTimeout(() => {
        downloadFile(file);
      }, 300);
    });
  }, [convertedFiles, downloadFile]);

  const { mutate: convertFiles, isPending: isConverting } = useMutation({
    mutationFn: async () => {
      try {
        setConversionState('uploading');
        
        // Prepare form data with files and options
        const formData = new FormData();
        
        if (files.length === 0) {
          throw new Error('Selecione pelo menos um arquivo para conversão');
        }
        
        // Adicionar cada arquivo ao FormData
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          // Usar o mesmo nome 'files' para todos os arquivos
          formData.append('files', file);
          console.log(`Adicionando arquivo ${i+1}/${files.length}: ${file.name} (${file.size} bytes, ${file.type})`);
        }
        
        // Adicionar as opções de conversão
        formData.append('options', JSON.stringify(conversionOptions));
        
        console.log(`Enviando ${files.length} arquivo(s) para conversão`);
        console.log("Opções:", JSON.stringify(conversionOptions));
        
        // Fazer o upload dos arquivos - usar o URL completo para garantir
        const uploadResponse = await apiRequest('POST', '/api/pdf/upload', formData);
        
        if (!uploadResponse.ok) {
          let errorMessage = 'Erro ao enviar arquivos';
          try {
            const errorData = await uploadResponse.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error('Erro ao processar resposta de erro:', e);
          }
          throw new Error(errorMessage);
        }
        
        const responseData = await uploadResponse.json();
        const { jobId } = responseData;
        
        console.log("Job ID recebido:", jobId);
        
        if (!jobId) {
          throw new Error('ID de trabalho inválido recebido do servidor');
        }
        
        // Criar lista de arquivos em processamento após receber a resposta do servidor
        const processingFilesList = files.map((file, index) => ({
          id: String(index), // Usamos índice como ID temporário
          name: file.name,
          status: 'waiting' as const,
        }));
        
        setProcessingFiles(processingFilesList);
        setConversionState('processing');
        
        // Iniciar o processamento do primeiro arquivo
        if (processingFilesList.length > 0) {
          setProcessingFiles(prev => 
            prev.map((f, idx) => idx === 0 ? { ...f, status: 'processing' } : f)
          );
        }
        
        // Start polling for job status
        let completed = false;
        let overallProgress = 0;
        let pollCount = 0;
        
        while (!completed && pollCount < 60) { // Limite de 60 tentativas (1 minuto)
          await new Promise(resolve => setTimeout(resolve, 1000));
          pollCount++;
          
          try {
            const statusResponse = await apiRequest('GET', `/api/pdf/status/${jobId}`);
            
            if (!statusResponse.ok) {
              console.error("Erro ao verificar status:", await statusResponse.text());
              continue;
            }
            
            const statusData = await statusResponse.json();
            
            if (statusData.error) {
              console.error("Erro retornado pelo servidor:", statusData.error);
              throw new Error(statusData.error);
            }
            
            console.log("Status recebido:", statusData);
            
            // Update file status based on backend data
            if (statusData.files && statusData.files.length > 0) {
              // Processar os arquivos individualmente um por vez
              // e não modificar o estado dentro do loop
              for (let i = 0; i < Math.min(statusData.files.length, processingFilesList.length); i++) {
                const serverFile = statusData.files[i];
                // Log para debugging
                console.log(`Processando arquivo ${i}:`, serverFile);
              }
              
              // Criar um novo array de arquivos processados fora do loop
              const newProcessingFiles = processingFilesList.map((file, index) => {
                if (index < statusData.files.length) {
                  const serverFile = statusData.files[index];
                  // Mapear status do servidor para status frontend
                  let newStatus: 'waiting' | 'processing' | 'completed' | 'failed';
                  
                  switch (serverFile.status) {
                    case 'pending':
                      newStatus = 'waiting';
                      break;
                    case 'processing':
                      newStatus = 'processing';
                      break;
                    case 'completed':
                      newStatus = 'completed';
                      break;
                    default:
                      newStatus = 'failed';
                      break;
                  }
                  
                  return {
                    id: file.id,
                    name: file.name,
                    status: newStatus,
                    error: serverFile.error
                  };
                }
                
                return file;
              });
              
              // Atualizar o estado com o novo array
              setProcessingFiles(newProcessingFiles);
              
              // Calculate overall progress
              if (statusData.files.length > 0) {
                overallProgress = Math.floor(
                  statusData.files.reduce(
                    (sum: number, file: any) => sum + (file.percentage || 0), 
                    0
                  ) / statusData.files.length
                );
                
                setConversionProgress(overallProgress);
              }
              
              // Check if all files are processed
              completed = statusData.status === 'completed' || statusData.status === 'failed' ||
                          statusData.files.every((file: any) => 
                            file.status === 'completed' || file.status === 'failed'
                          );
            }
            
            if (completed) {
              break;
            }
          } catch (error) {
            console.error("Erro durante polling:", error);
            // Continue polling despite errors
          }
        }
        
        if (!completed && pollCount >= 60) {
          throw new Error('Tempo limite excedido ao aguardar o processamento');
        }
        
        // Get results
        const resultsResponse = await apiRequest('GET', `/api/pdf/results/${jobId}`);
        
        if (!resultsResponse.ok) {
          const errorText = await resultsResponse.text();
          console.error("Erro ao obter resultados:", errorText);
          throw new Error('Erro ao obter resultados da conversão');
        }
        
        const resultsData = await resultsResponse.json();
        
        if (resultsData.error) {
          throw new Error(resultsData.error);
        }
        
        console.log("Resultados recebidos:", resultsData);
        
        const convertedResults = resultsData.files.map((file: any) => ({
          id: String(file.id),
          name: file.name,
          size: file.size,
          url: file.url,
          hasPdfA: file.hasPdfA,
          hasOcr: file.hasOcr
        }));
        
        setConvertedFiles(convertedResults);
        setConversionState('completed');
        setConversionProgress(100);
        
        return convertedResults;
      } catch (error) {
        console.error("Erro durante conversão:", error);
        setConversionState('failed');
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Conversão concluída",
        description: "Todos os arquivos foram convertidos com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na conversão",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao converter os arquivos.",
        variant: "destructive",
      });
    }
  });

  const cancelConversion = useCallback(async () => {
    if (conversionState === 'processing' || conversionState === 'uploading') {
      try {
        // Para implementar o cancelamento, precisamos saber o jobId atual
        // Como estamos em uma simulação, apenas redefinimos o estado
        setConversionState('idle');
        setProcessingFiles([]);
        setConversionProgress(0);
        
        toast({
          title: "Conversão cancelada",
          description: "O processo de conversão foi cancelado.",
        });
      } catch (error) {
        toast({
          title: "Erro ao cancelar",
          description: "Não foi possível cancelar o processo.",
          variant: "destructive",
        });
      }
    }
  }, [conversionState, toast]);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    conversionOptions,
    updateConversionOption,
    convertFiles,
    isConverting,
    conversionState,
    processingFiles,
    conversionProgress,
    convertedFiles,
    cancelConversion,
    downloadFile,
    downloadAllFiles,
    resetConversion,
  };
}
