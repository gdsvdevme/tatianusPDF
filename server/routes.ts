import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import { conversionOptionsSchema } from "@shared/schema";
import { processFile, cleanupJob } from "./pdf-processor";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Set up temporary upload directory
const uploadDir = path.join(process.cwd(), "tmp/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up file storage for converted files
const outputDir = path.join(process.cwd(), "tmp/converted");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueFilename = `${randomUUID()}-${file.originalname}`;
      cb(null, uniqueFilename);
    }
  }),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(new Error('Apenas arquivos PDF são permitidos'));
      return;
    }
    cb(null, true);
  }
});

// Active jobs for tracking purposes
const activeJobs = new Map();

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint to upload PDFs for conversion
  app.post('/api/pdf/upload', upload.array('files'), async (req: Request, res: Response) => {
    try {
      console.log('Upload recebido:', { 
        files: req.files, 
        body: req.body,
        headers: req.headers
      });
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
      }

      const files = Array.isArray(req.files) ? req.files : [req.files];
      console.log(`Processando ${files.length} arquivos:`, files.map(f => ({ name: f.originalname, size: f.size })));
      
      const optionsRaw = req.body.options;
      console.log('Opções recebidas:', optionsRaw);
      
      let options;
      try {
        options = conversionOptionsSchema.parse(
          typeof optionsRaw === 'string' ? JSON.parse(optionsRaw) : optionsRaw
        );
        console.log('Opções parseadas:', options);
      } catch (error) {
        console.error('Erro ao parsear opções:', error);
        return res.status(400).json({ error: 'Opções de conversão inválidas' });
      }

      // Create a new job
      const job = await storage.createPdfJob({
        status: 'pending',
        options,
      });

      // Add files to the job
      const jobFiles = [];
      for (const file of files) {
        const pdfFile = await storage.createPdfFile({
          jobId: job.id,
          originalName: file.originalname,
          originalSize: file.size,
          status: 'pending',
          storagePath: file.path,
        });
        jobFiles.push(pdfFile);
      }

      // Start processing files asynchronously
      processJob(job.id, jobFiles);

      // Add job to active jobs
      activeJobs.set(job.id, {
        id: job.id,
        files: jobFiles.map(file => ({
          id: file.id,
          originalName: file.originalName,
          status: file.status,
          progress: 0,
        })),
        status: 'processing',
      });

      return res.status(200).json({ 
        jobId: job.id,
        message: 'Arquivos enviados com sucesso. Processamento iniciado.' 
      });
    } catch (error) {
      console.error('Erro ao processar upload:', error);
      return res.status(500).json({ error: 'Erro ao processar arquivos' });
    }
  });

  // API endpoint to check conversion status
  app.get('/api/pdf/status/:jobId', async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId);
      
      if (isNaN(jobId)) {
        return res.status(400).json({ error: 'ID de trabalho inválido' });
      }

      const job = await storage.getPdfJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: 'Trabalho não encontrado' });
      }

      const files = await storage.getPdfFilesByJobId(jobId);
      
      return res.status(200).json({
        jobId: job.id,
        status: job.status,
        files: files.map(file => ({
          fileId: file.id,
          name: file.originalName,
          status: file.status,
          percentage: file.progress || 0,
          error: file.error,
        })),
      });
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return res.status(500).json({ error: 'Erro ao verificar status da conversão' });
    }
  });

  // API endpoint to get conversion results
  app.get('/api/pdf/results/:jobId', async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId);
      
      if (isNaN(jobId)) {
        return res.status(400).json({ error: 'ID de trabalho inválido' });
      }

      const job = await storage.getPdfJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: 'Trabalho não encontrado' });
      }

      if (job.status !== 'completed') {
        return res.status(400).json({ error: 'Conversão ainda não foi concluída' });
      }

      const files = await storage.getPdfFilesByJobId(jobId);
      
      return res.status(200).json({
        jobId: job.id,
        status: job.status,
        files: files.map(file => ({
          id: file.id,
          name: file.convertedName || file.originalName,
          size: file.convertedSize || file.originalSize,
          url: file.downloadUrl || '',
          hasPdfA: file.isPdfA,
          hasOcr: file.hasOcr,
        })),
      });
    } catch (error) {
      console.error('Erro ao obter resultados:', error);
      return res.status(500).json({ error: 'Erro ao obter resultados da conversão' });
    }
  });

  // API endpoint to download a converted file
  app.get('/api/pdf/download/:fileId', async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.fileId);
      
      if (isNaN(fileId)) {
        return res.status(400).json({ error: 'ID de arquivo inválido' });
      }

      const file = await storage.getPdfFile(fileId);
      
      if (!file) {
        return res.status(404).json({ error: 'Arquivo não encontrado' });
      }

      if (file.status !== 'completed' || !file.storagePath) {
        return res.status(400).json({ error: 'Arquivo não está disponível para download' });
      }

      res.download(file.storagePath, file.convertedName || file.originalName);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      return res.status(500).json({ error: 'Erro ao baixar arquivo' });
    }
  });

  // API endpoint to cancel a conversion job
  app.post('/api/pdf/cancel', async (req: Request, res: Response) => {
    try {
      const jobId = req.body.jobId;
      
      if (!jobId) {
        return res.status(400).json({ error: 'ID de trabalho não especificado' });
      }

      const job = await storage.getPdfJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: 'Trabalho não encontrado' });
      }

      if (job.status === 'completed' || job.status === 'failed') {
        return res.status(400).json({ error: 'Trabalho já foi concluído ou falhou' });
      }

      // Update job status
      await storage.updatePdfJob(jobId, { status: 'failed' });
      
      // Update all pending files
      const files = await storage.getPdfFilesByJobId(jobId);
      for (const file of files) {
        if (file.status === 'pending' || file.status === 'processing') {
          await storage.updatePdfFile(file.id, { 
            status: 'failed', 
            error: 'Trabalho cancelado pelo usuário'
          });
        }
      }

      // Remove job from active jobs
      activeJobs.delete(jobId);

      // Clean up files
      cleanupJob(jobId);

      return res.status(200).json({ message: 'Trabalho cancelado com sucesso' });
    } catch (error) {
      console.error('Erro ao cancelar trabalho:', error);
      return res.status(500).json({ error: 'Erro ao cancelar trabalho' });
    }
  });

  // Serve uploaded files 
  app.use('/files', express.static(outputDir));

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to process files in a job
async function processJob(jobId: number, files: any[]) {
  try {
    // Update job status
    await storage.updatePdfJob(jobId, { status: 'processing' });
    
    // Process files sequentially
    for (const [index, file] of files.entries()) {
      // Update file status
      await storage.updatePdfFile(file.id, { status: 'processing' });
      
      try {
        // Get job info to get conversion options
        const job = await storage.getPdfJob(jobId);
        
        if (!job) {
          throw new Error('Job not found');
        }
        
        // Process the file
        const result = await processFile(
          file.storagePath, 
          file.originalName, 
          outputDir, 
          job.options,
          async (progress) => {
            // Update progress
            await storage.updatePdfFile(file.id, { progress });
            
            // Update active job status
            const activeJob = activeJobs.get(jobId);
            if (activeJob) {
              const fileIndex = activeJob.files.findIndex((f: any) => f.id === file.id);
              if (fileIndex >= 0) {
                activeJob.files[fileIndex].progress = progress;
              }
            }
          }
        );
        
        // Update file record with results
        await storage.updatePdfFile(file.id, {
          status: 'completed',
          convertedName: result.convertedName,
          convertedSize: result.convertedSize,
          isPdfA: result.isPdfA,
          hasOcr: result.hasOcr,
          progress: 100,
          storagePath: result.outputPath,
          downloadUrl: `/files/${path.basename(result.outputPath)}`,
        });
      } catch (error) {
        console.error(`Error processing file ${file.id}:`, error);
        
        // Update file status on error
        await storage.updatePdfFile(file.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error during processing',
        });
      }
    }
    
    // Check if all files have been processed
    const updatedFiles = await storage.getPdfFilesByJobId(jobId);
    const allCompleted = updatedFiles.every(file => 
      file.status === 'completed' || file.status === 'failed'
    );
    
    if (allCompleted) {
      // Update job status
      await storage.updatePdfJob(jobId, { 
        status: 'completed',
        completedAt: new Date(),
      });
      
      // Remove job from active jobs after a delay to allow clients to get final status
      setTimeout(() => {
        activeJobs.delete(jobId);
      }, 5 * 60 * 1000); // 5 minutes
    }
  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);
    
    // Update job status on error
    await storage.updatePdfJob(jobId, { status: 'failed' });
  }
}
