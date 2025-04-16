import { useCallback } from "react";
import ConversionSteps from "@/components/conversion/conversion-steps";
import FileUploadArea from "@/components/conversion/file-upload-area";
import FilesList from "@/components/conversion/files-list";
import ConversionOptions from "@/components/conversion/conversion-options";
import ConversionProgress from "@/components/conversion/conversion-progress";
import ConversionResults from "@/components/conversion/conversion-results";
import { Button } from "@/components/ui/button";
import { usePdfConversion } from "@/hooks/use-pdf-conversion";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const {
    files,
    addFiles,
    removeFile,
    clearFiles,
    conversionOptions,
    updateConversionOption,
    convertFiles,
    isConverting,
    conversionState,
    processingFiles,
    conversionProgress,
    convertedFiles,
    cancelConversion,
    downloadFile,
    downloadAllFiles,
    resetConversion,
  } = usePdfConversion();

  const handleOptionChange = useCallback((option: string, value: boolean) => {
    updateConversionOption(option as any, value);
  }, [updateConversionOption]);
  
  const showFilesArea = files.length > 0 && conversionState === 'idle';
  const showActionButtons = showFilesArea;
  const showProgress = conversionState === 'uploading' || conversionState === 'processing';
  const showResults = conversionState === 'completed';
  
  return (
    <div className="max-w-4xl mx-auto">
      
      {/* Page Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
          Conversor PDF para PDF/A 2u com OCR
        </h2>
        <p className="text-neutral-600 max-w-2xl mx-auto">
          Converta seus documentos PDF para o formato PDF/A 2u com reconhecimento ótico de caracteres (OCR) de forma rápida e segura.
        </p>
      </div>

      {/* Conversion Steps */}
      <ConversionSteps />

      {/* File Upload Area - always visible when not in progress or completed state */}
      {conversionState === 'idle' && (
        <FileUploadArea onFilesSelected={addFiles} />
      )}

      {/* Files List */}
      {showFilesArea && (
        <FilesList 
          files={files} 
          onRemoveFile={removeFile} 
          onClearAll={clearFiles} 
        />
      )}

      {/* Conversion Options */}
      {showFilesArea && (
        <ConversionOptions 
          applyOcr={conversionOptions.applyOcr}
          verifyCompliance={conversionOptions.verifyCompliance}
          optimizeSize={conversionOptions.optimizeSize}
          onOptionChange={handleOptionChange}
        />
      )}

      {/* Action Buttons */}
      {showActionButtons && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            variant="outline"
            onClick={clearFiles}
            className="px-5 py-3 bg-neutral-200 text-neutral-700 hover:bg-neutral-300 font-medium"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => convertFiles()}
            disabled={isConverting || files.length === 0}
            className="px-5 py-3 font-medium"
          >
            <ArrowRight className="h-4 w-4 mr-1" />
            Iniciar conversão
          </Button>
        </div>
      )}

      {/* Conversion Progress */}
      {showProgress && (
        <ConversionProgress 
          progress={conversionProgress}
          processingFiles={processingFiles}
          totalFiles={files.length}
          onCancel={cancelConversion}
        />
      )}

      {/* Conversion Results */}
      {showResults && (
        <ConversionResults 
          files={convertedFiles}
          onDownloadFile={downloadFile}
          onDownloadAll={downloadAllFiles}
          onStartNew={resetConversion}
        />
      )}
    </div>
  );
}
