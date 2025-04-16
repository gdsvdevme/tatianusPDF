import { pdfJobs, pdfFiles, type PdfJob, type PdfFile, type InsertPdfJob, type InsertPdfFile } from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  getPdfJob(id: number): Promise<PdfJob | undefined>;
  createPdfJob(job: InsertPdfJob): Promise<PdfJob>;
  updatePdfJob(id: number, updates: Partial<PdfJob>): Promise<PdfJob>;
  getPdfFile(id: number): Promise<PdfFile | undefined>;
  createPdfFile(file: InsertPdfFile): Promise<PdfFile>;
  updatePdfFile(id: number, updates: Partial<PdfFile>): Promise<PdfFile>;
  getPdfFilesByJobId(jobId: number): Promise<PdfFile[]>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private jobs: Map<number, PdfJob>;
  private files: Map<number, PdfFile>;
  private jobCurrentId: number;
  private fileCurrentId: number;

  constructor() {
    this.jobs = new Map();
    this.files = new Map();
    this.jobCurrentId = 1;
    this.fileCurrentId = 1;
  }

  async getPdfJob(id: number): Promise<PdfJob | undefined> {
    return this.jobs.get(id);
  }

  async createPdfJob(job: InsertPdfJob): Promise<PdfJob> {
    const id = this.jobCurrentId++;
    const createdAt = new Date();
    const newJob: PdfJob = { 
      ...job, 
      id, 
      createdAt,
      completedAt: null,
    };
    this.jobs.set(id, newJob);
    return newJob;
  }

  async updatePdfJob(id: number, updates: Partial<PdfJob>): Promise<PdfJob> {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job with id ${id} not found`);
    }
    
    const updatedJob: PdfJob = { ...job, ...updates };
    this.jobs.set(id, updatedJob);
    
    return updatedJob;
  }

  async getPdfFile(id: number): Promise<PdfFile | undefined> {
    return this.files.get(id);
  }

  async createPdfFile(file: InsertPdfFile): Promise<PdfFile> {
    const id = this.fileCurrentId++;
    const newFile: PdfFile = { 
      ...file, 
      id,
      convertedName: null,
      convertedSize: null,
      error: null,
      isPdfA: false,
      hasOcr: false,
      progress: 0,
      downloadUrl: null,
    };
    this.files.set(id, newFile);
    return newFile;
  }

  async updatePdfFile(id: number, updates: Partial<PdfFile>): Promise<PdfFile> {
    const file = this.files.get(id);
    if (!file) {
      throw new Error(`File with id ${id} not found`);
    }
    
    const updatedFile: PdfFile = { ...file, ...updates };
    this.files.set(id, updatedFile);
    
    return updatedFile;
  }

  async getPdfFilesByJobId(jobId: number): Promise<PdfFile[]> {
    return Array.from(this.files.values())
      .filter(file => file.jobId === jobId);
  }
}

// Export storage instance
export const storage = new MemStorage();
