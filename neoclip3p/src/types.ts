// NeoClip AI v3 - Type Definitions

export type UserTier = 'free' | 'basic' | 'pro';
export type AppView = 'onboarding' | 'create' | 'library' | 'settings' | 'upgrade' | 'referral';

export interface PricingTier {
  name: string;
  price: number;
  gensPerMonth: number;
  maxLength: number;
  model: string;
  watermark: boolean;
  hasAds: boolean;
  resolution: string;
}

export const PRICING: Record<UserTier, PricingTier> = {
  free: {
    name: 'Free',
    price: 0,
    gensPerMonth: 10,
    maxLength: 10,
    model: 'Hailuo-02 (MiniMax)',
    watermark: true,
    hasAds: true,
    resolution: '768p'
  },
  basic: {
    name: 'Basic',
    price: 4.99,
    gensPerMonth: 120,
    maxLength: 15,
    model: 'Kling 2.5 Turbo',
    watermark: false,
    hasAds: false,
    resolution: '1080p'
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    gensPerMonth: 300,
    maxLength: 30,
    model: 'Kling 2.5 + Veo Toggle',
    watermark: false,
    hasAds: false,
    resolution: '1080p'
  }
};

export interface UserState {
  id: string;
  tier: UserTier;
  freeUsed: number;
  paidUsed: number;
  resetsAt: string;
  referralCode: string;
  referralCount: number;
  hasSeenOnboarding: boolean;
  apiKeys: {
    piapi?: string;
    fal?: string;
    google?: string;
  };
}

export interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  thumbnail?: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  timestamp: number;
  duration: number;
  model: string;
  tier: UserTier;
  hasAdCard: boolean;
}

export interface VideoConfig {
  prompt: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  duration: number;
  image?: string;
}

export interface GenerationResponse {
  success: boolean;
  videoUrl?: string;
  taskId?: string;
  error?: string;
  remaining?: number;
  tier?: UserTier;
  hasAdCard?: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  provider: string;
  error?: string;
  remainingCredits?: number;
}

// Cost per generation (for tracking)
export const GENERATION_COSTS = {
  free: 0.002,    // Hailuo-02 via PiAPI
  basic: 0.018,   // Kling 2.5 Turbo via FAL
  pro: 0.018      // Kling 2.5 / Veo via FAL/Google
};

// Default user state
export const DEFAULT_USER: UserState = {
  id: crypto.randomUUID(),
  tier: 'free',
  freeUsed: 0,
  paidUsed: 0,
  resetsAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
  referralCode: '',
  referralCount: 0,
  hasSeenOnboarding: false,
  apiKeys: {}
};
