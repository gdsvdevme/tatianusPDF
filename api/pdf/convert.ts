import { Request, Response } from 'express';
import { createPdfJob } from '../index';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  return createPdfJob(req, res);
}