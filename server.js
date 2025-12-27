import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// Mock video service for testing
const createVideoJob = async (config) => {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  // Store job in localStorage for demo
  const jobData = {
    id: jobId,
    prompt: config.prompt,
    aspectRatio: config.aspectRatio,
    duration: config.duration,
    provider: config.provider,
    tier: config.tier,
    status: 'queued',
    createdAt: new Date().toISOString()
  };
  
  localStorage.setItem(`video_job_${jobId}`, JSON.stringify(jobData));
  
  return { jobId, status: 'queued' };
};

const getVideoJobStatus = async (jobId) => {
  const jobData = localStorage.getItem(`video_job_${jobId}`);
  if (!jobData) {
    return { status: 'failed', error: 'Job not found' };
  }
  
  const job = JSON.parse(jobData);
  
  // Simulate processing for demo
  const elapsed = Date.now() - new Date(job.createdAt).getTime();
  const processingTime = 3000; // 3 seconds
  
  if (elapsed < processingTime) {
    return { status: 'processing' };
  }
  
  // For demo, return a working video URL
  const isImage = job.tier === 'free' || job.provider === 'image';
  
  if (isImage) {
    // Use Pollinations video endpoint for free tier
    const w = job.aspectRatio === '9:16' ? 576 : 1024;
    const h = job.aspectRatio === '9:16' ? 1024 : 576;
    const duration = Math.min(job.duration || 10, 16);
    const videoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(job.prompt)}?width=${w}&height=${h}&duration=${duration}&format=mp4&nologo=true`;
    
    return {
      status: 'completed',
      videoUrl: videoUrl,
      thumbnail: videoUrl.replace('format=mp4', 'format=jpg'),
      isImageSequence: true
    };
  } else {
    // For paid tiers, return a sample video
    return {
      status: 'completed',
      videoUrl: `https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4`,
      thumbnail: `https://picsum.photos/320/180?random=${jobId}`
    };
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.post('/api/video/create', async (req, res) => {
  try {
    const { prompt, aspectRatio, duration, provider, tier, userId } = req.body;

    // Validate required fields
    if (!prompt || !aspectRatio || !provider || !tier || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['prompt', 'aspectRatio', 'duration', 'provider', 'tier', 'userId']
      });
    }

    // Create video job
    const result = await createVideoJob({
      prompt,
      aspectRatio,
      duration: Math.min(duration, tier === 'pro' ? 30 : 15),
      provider,
      tier,
      userId
    });

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      jobId: result.jobId,
      status: result.status,
      message: result.isImageSequence ? 'Image preview queued for generation' : 'Video generation queued',
      tier,
      isImageSequence: result.isImageSequence || false
    });

  } catch (error) {
    console.error('Error creating video job:', error);
    res.status(500).json({
      error: 'Failed to create video job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/video/status', async (req, res) => {
  try {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ 
        error: 'Missing jobId parameter',
        example: '/api/video/status?jobId=fal_abc123'
      });
    }

    const status = await getVideoJobStatus(jobId);

    res.json({
      success: true,
      jobId,
      status: status.status,
      videoUrl: status.videoUrl,
      thumbnailUrl: status.thumbnail,
      error: status.error,
      isImageSequence: status.isImageSequence
    });

  } catch (error) {
    console.error('Error checking video status:', error);
    res.status(500).json({
      error: 'Failed to check video status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Handle all other routes (for SPA)
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`NeoClip AI Server running on http://localhost:${PORT}`);
  console.log('Video generation endpoints:');
  console.log('- POST /api/video/create');
  console.log('- GET  /api/video/status');
});

export default app;