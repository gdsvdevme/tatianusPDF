import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ProcessingFile {
  id: string;
  name: string;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  error?: string;
}

interface ConversionProgressProps {
  progress: number;
  processingFiles: ProcessingFile[];
  totalFiles: number;
  onCancel: () => void;
}

export default function ConversionProgress({
  progress,
  processingFiles,
  totalFiles,
  onCancel,
}: ConversionProgressProps) {
  const getStatusBadge = (status: ProcessingFile['status']) => {
    switch (status) {
      case 'waiting':
        return <span className="text-xs bg-neutral-100 text-neutral-600 py-1 px-2 rounded-full font-medium">Aguardando</span>;
      case 'processing':
        return <span className="text-xs bg-blue-100 text-blue-800 py-1 px-2 rounded-full font-medium animate-pulse">Processando</span>;
      case 'completed':
        return <span className="text-xs bg-green-100 text-green-800 py-1 px-2 rounded-full font-medium">Concluído</span>;
      case 'failed':
        return <span className="text-xs bg-red-100 text-red-800 py-1 px-2 rounded-full font-medium">Falha</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm mb-6">
      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Conversão em andamento</h3>
          <span className="text-sm text-neutral-500">{processingFiles.filter(f => f.status === 'completed').length} de {totalFiles}</span>
        </div>
      </div>
      <div className="p-5">
        <div className="mb-4">
          <Progress value={progress} className="h-2 w-full" />
          <div className="mt-2 text-center">
            <span className="text-sm text-neutral-600">{progress}%</span>
          </div>
        </div>
        
        <div className="space-y-3 mt-4">
          {processingFiles.map((file) => (
            <div key={file.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-neutral-800 truncate max-w-xs md:max-w-md">{file.name}</span>
              </div>
              {getStatusBadge(file.status)}
            </div>
          ))}
        </div>
        
        <div className="mt-5 text-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onCancel}
            className="text-neutral-700"
          >
            Cancelar processo
          </Button>
        </div>
      </div>
    </div>
  );
}
