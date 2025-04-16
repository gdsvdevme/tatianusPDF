// Serverless function for Netlify
const express = require('express');
const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const cors = require('cors');
const { PDFDocument } = require('pdf-lib');

// Create express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// In-memory storage for PDF jobs
let pdfJobs = [];
let currentJobId = 0;
const pdfDataStore = new Map();

// Create PDF job
app.post('/api/pdf/convert', (req, res) => {
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
    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating PDF job:', error);
    res.status(500).json({ message: 'Failed to create PDF conversion job' });
  }
});

// Process PDF job
app.post('/api/pdf/jobs/:id/process', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const job = pdfJobs.find(j => j.id === jobId);
    
    if (!job) {
      return res.status(404).json({ message: 'PDF job not found' });
    }
    
    // Update job status to processing
    job.status = 'processing';
    
    // Simulate processing in background (would be a background job in production)
    setTimeout(async () => {
      try {
        // Simulate PDF/A-2U conversion
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
    
    res.json({ message: 'Processing started' });
  } catch (error) {
    console.error('Error starting PDF processing:', error);
    res.status(500).json({ message: 'Failed to start processing' });
  }
});

// Get job progress
app.get('/api/pdf/jobs/:id/progress', (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const job = pdfJobs.find(j => j.id === jobId);
    
    if (!job) {
      return res.status(404).json({ message: 'PDF job not found' });
    }
    
    // Calculate progress based on status
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
    
    res.json({
      jobId,
      status: job.status,
      progress,
      stage,
      outputUrl: job.outputUrl,
      errorMessage: job.errorMessage
    });
  } catch (error) {
    console.error('Error fetching job progress:', error);
    res.status(500).json({ message: 'Failed to retrieve progress' });
  }
});

// Download converted PDF
app.get('/api/pdf/downloads/:id', (req, res) => {
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
    res.status(500).json({ message: 'Failed to download the converted PDF' });
  }
});

// Helper function to create sample PDF/A-2U
async function createSamplePdf() {
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

// Create serverless handler
const handler = serverless(app);
module.exports.handler = async (event, context) => {
  return await handler(event, context);
};