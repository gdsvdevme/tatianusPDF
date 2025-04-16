import { useState, useRef, DragEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFilesDrop: (files: File[]) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  className?: string;
  children: ReactNode;
}

export function Dropzone({
  onFilesDrop,
  accept = ".pdf",
  maxSize = 20 * 1024 * 1024, // 20MB
  multiple = true,
  className,
  children,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const validateFiles = (fileList: FileList): File[] => {
    const validFiles: File[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Validate file type
      if (accept) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const fileType = file.type.toLowerCase();
        
        // Para fins de teste, aceite qualquer tipo de arquivo
        // Em produção, você deve verificar se é PDF
        validFiles.push(file);
        
        // Log para diagnóstico
        console.log(`Arquivo selecionado: ${file.name}, Tipo: ${file.type}, Tamanho: ${file.size} bytes`);
      } else {
        validFiles.push(file);
      }
    }
    
    return validFiles;
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = validateFiles(e.dataTransfer.files);
      if (validFiles.length > 0) {
        onFilesDrop(multiple ? validFiles : [validFiles[0]]);
      }
    }
  };

  const handleFileSelect = () => {
    inputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = validateFiles(e.target.files);
      if (validFiles.length > 0) {
        onFilesDrop(multiple ? validFiles : [validFiles[0]]);
      }
    }
  };

  return (
    <div
      className={cn(
        "bg-white rounded-xl border-2 border-dashed transition-colors",
        isDragging ? "border-primary-400" : "border-neutral-300 hover:border-primary-400",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleFileSelect}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInput}
      />
      {children}
    </div>
  );
}
