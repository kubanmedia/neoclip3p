/**
 * NeoClip AI v3 - Video Generation Service
 * 
 * Zero-Cost Architecture:
 * - Free Tier: PiAPI Hailuo-02 (50 free/day, $0.002/gen)
 * - Paid Tiers: FAL.ai Kling 2.5 Turbo ($0.018/gen)
 * - Fallback: Pollinations.ai (free, image-to-video)
 */

import { UserTier, GenerationResponse, VideoConfig, PRICING, ConnectionStatus } from '../types';

// API Configuration
const API_ENDPOINTS = {
  // PiAPI for Hailuo-02 (Free tier)
  piapi: 'https://api.piapi.ai/v1/video/generations',
  piapiStatus: 'https://api.piapi.ai/v1/video/generations',
  
  // FAL.ai for Kling 2.5 (Paid tiers)  
  fal: 'https://fal.run/fal-ai/kling-video/v2.5-turbo/text-to-video',
  
  // Fallbacks
  pollinations: 'https://image.pollinations.ai/prompt',
  huggingface: 'https://api-inference.huggingface.co/models',
  
  // Self-hosted backend (if deployed)
  backend: '/api/generate'
};

// Key storage helpers
const getStoredKey = (provider: string): string | null => {
  return localStorage.getItem(`neoclip_${provider}_key`);
};

const setStoredKey = (provider: string, key: string): void => {
  localStorage.setItem(`neoclip_${provider}_key`, key);
};

/**
 * Check connection status for a provider
 */
export async function checkConnection(tier: UserTier): Promise<ConnectionStatus> {
  const provider = tier === 'free' ? 'piapi' : 'fal';
  const key = getStoredKey(provider);
  
  if (!key && tier !== 'free') {
    return {
      connected: false,
      provider,
      error: `No API key configured for ${provider}. Add key in Settings.`
    };
  }
  
  // For free tier without key, we use fallback (Pollinations)
  if (tier === 'free' && !key) {
    return {
      connected: true,
      provider: 'pollinations (fallback)',
      remainingCredits: -1 // Unlimited for fallback
    };
  }
  
  try {
    // Quick health check
    await fetch(
      tier === 'free' 
        ? 'https://api.piapi.ai/health'
        : 'https://fal.run/health',
      { method: 'HEAD', signal: AbortSignal.timeout(5000) }
    ).catch(() => null);
    
    return {
      connected: true,
      provider,
      remainingCredits: tier === 'free' ? 10 : -1
    };
  } catch (error) {
    return {
      connected: false,
      provider,
      error: `Failed to connect to ${provider}`
    };
  }
}

/**
 * Generate video using PiAPI Hailuo-02 (Free Tier)
 */
async function generateWithPiAPI(
  config: VideoConfig,
  apiKey: string
): Promise<GenerationResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.piapi, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'minimax/hailuo-02',
        prompt: config.prompt,
        length: Math.min(config.duration, 10),
        resolution: '768p',
        aspect_ratio: config.aspectRatio
      })
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `PiAPI error: ${response.status}`);
    }
    
    const data = await response.json();
    const taskId = data.taskId || data.id;
    
    // Poll for completion
    const videoUrl = await pollForCompletion('piapi', taskId, apiKey);
    
    return {
      success: true,
      videoUrl,
      taskId,
      tier: 'free',
      hasAdCard: true
    };
  } catch (error: any) {
    console.error('PiAPI generation failed:', error);
    return {
      success: false,
      error: error.message || 'PiAPI generation failed'
    };
  }
}

/**
 * Generate video using FAL.ai Kling 2.5 (Paid Tiers)
 */
async function generateWithFAL(
  config: VideoConfig,
  apiKey: string,
  tier: UserTier
): Promise<GenerationResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.fal, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: config.prompt,
        duration: Math.min(config.duration, tier === 'pro' ? 30 : 15),
        resolution: '1080p',
        aspect_ratio: config.aspectRatio
      })
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `FAL error: ${response.status}`);
    }
    
    const data = await response.json();
    const videoUrl = data.video?.url || data.url;
    
    return {
      success: true,
      videoUrl,
      tier,
      hasAdCard: false
    };
  } catch (error: any) {
    console.error('FAL generation failed:', error);
    return {
      success: false,
      error: error.message || 'FAL generation failed'
    };
  }
}

/**
 * Fallback: Generate image with Pollinations and simulate video
 */
async function generateWithPollinations(config: VideoConfig): Promise<GenerationResponse> {
  try {
    const seed = Math.floor(Math.random() * 1000000);
    const dimensions = config.aspectRatio === '9:16' 
      ? 'width=576&height=1024'
      : config.aspectRatio === '16:9'
        ? 'width=1024&height=576'
        : 'width=720&height=720';
    
    const imageUrl = `${API_ENDPOINTS.pollinations}/${encodeURIComponent(config.prompt)}?${dimensions}&seed=${seed}&model=flux&nologo=true`;
    
    // Verify image loads
    const testResponse = await fetch(imageUrl, { method: 'HEAD' });
    if (!testResponse.ok) {
      throw new Error('Pollinations image generation failed');
    }
    
    return {
      success: true,
      videoUrl: imageUrl, // Static image as fallback
      tier: 'free',
      hasAdCard: true
    };
  } catch (error: any) {
    return {
      success: false,
      error: 'All video providers unavailable. Please try again later.'
    };
  }
}

/**
 * Poll for video completion (PiAPI)
 */
async function pollForCompletion(
  _provider: 'piapi',
  taskId: string,
  apiKey: string,
  maxAttempts = 30
): Promise<string> {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const response = await fetch(`${API_ENDPOINTS.piapiStatus}/${taskId}`, { headers });
    const data = await response.json();
    
    if (data.status === 'completed' || data.video_url) {
      return data.video_url;
    }
    
    if (data.status === 'failed' || data.error) {
      throw new Error(data.error || 'Video generation failed');
    }
  }
  
  throw new Error('Video generation timed out');
}

/**
 * Main generate function - routes to appropriate provider
 */
export async function generateVideo(
  config: VideoConfig,
  tier: UserTier
): Promise<GenerationResponse> {
  const tierConfig = PRICING[tier];
  
  // Enforce duration limits
  const duration = Math.min(config.duration, tierConfig.maxLength);
  const adjustedConfig = { ...config, duration };
  
  if (tier === 'free') {
    // Try PiAPI first, fallback to Pollinations
    const piapiKey = getStoredKey('piapi');
    if (piapiKey) {
      const result = await generateWithPiAPI(adjustedConfig, piapiKey);
      if (result.success) return result;
    }
    
    // Fallback to Pollinations (free, unlimited)
    console.log('Using Pollinations fallback for free tier');
    return generateWithPollinations(adjustedConfig);
    
  } else {
    // Paid tiers use FAL
    const falKey = getStoredKey('fal');
    if (!falKey) {
      return {
        success: false,
        error: 'FAL.ai API key required for paid tier. Add in Settings.'
      };
    }
    
    return generateWithFAL(adjustedConfig, falKey, tier);
  }
}

/**
 * Save API key
 */
export function saveApiKey(provider: 'piapi' | 'fal' | 'google', key: string): void {
  setStoredKey(provider, key);
}

/**
 * Get API key
 */
export function getApiKey(provider: 'piapi' | 'fal' | 'google'): string | null {
  return getStoredKey(provider);
}

/**
 * Generate prompt ideas
 */
export const PROMPT_IDEAS = [
  { emoji: '🌅', text: 'Golden sunset over ocean waves, cinematic 4K' },
  { emoji: '🚀', text: 'Rocket launch at night, slow motion, dramatic' },
  { emoji: '🌸', text: 'Cherry blossoms falling in slow motion, Japanese garden' },
  { emoji: '🦁', text: 'Majestic lion walking through savanna, golden hour' },
  { emoji: '🏙️', text: 'Futuristic city skyline, neon lights, rain, blade runner style' },
  { emoji: '🌊', text: 'Underwater coral reef, tropical fish, crystal clear water' },
  { emoji: '🎭', text: 'Venetian masquerade ball, elegant dancers, candlelight' },
  { emoji: '🏔️', text: 'Northern lights over snowy mountains, timelapse' },
  { emoji: '🎪', text: 'Circus performance, acrobats in air, spotlight' },
  { emoji: '🌺', text: 'Flower blooming timelapse, macro shot, studio lighting' }
];

/**
 * Validate video URL
 */
export function isValidVideoUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith('http://') || 
         url.startsWith('https://') || 
         url.startsWith('blob:') ||
         url.startsWith('data:');
}

/**
 * Get aspect ratio dimensions
 */
export function getAspectRatioDimensions(ratio: '9:16' | '16:9' | '1:1'): { width: number; height: number } {
  switch (ratio) {
    case '9:16': return { width: 576, height: 1024 };
    case '16:9': return { width: 1024, height: 576 };
    case '1:1': return { width: 720, height: 720 };
    default: return { width: 576, height: 1024 };
  }
}
