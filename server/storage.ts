import { pdfJobs, type PdfJob, type InsertPdfJob } from "@shared/schema";

export interface IStorage {
  createPdfJob(job: InsertPdfJob): Promise<PdfJob>;
  getPdfJob(id: number): Promise<PdfJob | undefined>;
  updatePdfJobStatus(id: number, status: string): Promise<PdfJob | undefined>;
  updatePdfJobOutput(id: number, outputUrl: string): Promise<PdfJob | undefined>;
  updatePdfJobError(id: number, errorMessage: string): Promise<PdfJob | undefined>;
}

export class MemStorage implements IStorage {
  private pdfJobs: Map<number, PdfJob>;
  currentId: number;

  constructor() {
    this.pdfJobs = new Map();
    this.currentId = 1;
  }

  async createPdfJob(insertJob: InsertPdfJob): Promise<PdfJob> {
    const id = this.currentId++;
    const createdAt = new Date().toISOString();
    const job: PdfJob = { ...insertJob, id, createdAt, outputUrl: null, errorMessage: null };
    this.pdfJobs.set(id, job);
    return job;
  }

  async getPdfJob(id: number): Promise<PdfJob | undefined> {
    return this.pdfJobs.get(id);
  }

  async updatePdfJobStatus(id: number, status: string): Promise<PdfJob | undefined> {
    const job = this.pdfJobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, status };
    this.pdfJobs.set(id, updatedJob);
    return updatedJob;
  }

  async updatePdfJobOutput(id: number, outputUrl: string): Promise<PdfJob | undefined> {
    const job = this.pdfJobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, outputUrl, status: 'completed' };
    this.pdfJobs.set(id, updatedJob);
    return updatedJob;
  }

  async updatePdfJobError(id: number, errorMessage: string): Promise<PdfJob | undefined> {
    const job = this.pdfJobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, errorMessage, status: 'failed' };
    this.pdfJobs.set(id, updatedJob);
    return updatedJob;
  }
}

export const storage = new MemStorage();
