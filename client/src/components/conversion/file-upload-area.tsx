import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";

interface FileUploadAreaProps {
  onFilesSelected: (files: File[]) => void;
}

export default function FileUploadArea({ onFilesSelected }: FileUploadAreaProps) {
  return (
    <Dropzone onFilesDrop={onFilesSelected} className="p-8 mb-6 text-center">
      <div className="mb-4">
        <UploadCloud className="h-16 w-16 text-primary-500 mx-auto" />
      </div>
      <h3 className="font-semibold text-lg mb-2">
        Arraste e solte seus arquivos PDF aqui
      </h3>
      <p className="text-neutral-600 mb-4">ou</p>
      <Button className="px-5 py-2.5 font-medium">
        Selecionar arquivos
      </Button>
      <p className="mt-3 text-xs text-neutral-500">
        Arquivos aceitos: PDF (máx. 20MB por arquivo)
      </p>
    </Dropzone>
  );
}
