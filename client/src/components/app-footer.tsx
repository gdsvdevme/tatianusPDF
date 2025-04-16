import { FileText } from "lucide-react";

export default function AppFooter() {
  return (
    <footer className="bg-white border-t border-neutral-200 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="text-primary h-5 w-5" />
            <span className="font-medium text-neutral-900">Tatianus PDF/A</span>
          </div>
          <div className="text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} Tatianus PDF/A - Conversor de PDF para PDF/A 2u com OCR
          </div>
          <div className="flex gap-4 text-sm">
            <a href="#" className="text-neutral-600 hover:text-neutral-900">Termos de Uso</a>
            <a href="#" className="text-neutral-600 hover:text-neutral-900">Privacidade</a>
            <a href="#" className="text-neutral-600 hover:text-neutral-900">Contato</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
