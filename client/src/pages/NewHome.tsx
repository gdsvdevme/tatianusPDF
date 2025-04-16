import { useState, useRef, ChangeEvent, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check as CheckIcon,
  AlertCircle as AlertCircleIcon,
  Upload as UploadIcon,
  File as FileIcon,
  X as XIcon,
  Download as DownloadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types for component state
type FileState = {
  file: File;
  name: string;
  size: string;
};

type ConversionStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface ConversionProgress {
  jobId: number;
  status: string;
  progress: number;
  stage: string;
  outputUrl?: string;
  errorMessage?: string;
}

const PdfConverter = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [selectedFile, setSelectedFile] = useState<FileState | null>(null);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [jobId, setJobId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Mutation for uploading and creating a conversion job
  const createJobMutation = useMutation({
    mutationFn: async (file: File) => {
      setStatus('uploading');
      
      // Create form data with file
      const formData = new FormData();
      formData.append('originalName', file.name);
      formData.append('inputUrl', 'clientside'); // We're handling file directly in client

      // API request to create job
      const response = await fetch('/api/pdf/convert', {
        method: 'POST',
        body: JSON.stringify({
          originalName: file.name,
          inputUrl: 'clientside',
          status: 'pending'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to create conversion job');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setJobId(data.id);
      processFile(data.id);
    },
    onError: (error) => {
      setStatus('error');
      setErrorMessage("Falha ao iniciar processo de conversão. Por favor, tente novamente.");
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível iniciar a conversão. Por favor, tente novamente.",
      });
    }
  });

  // Mutation for processing the PDF
  const processFileMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      setStatus('processing');
      
      // API request to process file with options
      const response = await fetch(`/api/pdf/jobs/${id}/process`, {
        method: 'POST',
        body: JSON.stringify({
          options: {
            applyOcr: true,
            formatType: 'pdf_a_2u'
          }
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to process PDF file');
      }
      
      return await response.json();
    },
    onError: (error) => {
      setStatus('error');
      setErrorMessage("Falha ao processar o arquivo PDF. Por favor, tente novamente.");
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro durante o processamento do arquivo.",
      });
    }
  });

  // Query for checking conversion progress
  const progressQuery = useQuery({
    queryKey: ['/api/pdf/jobs/progress', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      
      const response = await fetch(`/api/pdf/jobs/${jobId}/progress`);
      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }
      
      return await response.json() as ConversionProgress;
    },
    enabled: !!jobId && (status === 'processing' || status === 'uploading'),
    refetchInterval: 1000,
    staleTime: 0
  });

  // Process file after job creation
  const processFile = (id: number) => {
    if (selectedFile) {
      processFileMutation.mutate({ id, file: selectedFile.file });
    }
  };

  // Handle file selection
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      if (file.type !== 'application/pdf') {
        toast({
          variant: "destructive",
          title: "Tipo de arquivo inválido",
          description: "Por favor, selecione apenas arquivos PDF.",
        });
        return;
      }
      
      // Reset previous state
      resetState();
      
      // Set new file
      setSelectedFile({
        file,
        name: file.name,
        size: formatFileSize(file.size)
      });
      
      // Automatically start conversion process
      createJobMutation.mutate(file);
    }
  };

  // Handle file drop
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Validate file type
      if (file.type !== 'application/pdf') {
        toast({
          variant: "destructive",
          title: "Tipo de arquivo inválido",
          description: "Por favor, solte apenas arquivos PDF.",
        });
        return;
      }
      
      // Reset previous state
      resetState();
      
      // Set new file
      setSelectedFile({
        file,
        name: file.name,
        size: formatFileSize(file.size)
      });
      
      // Automatically start conversion process
      createJobMutation.mutate(file);
    }
  };

  // Handle download of converted file
  const handleDownload = () => {
    const progress = progressQuery.data as ConversionProgress;
    if (progress?.outputUrl) {
      window.location.href = progress.outputUrl;
    }
  };

  // Reset state for new conversion
  const resetState = () => {
    setStatus('idle');
    setJobId(null);
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    resetState();
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Process progress data from query
  const progressData = progressQuery.data as ConversionProgress | undefined;
  
  // Use effect to handle status changes to prevent React warnings
  useEffect(() => {
    if (progressData && status === 'processing') {
      if (progressData.status === 'completed') {
        setStatus('success');
        toast({
          title: "Conversão finalizada",
          description: "Seu arquivo PDF/A-2U está pronto para download!",
        });
      } else if (progressData.status === 'failed') {
        setStatus('error');
        setErrorMessage(progressData.errorMessage || "Ocorreu um erro na conversão.");
        toast({
          variant: "destructive",
          title: "Erro na conversão",
          description: progressData.errorMessage || "Ocorreu um erro durante o processo.",
        });
      }
    }
  }, [progressData, status, toast]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileIcon className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Tatianus</h1>
          </div>
          <div className="text-sm text-gray-500">
            Conversor PDF/A-2U com OCR
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Conversor de PDF para PDF/A-2U</h2>
            <p className="text-gray-600">
              Converta seus documentos PDF para o formato PDF/A-2U com reconhecimento de caracteres (OCR)
            </p>
          </div>

          {/* Converter Card */}
          <Card className="mb-6 overflow-hidden">
            <CardContent className="p-6">
              {/* Upload Area */}
              {!selectedFile ? (
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
                    "hover:border-primary/50 hover:bg-primary/5"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                >
                  <div className="mb-4">
                    <UploadIcon className="h-12 w-12 mx-auto text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Arraste e solte seu arquivo PDF aqui</h3>
                  <p className="text-gray-500 mb-4">ou</p>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Selecionar arquivo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500 mt-3">PDF até 10MB</p>
                </div>
              ) : (
                <div>
                  {/* File Information */}
                  <div className="flex items-center p-4 bg-gray-50 rounded-lg mb-4">
                    <FileIcon className="h-10 w-10 text-primary mr-4" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">{selectedFile.size}</p>
                    </div>
                    {status !== 'uploading' && status !== 'processing' && (
                      <button
                        onClick={handleRemoveFile}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <XIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Progress Indicator */}
                  {(status === 'uploading' || status === 'processing') && (
                    <div className="mt-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">
                          {status === 'uploading' 
                            ? 'Enviando arquivo...' 
                            : progressData?.stage || 'Processando...'}
                        </span>
                        <span className="text-sm">
                          {status === 'uploading' 
                            ? '50%' 
                            : `${progressData?.progress || 0}%`}
                        </span>
                      </div>
                      <Progress
                        value={status === 'uploading' ? 50 : progressData?.progress || 0}
                        className="h-2"
                      />
                    </div>
                  )}

                  {/* Success Message */}
                  {status === 'success' && (
                    <Alert className="mt-4 bg-green-50 border-green-100 text-green-800">
                      <CheckIcon className="h-4 w-4 mr-2 text-green-500" />
                      <AlertDescription>
                        Conversão concluída com sucesso! Seu arquivo PDF/A-2U está pronto para download.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Error Message */}
                  {status === 'error' && (
                    <Alert className="mt-4 bg-red-50 border-red-100 text-red-800">
                      <AlertCircleIcon className="h-4 w-4 mr-2 text-red-500" />
                      <AlertDescription>
                        {errorMessage || "Ocorreu um erro na conversão. Por favor, tente novamente."}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex justify-end space-x-2">
                    {status === 'success' && progressData?.outputUrl && (
                      <Button
                        onClick={handleDownload}
                        className="flex items-center"
                      >
                        <DownloadIcon className="mr-2 h-4 w-4" />
                        Baixar PDF/A-2U
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-3">Sobre o Formato PDF/A-2U</h3>
              <p className="text-gray-600 mb-4">
                O PDF/A-2U é um formato de arquivo para arquivamento de longo prazo que garante 
                que o documento possa ser reproduzido com precisão no futuro. O sufixo "U" 
                indica Unicode, permitindo pesquisa de texto completa e acessibilidade.
              </p>
              
              <h4 className="font-medium mb-2">Recursos desta ferramenta:</h4>
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                <li>Conversão para PDF/A-2U compatível com ISO 19005-2</li>
                <li>OCR (Reconhecimento Óptico de Caracteres) para documentos digitalizados</li>
                <li>Incorporação de fontes e metadados conforme o padrão PDF/A</li>
                <li>Processo 100% compatível com Vercel e Netlify</li>
                <li>Sem limite de conversões</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>Tatianus - Conversor PDF/A-2U</p>
          <p className="mt-1">Compatível com deploy na Vercel e Netlify</p>
        </div>
      </footer>
    </div>
  );
};

export default PdfConverter;