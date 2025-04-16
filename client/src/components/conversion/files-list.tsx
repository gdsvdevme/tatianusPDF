import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/utils/file-utils";

interface FilesListProps {
  files: File[];
  onRemoveFile: (index: number) => void;
  onClearAll: () => void;
}

export default function FilesList({ files, onRemoveFile, onClearAll }: FilesListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm mb-6 overflow-hidden">
      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Arquivos selecionados ({files.length})</h3>
          <button 
            className="text-neutral-500 hover:text-neutral-700 text-sm flex items-center"
            onClick={onClearAll}
          >
            <X className="h-4 w-4 mr-1" /> Limpar tudo
          </button>
        </div>
      </div>
      <div className="divide-y divide-neutral-200">
        {files.map((file, index) => (
          <div key={index} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium text-neutral-800 truncate max-w-xs md:max-w-md">
                  {file.name}
                </p>
                <p className="text-xs text-neutral-500">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <button 
              className="text-neutral-400 hover:text-neutral-700"
              onClick={() => onRemoveFile(index)}
              aria-label="Remover arquivo"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
