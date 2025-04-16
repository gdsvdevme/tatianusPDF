import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the PDF conversion job schema
export const pdfJobs = pgTable("pdf_jobs", {
  id: serial("id").primaryKey(),
  originalName: text("original_name").notNull(),
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'failed'
  inputUrl: text("input_url").notNull(),
  outputUrl: text("output_url"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
});

// Create insert schema for PDF jobs
export const insertPdfJobSchema = createInsertSchema(pdfJobs).pick({
  originalName: true,
  status: true,
  inputUrl: true,
});

export type InsertPdfJob = z.infer<typeof insertPdfJobSchema>;
export type PdfJob = typeof pdfJobs.$inferSelect;

// Conversion options schema
export const conversionOptionsSchema = z.object({
  applyOcr: z.boolean().default(true),
  formatType: z.enum(['pdf_a_2u']).default('pdf_a_2u'),
});

export type ConversionOptions = z.infer<typeof conversionOptionsSchema>;
