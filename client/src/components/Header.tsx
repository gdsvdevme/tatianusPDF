import { FileIcon } from "lucide-react";

export function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FileIcon className="text-primary w-6 h-6 mr-2" />
            <h1 className="text-xl font-semibold text-gray-900">Tatianus</h1>
          </div>
          <span className="text-sm text-secondary">PDF to PDF/A Converter</span>
        </div>
      </div>
    </header>
  );
}
