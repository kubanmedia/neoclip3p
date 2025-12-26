import { VercelRequest, VercelResponse } from '@vercel/node';
import { getVideoJobStatus } from '../../src/services/asyncVideoService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ 
        error: 'Missing jobId parameter',
        example: '/api/video/status?jobId=fal_abc123'
      });
    }

    const status = await getVideoJobStatus(jobId);

    if (!status) {
      return res.status(404).json({ 
        error: 'Job not found',
        jobId 
      });
    }

    return res.status(200).json({
      success: true,
      jobId,
      status: status.status,
      progress: status.progress,
      videoUrl: status.videoUrl,
      thumbnailUrl: status.thumbnailUrl,
      duration: status.duration,
      error: status.error,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt
    });

  } catch (error) {
    console.error('Error checking video status:', error);
    return res.status(500).json({
      error: 'Failed to check video status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}