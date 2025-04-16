import { Upload, Settings, Download } from "lucide-react";

export default function ConversionSteps() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 mb-8 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-200">
        <div className="p-5 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mb-3">
            <Upload className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-neutral-900 mb-1">1. Selecione os arquivos</h3>
          <p className="text-sm text-neutral-600">Arraste ou selecione os arquivos PDF para conversão</p>
        </div>

        <div className="p-5 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mb-3">
            <Settings className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-neutral-900 mb-1">2. Confirme as opções</h3>
          <p className="text-sm text-neutral-600">Verifique as configurações de conversão para PDF/A 2u e OCR</p>
        </div>

        <div className="p-5 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mb-3">
            <Download className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-neutral-900 mb-1">3. Baixe o resultado</h3>
          <p className="text-sm text-neutral-600">Faça o download dos arquivos convertidos em formato PDF/A 2u</p>
        </div>
      </div>
    </div>
  );
}
