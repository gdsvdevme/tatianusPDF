import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPdfJobSchema, conversionOptionsSchema } from "@shared/schema";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
import { log } from "./vite";

// Import Vercel API handler for compatibility
import apiHandler from "../api/index";

// Map to store PDF data for download
const pdfDataStore = new Map<number, Buffer>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a PDF conversion job
  app.post("/api/pdf/convert", async (req, res) => {
    try {
      // Validate the request body
      const validatedData = insertPdfJobSchema.parse({
        originalName: req.body.originalName,
        status: 'pending',
        inputUrl: req.body.inputUrl,
      });

      // Create the PDF job
      const job = await storage.createPdfJob(validatedData);
      
      // Return the job details
      res.status(201).json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input data", details: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create PDF conversion job" });
      }
    }
  });

  // Get the status of a PDF conversion job
  app.get("/api/pdf/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }

      const job = await storage.getPdfJob(id);
      if (!job) {
        return res.status(404).json({ message: "PDF job not found" });
      }

      res.json(job);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve PDF job status" });
    }
  });

  // Simulate PDF conversion progress (for demo purposes)
  // In a real application, this would be handled by background jobs
  app.post("/api/pdf/jobs/:id/process", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }

      // Validate options
      const options = conversionOptionsSchema.parse(req.body.options || {});

      // Get the job
      const job = await storage.getPdfJob(id);
      if (!job) {
        return res.status(404).json({ message: "PDF job not found" });
      }

      // Update job status to processing
      await storage.updatePdfJobStatus(id, 'processing');

      // In a real app, this would be a background process
      // Here we're simulating the conversion process with setTimeout
      setTimeout(async () => {
        try {
          // Simulate successful conversion by creating a sample PDF
          // In a real app, this would be the actual converted file
          const samplePdfData = createSamplePdf();
          pdfDataStore.set(id, samplePdfData);
          
          const outputUrl = `/api/pdf/downloads/${id}`;
          await storage.updatePdfJobOutput(id, outputUrl);
        } catch (error) {
          log(`Error in conversion process: ${error}`, 'conversion');
          // Handle error
          await storage.updatePdfJobError(id, "Conversion failed");
        }
      }, 5000);

      res.json({ message: "Processing started" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid conversion options", details: error.errors });
      } else {
        res.status(500).json({ message: "Failed to start processing" });
      }
    }
  });

  // Route for checking conversion progress
  app.get("/api/pdf/jobs/:id/progress", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }

      const job = await storage.getPdfJob(id);
      if (!job) {
        return res.status(404).json({ message: "PDF job not found" });
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
          // In a real app, you would have more granular progress tracking
          // Here we're just simulating random progress
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
        jobId: job.id,
        status: job.status,
        progress,
        stage,
        outputUrl: job.outputUrl,
        errorMessage: job.errorMessage
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve progress" });
    }
  });

  // Route for downloading the converted PDF
  app.get("/api/pdf/downloads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }

      const job = await storage.getPdfJob(id);
      if (!job) {
        return res.status(404).json({ message: "PDF job not found" });
      }

      if (job.status !== 'completed') {
        return res.status(400).json({ message: "PDF conversion not yet completed" });
      }

      // Get the PDF data from our storage
      const pdfData = pdfDataStore.get(id);
      if (!pdfData) {
        return res.status(404).json({ message: "PDF file not found" });
      }

      // Set the appropriate headers for a PDF file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${job.originalName.replace('.pdf', '')}_PDFA.pdf"`);
      res.setHeader('Content-Length', pdfData.length);

      // Send the PDF data
      res.send(pdfData);
    } catch (error) {
      log(`Error in download handler: ${error}`, 'download');
      res.status(500).json({ message: "Failed to download the converted PDF" });
    }
  });

  // Vercel compatibility route - this will handle all requests that come from Vercel
  app.all("/api/vercel/:path*", (req, res) => {
    // Forward to the Vercel API handler
    return apiHandler(req, res);
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to create a sample PDF/A-2U file for demonstration purposes
function createSamplePdf(): Buffer {
  // This is a PDF/A-2U compliant structure
  // In a real app, this would be replaced with actual conversion output
  const pdfContent = `%PDF-1.7
%¥±ë
1 0 obj
<< /Type /Catalog /Pages 2 0 R /Metadata 8 0 R /OutputIntents [9 0 R] >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 6 0 R /Resources 4 0 R >>
endobj
4 0 obj
<< /Font << /F1 5 0 R >> >>
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>
endobj
6 0 obj
<< /Length 158 >>
stream
BT
/F1 18 Tf
50 750 Td
(PDF/A-2U Documento) Tj
/F1 12 Tf
0 -50 Td
(Este é um documento em formato PDF/A-2U gerado pela aplicação Tatianus) Tj
ET
endstream
endobj
8 0 obj
<< /Type /Metadata /Subtype /XML /Length 1024 >>
stream
<?xpacket begin='﻿' id='W5M0MpCehiHzreSzNTczkc9d'?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/" rdf:about="">
      <dc:format>application/pdf</dc:format>
      <dc:title>PDF/A-2U Document</dc:title>
      <dc:creator>Tatianus Converter</dc:creator>
      <dc:description>PDF/A-2U document with OCR capabilities</dc:description>
    </rdf:Description>
    <rdf:Description xmlns:pdf="http://ns.adobe.com/pdf/1.3/" rdf:about="">
      <pdf:Producer>Tatianus PDF/A-2U Converter</pdf:Producer>
    </rdf:Description>
    <rdf:Description xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/" rdf:about="">
      <pdfaid:part>2</pdfaid:part>
      <pdfaid:conformance>U</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description xmlns:xmp="http://ns.adobe.com/xap/1.0/" rdf:about="">
      <xmp:CreateDate>2025-04-16T12:00:00Z</xmp:CreateDate>
      <xmp:ModifyDate>2025-04-16T12:00:00Z</xmp:ModifyDate>
      <xmp:MetadataDate>2025-04-16T12:00:00Z</xmp:MetadataDate>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end='w'?>
endstream
endobj
9 0 obj
<< /Type /OutputIntent /S /GTS_PDFA1 /OutputConditionIdentifier (sRGB) /Info (sRGB IEC61966-2.1) /DestOutputProfile 10 0 R >>
endobj
10 0 obj
<< /Length 3024 /N 3 /Filter /ASCIIHexDecode >>
stream
73524742494543363139363600000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000000000000000000000000006C0
00000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000
00000000000000000000000000000000000000000000000000000000000000000000000000
endstream
endobj
xref
0 11
0000000000 65535 f 
0000000015 00000 n 
0000000099 00000 n 
0000000155 00000 n 
0000000254 00000 n 
0000000297 00000 n 
0000000390 00000 n 
0000000000 00000 f
0000000599 00000 n 
0000001707 00000 n 
0000001842 00000 n 
trailer
<< /Size 11 /Root 1 0 R /ID [<7366387A287D54F8813AAEDC875FE1FA> <7366387A287D54F8813AAEDC875FE1FA>] >>
startxref
4950
%%EOF`;

  return Buffer.from(pdfContent);
}
