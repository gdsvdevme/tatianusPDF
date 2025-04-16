import { useState, useRef, ChangeEvent, DragEvent, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileIcon, CloudUploadIcon, XIcon, ChevronRightIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";

type UploadState = 'idle' | 'dragging' | 'uploading' | 'processing' | 'success' | 'error';

interface FileDetails {
  file: File;
  name: string;
  size: string;
}

interface ConversionProgress {
  jobId: number;
  status: string;
  progress: number;
  stage: string;
  outputUrl?: string | null;
  errorMessage?: string | null;
}

const Home = () => {
  const { toast } = useToast();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<FileDetails | null>(null);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mutation for uploading and starting the conversion
  const conversionMutation = useMutation({
    mutationFn: async (file: File) => {
      // In a real implementation, we would upload the file to a storage service
      // and get a URL back. Here we're simulating that.
      const formData = new FormData();
      formData.append("file", file);
      
      // Simulate file upload
      setUploadState('uploading');
      
      // Simulate API call to create a conversion job
      const response = await apiRequest("POST", "/api/pdf/convert", {
        originalName: file.name,
        inputUrl: URL.createObjectURL(file), // In a real app, this would be a server URL
      });
      
      const job = await response.json();
      setCurrentJobId(job.id);
      
      // Start processing the conversion
      await apiRequest("POST", `/api/pdf/jobs/${job.id}/process`, {
        options: {
          applyOcr: true,
          formatType: 'pdf_a_2u'
        }
      });
      
      return job.id;
    },
    onSuccess: (jobId) => {
      setUploadState('processing');
      // Start polling for progress
      queryClient.prefetchQuery({
        queryKey: [`/api/pdf/jobs/${jobId}/progress`],
        staleTime: 0,
      });
    },
    onError: (error) => {
      setUploadState('error');
      setErrorMessage("Falha ao iniciar a conversão. Por favor, tente novamente.");
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao iniciar a conversão. Por favor, tente novamente.",
      });
    }
  });

  // Query for job progress
  const progressQuery = useQuery({
    queryKey: currentJobId ? [`/api/pdf/jobs/${currentJobId}/progress`] : [],
    enabled: !!currentJobId && uploadState === 'processing',
    refetchInterval: 1000, // Poll every second
    staleTime: 0
  });
  
  // Use a useEffect hook for handling success/error states from the query
  useEffect(() => {
    if (progressQuery.data) {
      const data = progressQuery.data as ConversionProgress;
      if (data.status === 'completed') {
        setUploadState('success');
        toast({
          title: "Sucesso",
          description: "Conversão concluída com sucesso!",
        });
      } else if (data.status === 'failed') {
        setUploadState('error');
        setErrorMessage(data.errorMessage || "Ocorreu um erro durante a conversão.");
        toast({
          variant: "destructive",
          title: "Erro",
          description: data.errorMessage || "Ocorreu um erro durante a conversão.",
        });
      }
    }
  }, [progressQuery.data, toast]);

  const progressData = progressQuery.data as ConversionProgress | undefined;

  // Handle file selection from input
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Prevent event propagation
    
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Por favor, selecione um arquivo PDF válido.",
        });
        return;
      }
      
      // Set the selected file data
      const fileDetails = {
        file,
        name: file.name,
        size: formatFileSize(file.size)
      };
      
      setSelectedFile(fileDetails);
      
      // Reset state
      setUploadState('idle');
      setErrorMessage("");
      setCurrentJobId(null);
      
      // Automatically start conversion after selecting the file
      setTimeout(() => {
        conversionMutation.mutate(file);
      }, 300);
    }
  };

  // Handle file drag over
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setUploadState('dragging');
  };

  // Handle file drag leave
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setUploadState('idle');
  };

  // Handle file drop
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setUploadState('idle');
    
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile({
          file,
          name: file.name,
          size: formatFileSize(file.size)
        });
        
        // Reset state
        setErrorMessage("");
        setCurrentJobId(null);
        
        // Automatically start conversion after dropping the file
        setTimeout(() => {
          conversionMutation.mutate(file);
        }, 500);
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Por favor, selecione um arquivo PDF válido.",
        });
      }
    }
  };

  // Handle file browser click
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file removal
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadState('idle');
    setErrorMessage("");
    setCurrentJobId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle conversion start
  const handleConversion = () => {
    if (selectedFile) {
      conversionMutation.mutate(selectedFile.file);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (progressData?.outputUrl) {
      // Trigger actual download by sending a request to the server
      // This will download the PDF file with proper headers
      window.location.href = progressData.outputUrl;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-slate-50 text-slate-800 font-sans min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <FileIcon className="w-8 h-8 text-primary" />
            <h1 className="ml-2 text-xl font-bold text-slate-800">Tatianus</h1>
          </div>
          <div>
            <span className="text-sm text-slate-500">Conversor PDF/A com OCR</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Converta seus PDFs para o formato PDF/A-2U com OCR</h2>
            <p className="text-slate-600">Faça upload de seus arquivos PDF e converta-os em documentos PDF/A com reconhecimento de texto (OCR)</p>
          </div>

          {/* File Uploader */}
          <Card className="mb-6">
            <CardContent className="p-6">
              {/* Upload Area */}
              <div 
                className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center transition-all cursor-pointer
                  ${uploadState === 'dragging' ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={!selectedFile ? handleBrowseClick : undefined}
              >
                {!selectedFile && (
                  <>
                    <div className="upload-icon mb-4">
                      <CloudUploadIcon className="w-12 h-12 mx-auto text-slate-400" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Arraste e solte seu arquivo PDF aqui</h3>
                    <p className="text-slate-500 mb-4">ou</p>
                    <Button onClick={handleBrowseClick}>
                      Selecionar arquivo
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept=".pdf" 
                      onChange={handleFileSelect} 
                    />
                    <p className="text-sm text-slate-500 mt-3">Tamanho máximo: 50MB</p>
                  </>
                )}
              </div>

              {/* File Details */}
              {selectedFile && (
                <div className="flex items-center p-3 bg-slate-50 rounded-lg">
                  <FileIcon className="w-10 h-10 text-red-500 mr-3" />
                  <div className="flex-grow">
                    <p className="font-medium text-slate-800 truncate">{selectedFile.name}</p>
                    <p className="text-sm text-slate-500">{selectedFile.size}</p>
                  </div>
                  <button 
                    className="text-slate-400 hover:text-red-500"
                    onClick={handleRemoveFile}
                    disabled={uploadState === 'uploading' || uploadState === 'processing'}
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Progress Bar */}
              {(uploadState === 'uploading' || uploadState === 'processing') && (
                <div className="mt-6">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">
                      {uploadState === 'uploading' ? 'Enviando arquivo...' : progressData?.stage || 'Processando...'}
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      {uploadState === 'uploading' ? '50%' : `${progressData?.progress || 0}%`}
                    </span>
                  </div>
                  <Progress 
                    value={uploadState === 'uploading' ? 50 : progressData?.progress || 0} 
                    className="w-full h-2.5"
                  />
                </div>
              )}

              {/* Status Messages */}
              {uploadState === 'success' && (
                <Alert className="mt-4 bg-green-50 border-green-200 text-green-800">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <AlertDescription>
                    Conversão concluída com sucesso! Seu documento PDF/A-2U com OCR está pronto para download.
                  </AlertDescription>
                </Alert>
              )}

              {uploadState === 'error' && (
                <Alert className="mt-4 bg-red-50 border-red-200 text-red-800">
                  <AlertCircleIcon className="w-4 h-4 text-red-500" />
                  <AlertDescription>
                    {errorMessage || "Ocorreu um erro durante a conversão. Por favor, tente novamente."}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row sm:justify-between">
                <Button
                  className="w-full sm:w-auto mb-3 sm:mb-0"
                  disabled={
                    !selectedFile || 
                    uploadState === 'uploading' || 
                    uploadState === 'processing'
                  }
                  onClick={handleConversion}
                >
                  Converter para PDF/A-2U com OCR
                  <ChevronRightIcon className="ml-2 h-4 w-4" />
                </Button>
                
                {uploadState === 'success' && (
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={handleDownload}
                  >
                    Baixar arquivo convertido
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Conversion Info */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-3">Sobre o Formato PDF/A-2U</h3>
              <p className="mb-4 text-slate-600">
                O PDF/A-2U é um formato de arquivo para arquivamento de longo prazo que garante que o documento possa ser reproduzido exatamente da mesma forma no futuro. O sufixo "U" indica que o texto é Unicode, permitindo pesquisabilidade completa.
              </p>
              
              <h4 className="font-semibold mb-2">Recursos desta ferramenta:</h4>
              <ul className="list-disc pl-5 text-slate-600 space-y-1">
                <li>Conversão para formato PDF/A-2U compatível com ISO</li>
                <li>Reconhecimento óptico de caracteres (OCR)</li>
                <li>Preservação de fontes e formatação original</li>
                <li>Conformidade com requisitos de arquivamento digital</li>
                <li>Documentos pesquisáveis e acessíveis</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>Tatianus - Ferramenta de conversão PDF/A com OCR</p>
          <p className="mt-1">Compatível com deploy na Vercel e Netlify</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
