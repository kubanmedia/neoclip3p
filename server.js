import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory rate limiting (in production, use Redis or similar)
const userRateLimits = new Map();
const MAX_REQUESTS_PER_MINUTE = 10;
const MAX_CONCURRENT_JOBS = 3;

// Rate limiting middleware
function rateLimitMiddleware(req, res, next) {
  const userId = req.body.userId || req.query.userId || req.headers['x-user-id'];
  
  if (!userId && req.method !== 'GET') {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  if (!userId) {
    return next(); // Allow GET requests without user ID
  }
  
  const now = Date.now();
  const userLimit = userRateLimits.get(userId);
  
  if (userLimit) {
    // Clean up old requests (older than 1 minute)
    const validRequests = userLimit.requests.filter(time => now - time < 60000);
    
    if (validRequests.length >= MAX_REQUESTS_PER_MINUTE) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: `Maximum ${MAX_REQUESTS_PER_MINUTE} requests per minute allowed`
      });
    }
    
    userLimit.requests = [...validRequests, now];
  } else {
    userRateLimits.set(userId, {
      requests: [now],
      activeJobs: 0
    });
  }
  
  next();
}

// Job limit middleware
function jobLimitMiddleware(req, res, next) {
  const userId = req.body.userId;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  const userLimit = userRateLimits.get(userId);
  
  if (userLimit && userLimit.activeJobs >= MAX_CONCURRENT_JOBS) {
    return res.status(429).json({ 
      error: 'Too many concurrent jobs',
      message: `Maximum ${MAX_CONCURRENT_JOBS} concurrent jobs allowed`
    });
  }
  
  next();
}

// Serve static files from dist
app.use(express.static(join(__dirname, 'dist')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.post('/api/video/create', rateLimitMiddleware, jobLimitMiddleware, (req, res) => {
  const { prompt, aspectRatio, duration, provider, tier, userId } = req.body;

  // Validate required fields
  if (!prompt || !aspectRatio || !provider || !tier || !userId) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['prompt', 'aspectRatio', 'duration', 'provider', 'tier', 'userId']
    });
  }

  // Validate tier
  const validTiers = ['free', 'basic', 'pro'];
  if (!validTiers.includes(tier)) {
    return res.status(400).json({ 
      error: 'Invalid tier',
      validTiers
    });
  }

  // Validate aspect ratio
  const validRatios = ['9:16', '16:9', '1:1'];
  if (!validRatios.includes(aspectRatio)) {
    return res.status(400).json({ 
      error: 'Invalid aspect ratio',
      validRatios
    });
  }

  // Validate duration
  const maxDuration = tier === 'free' ? 10 : tier === 'basic' ? 15 : 30;
  if (duration < 3 || duration > maxDuration) {
    return res.status(400).json({ 
      error: 'Invalid duration',
      min: 3,
      max: maxDuration,
      tier
    });
  }

  try {
    // Generate job ID
    const jobId = tier === 'free' ? `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}` : `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Increment active jobs
    const userLimit = userRateLimits.get(userId);
    if (userLimit) {
      userLimit.activeJobs++;
    }

    // Store job metadata
    const jobData = {
      id: jobId,
      userId,
      prompt: prompt.trim(),
      aspectRatio,
      duration: Math.min(duration, maxDuration),
      tier,
      provider: tier === 'free' ? 'image' : provider,
      status: 'queued',
      createdAt: new Date().toISOString(),
      isImageSequence: tier === 'free'
    };

    // Store job in memory (in production, use a database)
    global.jobStore = global.jobStore || new Map();
    global.jobStore.set(jobId, jobData);

    // Return immediately
    res.json({
      success: true,
      jobId,
      status: 'queued',
      message: tier === 'free' ? 'Image preview queued for generation' : 'Video generation queued',
      tier,
      isImageSequence: tier === 'free',
      estimatedTime: tier === 'free' ? '5-10 seconds' : '30-60 seconds'
    });

  } catch (error) {
    console.error('Error creating video job:', error);
    res.status(500).json({
      error: 'Failed to create video job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/video/status', (req, res) => {
  const { jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ 
      error: 'Missing jobId parameter',
      example: '/api/video/status?jobId=fal_abc123'
    });
  }

  try {
    global.jobStore = global.jobStore || new Map();
    const job = global.jobStore.get(jobId);

    if (!job) {
      return res.status(404).json({ 
        error: 'Job not found',
        jobId 
      });
    }

    const isImageJob = jobId.startsWith('img_') || job.isImageSequence;
    const elapsed = Date.now() - new Date(job.createdAt).getTime();
    
    let status = 'processing';
    let videoUrl = null;
    let thumbnailUrl = null;

    if (isImageJob) {
      // Image sequence jobs complete quickly
      const processingTime = 5000; // 5 seconds
      if (elapsed >= processingTime) {
        status = 'completed';
        // Use Pollinations for image generation
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(job.prompt)}?width=768&height=1024&nologo=true&seed=${jobId.slice(-6)}`;
        videoUrl = imageUrl;
        thumbnailUrl = imageUrl;
        
        // Decrement active jobs
        const userLimit = userRateLimits.get(job.userId);
        if (userLimit && userLimit.activeJobs > 0) {
          userLimit.activeJobs--;
        }
      }
    } else {
      // Real video jobs take longer
      const processingTime = 30000; // 30 seconds
      if (elapsed >= processingTime) {
        status = 'completed';
        videoUrl = 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4';
        thumbnailUrl = `https://picsum.photos/640/360?random=${jobId.slice(-6)}`;
        
        // Decrement active jobs
        const userLimit = userRateLimits.get(job.userId);
        if (userLimit && userLimit.activeJobs > 0) {
          userLimit.activeJobs--;
        }
      }
    }

    res.json({
      success: true,
      jobId,
      status,
      videoUrl,
      thumbnailUrl,
      duration: job.duration,
      tier: job.tier,
      isImageSequence: isImageJob,
      progress: status === 'processing' ? Math.min(90, Math.floor(elapsed / 1000) * 10) : 100,
      estimatedRemaining: status === 'processing' ? Math.max(0, (isImageJob ? 5000 : 30000) - elapsed) : 0,
      createdAt: job.createdAt,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking video status:', error);
    res.status(500).json({
      error: 'Failed to check video status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cleanup old jobs periodically
setInterval(() => {
  if (global.jobStore) {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    for (const [jobId, job] of global.jobStore.entries()) {
      if (now - new Date(job.createdAt).getTime() > maxAge) {
        global.jobStore.delete(jobId);
      }
    }
  }
  
  // Also clean up old rate limit data
  const now = Date.now();
  for (const [userId, data] of userRateLimits.entries()) {
    if (data.requests.length === 0 && data.activeJobs === 0) {
      // Remove users with no activity
      userRateLimits.delete(userId);
    } else {
      // Clean up old requests
      data.requests = data.requests.filter(time => now - time < 60000);
    }
  }
}, 300000); // Run every 5 minutes

// Serve the React app
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NeoClip AI Server running on http://localhost:${PORT}`);
  console.log('Features:');
  console.log('- Rate limiting: 10 requests/minute per user');
  console.log('- Concurrent job limit: 3 jobs per user');
  console.log('- Free tier: Image sequences via Pollinations');
  console.log('- Paid tiers: Mock video generation');
});