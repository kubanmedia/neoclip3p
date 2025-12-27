import { VercelRequest, VercelResponse } from '@vercel/node';
import { createVideoJob } from '../../src/services/asyncVideoService';
import { UserTier } from '../../src/types';

interface CreateVideoRequest {
  prompt: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  duration: number;
  provider: 'fal' | 'piapi' | 'image';
  tier: UserTier;
  userId: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, aspectRatio, duration, provider, tier, userId }: CreateVideoRequest = req.body;

    // Validate required fields
    if (!prompt || !aspectRatio || !provider || !tier || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['prompt', 'aspectRatio', 'duration', 'provider', 'tier', 'userId']
      });
    }

    // Tier-based validation
    if (tier === 'free') {
      // Free tier: Use image sequence only, no real video generation
      const jobId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // Store job data for image sequence
      const jobData = {
        id: jobId,
        provider: 'image',
        status: 'queued',
        createdAt: new Date().toISOString(),
        isImageSequence: true,
        prompt,
        aspectRatio,
        duration: Math.min(duration, 10)
      };
      
      localStorage.setItem(`video_job_${jobId}`, JSON.stringify(jobData));

      return res.status(200).json({
        success: true,
        jobId: jobId,
        status: 'queued',
        message: 'Image preview queued for generation',
        tier: 'free',
        isImageSequence: true
      });
    }

    // Paid tiers (basic/pro): Allow real video generation
    if (provider === 'fal' && (tier === 'basic' || tier === 'pro')) {
      const result = await createVideoJob({
        prompt,
        aspectRatio,
        duration: Math.min(duration, tier === 'pro' ? 30 : 15), // Max duration based on tier
        provider: 'fal',
        tier,
        userId
      });

      return res.status(200).json({
        success: true,
        jobId: result.jobId,
        status: 'queued',
        message: 'Video generation queued',
        tier,
        isImageSequence: false
      });
    }

    // PiAPI for paid tiers
    if (provider === 'piapi' && (tier === 'basic' || tier === 'pro')) {
      const result = await createVideoJob({
        prompt,
        aspectRatio,
        duration: Math.min(duration, tier === 'pro' ? 30 : 15),
        provider: 'piapi',
        tier,
        userId
      });

      return res.status(200).json({
        success: true,
        jobId: result.jobId,
        status: 'queued',
        message: 'Video generation queued via PiAPI',
        tier,
        isImageSequence: false
      });
    }

    // Fallback to image sequence for any other case
    const result = await createVideoJob({
      prompt,
      aspectRatio,
      duration: Math.min(duration, 10),
      provider: 'image',
      tier,
      userId
    });

    return res.status(200).json({
      success: true,
      jobId: result.jobId,
      status: 'queued',
      message: 'Image preview queued (fallback)',
      tier,
      isImageSequence: true
    });

  } catch (error) {
    console.error('Error creating video job:', error);
    return res.status(500).json({
      error: 'Failed to create video job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}