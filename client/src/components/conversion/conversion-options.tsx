import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ConversionOptionsProps {
  applyOcr: boolean;
  verifyCompliance: boolean;
  optimizeSize: boolean;
  onOptionChange: (option: string, value: boolean) => void;
}

export default function ConversionOptions({
  applyOcr,
  verifyCompliance,
  optimizeSize,
  onOptionChange,
}: ConversionOptionsProps) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm mb-6">
      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
        <h3 className="font-semibold">Opções de conversão</h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Checkbox 
            id="apply_ocr" 
            checked={applyOcr}
            onCheckedChange={(checked) => onOptionChange('applyOcr', checked as boolean)}
          />
          <div>
            <Label htmlFor="apply_ocr" className="font-medium text-neutral-800 block">
              Aplicar OCR (Reconhecimento Ótico de Caracteres)
            </Label>
            <p className="text-sm text-neutral-500 mt-1">
              Torna o texto do documento pesquisável, mesmo se for uma imagem ou escaneado.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox 
            id="verify_compliance" 
            checked={verifyCompliance}
            onCheckedChange={(checked) => onOptionChange('verifyCompliance', checked as boolean)}
          />
          <div>
            <Label htmlFor="verify_compliance" className="font-medium text-neutral-800 block">
              Verificar conformidade com PDF/A 2u
            </Label>
            <p className="text-sm text-neutral-500 mt-1">
              Valida se o documento convertido está em conformidade com o padrão PDF/A 2u.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox 
            id="optimize_size" 
            checked={optimizeSize}
            onCheckedChange={(checked) => onOptionChange('optimizeSize', checked as boolean)}
          />
          <div>
            <Label htmlFor="optimize_size" className="font-medium text-neutral-800 block">
              Otimizar tamanho do arquivo
            </Label>
            <p className="text-sm text-neutral-500 mt-1">
              Comprime o arquivo resultante para reduzir o tamanho final (pode afetar a qualidade).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
