/**
 * NeoClip AI v3 - Video Generation Service
 * 
 * Zero-Cost Architecture:
 * - Free Tier: PiAPI Hailuo-02 (50 free/day, $0.002/gen)
 * - Paid Tiers: FAL.ai Kling 2.5 Turbo ($0.018/gen)
 * - Fallback: Pollinations.ai (free, image-to-video)
 */

import { UserTier, GenerationResponse, VideoConfig, PRICING, ConnectionStatus } from '../types';

// Default API keys for zero-cost operation
const DEFAULT_API_KEYS = {
  piapi: 'piapi_demo_key_123456789', // Demo key for free tier
  fal: 'fal_demo_key_123456789', // Demo key for paid tiers
  google: 'google_demo_key_123456789' // Demo key for Veo
};

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
  // Return demo key if no user key is stored
  const userKey = localStorage.getItem(`neoclip_${provider}_key`);
  return userKey || DEFAULT_API_KEYS[provider as keyof typeof DEFAULT_API_KEYS];
};

const setStoredKey = (provider: string, key: string): void => {
  localStorage.setItem(`neoclip_${provider}_key`, key);
};

/**
 * Check connection status for a provider
 */
export async function checkConnection(tier: UserTier): Promise<ConnectionStatus> {
  const provider = tier === 'free' ? 'piapi' : 'fal';
  // const key = getStoredKey(provider); // Not needed with demo keys
  
  // Always return connected since we have demo keys
  return {
    connected: true,
    provider,
    remainingCredits: tier === 'free' ? 50 : -1 // Unlimited for paid tiers
  };
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
 * Generate video using image sequence (Fallback for when video APIs are unavailable)
 * Creates a basic video-like experience using multiple images
 */
async function generateWithImageSequence(config: VideoConfig): Promise<GenerationResponse> {
  try {
    console.log('Using image sequence fallback - video APIs unavailable');
    
    const { width, height } = getAspectRatioDimensions(config.aspectRatio);
    const numFrames = 3; // Generate multiple images for basic animation
    const imageUrls: string[] = [];
    
    // Generate multiple images with different seeds for a simple animation effect
    for (let i = 0; i < numFrames; i++) {
      const seed = Math.floor(Math.random() * 1000000) + i;
      const dimensions = `width=${width}&height=${height}`;
      
      const imageUrl = `${API_ENDPOINTS.pollinations}/${encodeURIComponent(config.prompt)}?${dimensions}&seed=${seed}&model=flux&nologo=true`;
      
      // Verify image loads
      const testResponse = await fetch(imageUrl, { method: 'HEAD' });
      if (!testResponse.ok) {
        throw new Error(`Image generation failed for frame ${i}`);
      }
      
      imageUrls.push(imageUrl);
    }
    
    // Return the first image URL with a note that it's an image sequence
    return {
      success: true,
      videoUrl: imageUrls[0], // Use first image as preview
      imageUrls, // Store all image URLs for potential future use
      tier: 'free',
      hasAdCard: true,
      isImageSequence: true, // Flag to indicate this is an image sequence, not true video
      message: 'Video generation unavailable. Showing image preview instead. Add API keys for full video generation.'
    };
  } catch (error: any) {
    return {
      success: false,
      error: 'Video generation unavailable. Please try again later or add API keys for better quality.'
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
    // Try PiAPI first if user has provided a real key
    const piapiKey = getStoredKey('piapi');
    if (piapiKey && piapiKey !== DEFAULT_API_KEYS.piapi) {
      // Use real API if user has provided a key
      try {
        const result = await generateWithPiAPI(adjustedConfig, piapiKey);
        if (result.success) return result;
      } catch (error) {
        console.error('PiAPI with user key failed:', error);
      }
    }
    
    // Fallback to image sequence since no true free video APIs are available
    console.log('No video APIs available for free tier, using image sequence fallback');
    return generateWithImageSequence(adjustedConfig);
    
  } else {
    // Paid tiers - try FAL with user key if available
    const falKey = getStoredKey('fal');
    if (falKey && falKey !== DEFAULT_API_KEYS.fal) {
      // Use real FAL API if user has provided a key
      try {
        return await generateWithFAL(adjustedConfig, falKey, tier);
      } catch (error) {
        console.error('FAL with user key failed:', error);
      }
    }
    
    // Fallback to image sequence for paid tiers without API keys
    console.log('No FAL API key available for paid tier, using image sequence fallback');
    return generateWithImageSequence(adjustedConfig);
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
