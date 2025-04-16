import { FileText, Download, RotateCcw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/utils/file-utils";

interface ConvertedFile {
  id: string;
  name: string;
  size: number;
  url: string;
  hasPdfA: boolean;
  hasOcr: boolean;
}

interface ConversionResultsProps {
  files: ConvertedFile[];
  onDownloadFile: (file: ConvertedFile) => void;
  onDownloadAll: () => void;
  onStartNew: () => void;
}

export default function ConversionResults({
  files,
  onDownloadFile,
  onDownloadAll,
  onStartNew,
}: ConversionResultsProps) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm mb-6">
      <div className="px-4 py-3 bg-green-50 border-b border-green-200">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-green-800">Conversão concluída com sucesso</h3>
        </div>
      </div>
      <div className="p-5">
        <div className="divide-y divide-neutral-200">
          {files.map((file) => (
            <div key={file.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-neutral-800 truncate max-w-xs md:max-w-md">{file.name}</p>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {file.hasPdfA && (
                      <span className="text-xs bg-green-100 text-green-800 py-0.5 px-2 rounded-full">PDF/A 2u</span>
                    )}
                    {file.hasOcr && (
                      <span className="text-xs bg-blue-100 text-blue-800 py-0.5 px-2 rounded-full">OCR</span>
                    )}
                    <span className="text-xs text-neutral-500">{formatFileSize(file.size)}</span>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 hover:bg-primary-200 font-medium"
                onClick={() => onDownloadFile(file)}
              >
                <Download className="h-4 w-4 mr-1" />
                Baixar
              </Button>
            </div>
          ))}
        </div>
        
        <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            className="px-4 py-2.5 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 font-medium"
            onClick={onDownloadAll}
          >
            <Download className="h-4 w-4 mr-1" />
            Baixar todos
          </Button>
          <Button
            className="px-4 py-2.5 font-medium"
            onClick={onStartNew}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Nova conversão
          </Button>
        </div>
      </div>
    </div>
  );
}
