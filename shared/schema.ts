import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// PDF conversion job schema
export const pdfJobs = pgTable("pdf_jobs", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  options: jsonb("options").notNull(),
});

// PDF files schema
export const pdfFiles = pgTable("pdf_files", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => pdfJobs.id),
  originalName: text("original_name").notNull(),
  originalSize: integer("original_size").notNull(),
  convertedName: text("converted_name"),
  convertedSize: integer("converted_size"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  error: text("error"),
  isPdfA: boolean("is_pdfa").default(false),
  hasOcr: boolean("has_ocr").default(false),
  progress: integer("progress").default(0),
  storagePath: text("storage_path"),
  downloadUrl: text("download_url"),
});

// Conversion options schema
export const conversionOptionsSchema = z.object({
  applyOcr: z.boolean().default(true),
  verifyCompliance: z.boolean().default(true),
  optimizeSize: z.boolean().default(false),
});

// Insert schemas
export const insertPdfJobSchema = createInsertSchema(pdfJobs).omit({ 
  id: true, 
  createdAt: true, 
  completedAt: true 
});

export const insertPdfFileSchema = createInsertSchema(pdfFiles).omit({ 
  id: true 
});

// Types
export type ConversionOptions = z.infer<typeof conversionOptionsSchema>;
export type PdfJob = typeof pdfJobs.$inferSelect;
export type InsertPdfJob = z.infer<typeof insertPdfJobSchema>;
export type PdfFile = typeof pdfFiles.$inferSelect;
export type InsertPdfFile = z.infer<typeof insertPdfFileSchema>;
