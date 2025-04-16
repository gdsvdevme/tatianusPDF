import { FileText } from "lucide-react";
import { HelpCircle, Settings } from "lucide-react";

export default function AppHeader() {
  return (
    <header className="bg-white border-b border-neutral-200 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FileText className="text-primary text-2xl" />
          <h1 className="text-xl font-bold text-neutral-900">Tatianus PDF/A</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="hidden sm:flex items-center text-neutral-600 hover:text-neutral-900 text-sm font-medium">
            <HelpCircle className="h-4 w-4 mr-1" />
            Ajuda
          </button>
          <button className="hidden sm:flex items-center text-neutral-600 hover:text-neutral-900 text-sm font-medium">
            <Settings className="h-4 w-4 mr-1" />
            Configurações
          </button>
        </div>
      </div>
    </header>
  );
}
