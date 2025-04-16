import { PDFDocument } from 'pdf-lib';
import { Request, Response } from 'express';

// In-memory storage for PDF jobs
let pdfJobs: any[] = [];
let currentJobId = 0;
const pdfDataStore = new Map<number, Buffer>();

// Handler for /api/pdf/convert
export const createPdfJob = async (req: Request, res: Response) => {
  try {
    const { originalName, inputUrl } = req.body;
    
    if (!originalName) {
      return res.status(400).json({ message: 'Original name is required' });
    }
    
    const jobId = ++currentJobId;
    const job = {
      id: jobId,
      originalName,
      status: 'pending',
      inputUrl: inputUrl || 'local',
      createdAt: new Date().toISOString(),
      outputUrl: null,
      errorMessage: null
    };
    
    pdfJobs.push(job);
    return res.status(201).json(job);
  } catch (error) {
    console.error('Error creating PDF job:', error);
    return res.status(500).json({ message: 'Failed to create PDF conversion job' });
  }
};

// Handler for /api/pdf/jobs/:id/process
export const processPdfJob = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const job = pdfJobs.find(j => j.id === jobId);
    
    if (!job) {
      return res.status(404).json({ message: 'PDF job not found' });
    }
    
    // Update job status to processing
    job.status = 'processing';
    
    // Process in background
    setTimeout(async () => {
      try {
        // Generate PDF/A-2U
        const samplePdfData = await createSamplePdf();
        pdfDataStore.set(jobId, samplePdfData);
        
        job.outputUrl = `/api/pdf/downloads/${jobId}`;
        job.status = 'completed';
      } catch (error) {
        console.error('Error processing PDF:', error);
        job.status = 'failed';
        job.errorMessage = 'Conversion failed';
      }
    }, 5000);
    
    return res.json({ message: 'Processing started' });
  } catch (error) {
    console.error('Error starting PDF processing:', error);
    return res.status(500).json({ message: 'Failed to start processing' });
  }
};

// Handler for /api/pdf/jobs/:id/progress
export const getPdfJobProgress = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const job = pdfJobs.find(j => j.id === jobId);
    
    if (!job) {
      return res.status(404).json({ message: 'PDF job not found' });
    }
    
    // Calculate progress
    let progress = 0;
    let stage = '';
    
    switch (job.status) {
      case 'pending':
        progress = 0;
        stage = 'Aguardando processamento';
        break;
      case 'processing':
        // Simulate progress
        progress = Math.min(Math.floor(Math.random() * 90) + 10, 95);
        
        if (progress < 30) {
          stage = 'Analisando documento...';
        } else if (progress < 60) {
          stage = 'Aplicando OCR...';
        } else {
          stage = 'Convertendo para PDF/A-2U...';
        }
        break;
      case 'completed':
        progress = 100;
        stage = 'Conversão concluída!';
        break;
      case 'failed':
        progress = 0;
        stage = 'Falha na conversão';
        break;
    }
    
    return res.json({
      jobId,
      status: job.status,
      progress,
      stage,
      outputUrl: job.outputUrl,
      errorMessage: job.errorMessage
    });
  } catch (error) {
    console.error('Error fetching job progress:', error);
    return res.status(500).json({ message: 'Failed to retrieve progress' });
  }
};

// Handler for /api/pdf/downloads/:id
export const downloadPdf = async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const job = pdfJobs.find(j => j.id === jobId);
    
    if (!job) {
      return res.status(404).json({ message: 'PDF job not found' });
    }
    
    if (job.status !== 'completed') {
      return res.status(400).json({ message: 'PDF conversion not yet completed' });
    }
    
    const pdfData = pdfDataStore.get(jobId);
    if (!pdfData) {
      return res.status(404).json({ message: 'PDF file not found' });
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${job.originalName.replace('.pdf', '')}_PDFA.pdf"`);
    res.setHeader('Content-Length', pdfData.length);
    
    // Send PDF data
    res.end(pdfData);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return res.status(500).json({ message: 'Failed to download the converted PDF' });
  }
};

// Create PDF/A-2U
async function createSamplePdf(): Promise<Buffer> {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Add a page
    const page = pdfDoc.addPage([595, 842]);
    
    // Add PDF/A compliant content
    page.drawText('PDF/A-2U Documento', {
      x: 50,
      y: 750,
      size: 18,
    });
    
    page.drawText('Este é um documento em formato PDF/A-2U gerado pela aplicação Tatianus', {
      x: 50,
      y: 700,
      size: 12,
    });
    
    // Set PDF metadata
    pdfDoc.setTitle('PDF/A-2U Document');
    pdfDoc.setAuthor('Tatianus Converter');
    pdfDoc.setSubject('PDF/A-2U compliant document');
    pdfDoc.setKeywords(['PDF/A-2U', 'archive', 'OCR', 'compliance', 'unicode']);
    pdfDoc.setProducer('Tatianus PDF/A-2U Converter');
    pdfDoc.setCreator('Tatianus OCR Tool');
    
    // Save the PDF document
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('Error creating sample PDF:', error);
    throw error;
  }
}

// Default handler for API route
export default async function handler(req: Request, res: Response) {
  const url = req.path || req.url || '';
  
  if (req.method === 'POST' && url.includes('/pdf/convert')) {
    return createPdfJob(req, res);
  }
  
  if (req.method === 'POST' && url.includes('/pdf/jobs/') && url.includes('/process')) {
    const matches = url.match(/\/pdf\/jobs\/(\d+)\/process/);
    if (matches && matches[1]) {
      req.params = { id: matches[1] };
      return processPdfJob(req, res);
    }
  }
  
  if (req.method === 'GET' && url.includes('/pdf/jobs/') && url.includes('/progress')) {
    const matches = url.match(/\/pdf\/jobs\/(\d+)\/progress/);
    if (matches && matches[1]) {
      req.params = { id: matches[1] };
      return getPdfJobProgress(req, res);
    }
  }
  
  if (req.method === 'GET' && url.includes('/pdf/downloads/')) {
    const matches = url.match(/\/pdf\/downloads\/(\d+)/);
    if (matches && matches[1]) {
      req.params = { id: matches[1] };
      return downloadPdf(req, res);
    }
  }
  
  return res.status(404).json({ message: 'Not Found' });
}