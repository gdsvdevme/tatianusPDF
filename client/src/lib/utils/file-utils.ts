/**
 * Format file size to human readable format
 * @param bytes File size in bytes
 * @returns Formatted string (e.g., "2.4 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Generate a unique filename for PDF/A output
 * @param originalFilename The original filename
 * @returns Modified filename with PDF/A suffix
 */
export function generatePdfaFilename(originalFilename: string): string {
  const baseName = originalFilename.replace(/\.pdf$/i, '');
  return `${baseName}_PDFA2u.pdf`;
}

/**
 * Check if file is a PDF
 * @param file File to check
 * @returns Boolean indicating if file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
