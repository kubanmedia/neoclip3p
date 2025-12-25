/**
 * NeoClip AI v3 - Main Application
 * 
 * Zero-Cost to Cash-Flow Positive Video Generation App
 * 
 * Tech Stack:
 * - Frontend: React + TypeScript + Tailwind CSS
 * - Video Generation: PiAPI (Hailuo-02) + FAL.ai (Kling 2.5)
 * - Fallback: Pollinations.ai (free unlimited)
 * - Storage: LocalStorage (demo) / Supabase (production)
 * 
 * Pricing Model:
 * - Free: 10 clips/month, 10s max, 768p, watermark, 5s ad
 * - Basic $4.99: 120 clips/month, 15s max, 1080p, no watermark/ads
 * - Pro $9.99: 300 clips/month, 30s max, 1080p, Veo toggle
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Home, Film, Settings, ChevronRight, Crown, Zap, 
  Download, Share2, Trash2, Clock, Sparkles, Key, Gift,
  Check, ArrowLeft, HelpCircle
} from 'lucide-react';

import { 
  UserState, UserTier, AppView, GeneratedVideo, VideoConfig, 
  PRICING, DEFAULT_USER 
} from './types';

import { 
  generateVideo, saveApiKey, getApiKey, 
  PROMPT_IDEAS
} from './services/videoService';

import {
  Button, InputArea, Toggle, TierSelector, ImageUploader,
  VideoPlayer, LoadingOverlay, AdOverlay, Watermark,
  PricingCard, Toast, ReferralCard, PromptIdeas, TextInput
} from './components/UIComponents';

// ============ STORAGE HELPERS ============
const STORAGE_KEYS = {
  user: 'neoclip_user_v3',
  videos: 'neoclip_videos_v3'
};

function loadUserState(): UserState {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.user);
    if (stored) {
      const user = JSON.parse(stored);
      // Check if credits should reset
      if (new Date(user.resetsAt) <= new Date()) {
        user.freeUsed = 0;
        user.paidUsed = 0;
        user.resetsAt = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
      }
      return user;
    }
  } catch (e) {
    console.error('Failed to load user state:', e);
  }
  const newUser = { ...DEFAULT_USER, referralCode: generateReferralCode() };
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(newUser));
  return newUser;
}

function saveUserState(user: UserState): void {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

function loadVideos(): GeneratedVideo[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.videos);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveVideos(videos: GeneratedVideo[]): void {
  localStorage.setItem(STORAGE_KEYS.videos, JSON.stringify(videos));
}

function generateReferralCode(): string {
  return 'NC' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ============ MAIN APP COMPONENT ============
const App: React.FC = () => {
  // Core State
  const [user, setUser] = useState<UserState>(() => loadUserState());
  const [videos, setVideos] = useState<GeneratedVideo[]>(() => loadVideos());
  const [view, setView] = useState<AppView>(user.hasSeenOnboarding ? 'create' : 'onboarding');
  
  // Generation State
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [duration, setDuration] = useState(10);
  const [selectedTier, setSelectedTier] = useState<UserTier>('free');
  
  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [showAdOverlay, setShowAdOverlay] = useState(false);
  const [pendingVideo, setPendingVideo] = useState<GeneratedVideo | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  
  // Settings State
  const [settingsTab, setSettingsTab] = useState<'general' | 'api' | 'account'>('general');
  const [apiKeyInputs, setApiKeyInputs] = useState({
    piapi: getApiKey('piapi') || '',
    fal: getApiKey('fal') || '',
    google: getApiKey('google') || ''
  });

  // Persist state changes
  useEffect(() => {
    saveUserState(user);
  }, [user]);

  useEffect(() => {
    saveVideos(videos);
  }, [videos]);

  // Calculate remaining generations
  const getRemainingGenerations = useCallback((): number => {
    if (user.tier === 'free') {
      return Math.max(0, PRICING.free.gensPerMonth - user.freeUsed);
    }
    const tierConfig = PRICING[user.tier];
    return Math.max(0, tierConfig.gensPerMonth - user.paidUsed);
  }, [user]);

  // Handle video generation
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setToast({ message: 'Please enter a prompt', type: 'error' });
      return;
    }

    const remaining = getRemainingGenerations();
    if (selectedTier === 'free' && remaining <= 0) {
      setToast({ message: 'Free limit reached. Upgrade for more!', type: 'error' });
      setView('upgrade');
      return;
    }

    if (selectedTier !== 'free' && user.tier === 'free') {
      setToast({ message: 'Upgrade to use paid tiers', type: 'error' });
      setView('upgrade');
      return;
    }

    setIsGenerating(true);
    setGeneratingProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setGeneratingProgress(prev => Math.min(prev + Math.random() * 10, 90));
    }, 1000);

    try {
      const config: VideoConfig = {
        prompt: prompt.trim(),
        aspectRatio,
        duration,
        image: selectedImage || undefined
      };

      const result = await generateVideo(config, selectedTier);

      clearInterval(progressInterval);
      setGeneratingProgress(100);

      if (result.success && result.videoUrl) {
        const newVideo: GeneratedVideo = {
          id: crypto.randomUUID(),
          url: result.videoUrl,
          prompt: config.prompt,
          aspectRatio: config.aspectRatio,
          timestamp: Date.now(),
          duration: config.duration,
          model: PRICING[selectedTier].model,
          tier: selectedTier,
          hasAdCard: selectedTier === 'free'
        };

        // Update usage
        if (selectedTier === 'free') {
          setUser(prev => ({ ...prev, freeUsed: prev.freeUsed + 1 }));
        } else {
          setUser(prev => ({ ...prev, paidUsed: prev.paidUsed + 1 }));
        }

        // Show ad for free tier
        if (selectedTier === 'free') {
          setPendingVideo(newVideo);
          setShowAdOverlay(true);
        } else {
          setVideos(prev => [newVideo, ...prev]);
          setPrompt('');
          setSelectedImage(null);
          setToast({ message: 'Video generated successfully!', type: 'success' });
        }
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      setToast({ message: error.message || 'Generation failed', type: 'error' });
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setGeneratingProgress(0);
    }
  };

  // Handle ad completion
  const handleAdComplete = () => {
    setShowAdOverlay(false);
    if (pendingVideo) {
      setVideos(prev => [pendingVideo, ...prev]);
      setPendingVideo(null);
      setPrompt('');
      setSelectedImage(null);
      setToast({ message: 'Video ready!', type: 'success' });
    }
  };

  // Handle video deletion
  const handleDeleteVideo = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
    setSelectedVideoId(null);
    setToast({ message: 'Video deleted', type: 'info' });
  };

  // Handle video share
  const handleShareVideo = async (video: GeneratedVideo) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this video I made with NeoClip AI!',
          text: video.prompt,
          url: video.url
        });
      } catch (e) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy URL
      navigator.clipboard.writeText(video.url);
      setToast({ message: 'Video URL copied!', type: 'success' });
    }
  };

  // Handle upgrade
  const handleUpgrade = (tier: UserTier) => {
    if (tier === 'free') {
      setToast({ message: 'You are already on Free tier', type: 'info' });
      return;
    }
    // In production, integrate with Stripe/App Store
    // For now, simulate upgrade
    setUser(prev => ({ ...prev, tier }));
    setToast({ message: `Upgraded to ${PRICING[tier].name}!`, type: 'success' });
    setView('create');
  };

  // Handle API key save
  const handleSaveApiKey = (provider: 'piapi' | 'fal' | 'google') => {
    const key = apiKeyInputs[provider];
    if (key) {
      saveApiKey(provider, key);
      setToast({ message: `${provider.toUpperCase()} API key saved`, type: 'success' });
    }
  };

  // Handle referral share
  const handleShareReferral = async () => {
    const shareText = `Join me on NeoClip AI and get free video generation! Use code: ${user.referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'NeoClip AI Invite', text: shareText });
      } catch {}
    } else {
      navigator.clipboard.writeText(shareText);
      setToast({ message: 'Referral link copied!', type: 'success' });
    }
  };

  // Complete onboarding
  const completeOnboarding = () => {
    setUser(prev => ({ ...prev, hasSeenOnboarding: true }));
    setView('create');
  };

  // ============ RENDER VIEWS ============
  
  // Onboarding View
  const renderOnboarding = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
        <Sparkles className="w-12 h-12 text-white" />
      </div>
      
      <h1 className="text-3xl font-bold mb-2">Welcome to NeoClip AI</h1>
      <p className="text-white/60 mb-8 max-w-xs">
        Generate 10 viral shorts before your coffee is ready – no credit card, no watermark limit.
      </p>
      
      <div className="space-y-4 w-full max-w-xs">
        <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
          <Zap className="w-8 h-8 text-cyan-400" />
          <div className="text-left">
            <p className="font-medium">10 Free Clips/Month</p>
            <p className="text-sm text-white/50">No credit card needed</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
          <Film className="w-8 h-8 text-purple-400" />
          <div className="text-left">
            <p className="font-medium">Up to 10s Videos</p>
            <p className="text-sm text-white/50">768p quality, instant export</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
          <Crown className="w-8 h-8 text-amber-400" />
          <div className="text-left">
            <p className="font-medium">Upgrade Anytime</p>
            <p className="text-sm text-white/50">30s videos, 1080p, no ads</p>
          </div>
        </div>
      </div>
      
      <Button onClick={completeOnboarding} className="mt-8 w-full max-w-xs" size="lg">
        Get Started Free
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );

  // Create View
  const renderCreate = () => (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Create Video</h1>
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium">{getRemainingGenerations()} left</span>
        </div>
      </div>
      
      {/* Tier Selector */}
      <TierSelector
        selectedTier={selectedTier}
        userTier={user.tier}
        onChange={setSelectedTier}
        freeUsed={user.freeUsed}
      />
      
      {/* Prompt Input */}
      <div className="mt-6">
        <label className="text-sm text-white/70 mb-2 block">Describe your video</label>
        <InputArea
          value={prompt}
          onChange={setPrompt}
          placeholder="A majestic lion walking through golden savanna at sunset, cinematic 4K..."
          maxLength={500}
        />
      </div>
      
      {/* Prompt Ideas */}
      <div className="mt-4">
        <PromptIdeas ideas={PROMPT_IDEAS} onSelect={setPrompt} />
      </div>
      
      {/* Image Upload (Optional) */}
      <div className="mt-6">
        <label className="text-sm text-white/70 mb-2 block">Reference Image (optional)</label>
        <ImageUploader
          image={selectedImage}
          onUpload={setSelectedImage}
          onClear={() => setSelectedImage(null)}
        />
      </div>
      
      {/* Aspect Ratio */}
      <div className="mt-6">
        <label className="text-sm text-white/70 mb-2 block">Aspect Ratio</label>
        <Toggle
          options={['9:16', '16:9', '1:1']}
          selected={['9:16', '16:9', '1:1'].indexOf(aspectRatio)}
          onChange={(i) => setAspectRatio(['9:16', '16:9', '1:1'][i] as any)}
        />
      </div>
      
      {/* Duration */}
      <div className="mt-6">
        <label className="text-sm text-white/70 mb-2 block">
          Duration: {duration}s (max {PRICING[selectedTier].maxLength}s)
        </label>
        <input
          type="range"
          min={3}
          max={PRICING[selectedTier].maxLength}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full accent-cyan-400"
        />
      </div>
      
      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
        loading={isGenerating}
        className="w-full mt-8"
        size="lg"
      >
        {isGenerating ? 'Generating...' : `Generate ${duration}s Video`}
        {!isGenerating && <Sparkles className="w-5 h-5" />}
      </Button>
      
      {/* Free tier notice */}
      {selectedTier === 'free' && (
        <p className="text-xs text-white/40 text-center mt-3">
          Free videos include a 5s promotional end card
        </p>
      )}
    </div>
  );

  // Library View
  const renderLibrary = () => (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">My Videos</h1>
      
      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Film className="w-16 h-16 text-white/20 mb-4" />
          <p className="text-white/50 mb-2">No videos yet</p>
          <Button onClick={() => setView('create')} variant="secondary">
            Create Your First Video
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {videos.map((video) => (
            <div 
              key={video.id} 
              className="relative rounded-xl overflow-hidden bg-white/5 cursor-pointer"
              onClick={() => setSelectedVideoId(video.id)}
            >
              <VideoPlayer
                url={video.url}
                aspectRatio={video.aspectRatio}
                showControls={false}
              />
              {video.tier === 'free' && (
                <Watermark text="#MadeWithNeoClip" />
              )}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-xs truncate">{video.prompt}</p>
                <p className="text-xs text-white/50">{video.duration}s • {video.tier}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Video Detail Modal */}
      {selectedVideoId && (() => {
        const video = videos.find(v => v.id === selectedVideoId);
        if (!video) return null;
        
        return (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm p-4 overflow-auto">
            <div className="max-w-lg mx-auto">
              <button 
                onClick={() => setSelectedVideoId(null)}
                className="flex items-center gap-2 text-white/70 mb-4 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              
              <div className="relative rounded-2xl overflow-hidden">
                <VideoPlayer
                  url={video.url}
                  aspectRatio={video.aspectRatio}
                  showControls={true}
                  autoPlay={true}
                />
                {video.tier === 'free' && (
                  <Watermark text="#MadeWithNeoClip" />
                )}
              </div>
              
              <div className="mt-4 space-y-4">
                <p className="text-white/80">{video.prompt}</p>
                
                <div className="flex items-center gap-4 text-sm text-white/50">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {video.duration}s
                  </span>
                  <span>{video.aspectRatio}</span>
                  <span className="capitalize">{video.tier}</span>
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    onClick={() => handleShareVideo(video)} 
                    variant="secondary"
                    className="flex-1"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                  <a 
                    href={video.url} 
                    download={`neoclip-${video.id}.mp4`}
                    className="flex-1"
                  >
                    <Button variant="secondary" className="w-full">
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </a>
                  <Button 
                    onClick={() => handleDeleteVideo(video.id)} 
                    variant="ghost"
                    className="text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );

  // Settings View
  const renderSettings = () => (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      {/* Settings Tabs */}
      <div className="flex gap-2 mb-6">
        {(['general', 'api', 'account'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSettingsTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              settingsTab === tab 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      
      {settingsTab === 'general' && (
        <div className="space-y-6">
          {/* Current Plan */}
          <div className="bg-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Current Plan</h3>
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                user.tier === 'free' ? 'bg-gray-500/20 text-gray-300' :
                user.tier === 'basic' ? 'bg-blue-500/20 text-blue-300' :
                'bg-amber-500/20 text-amber-300'
              }`}>
                {PRICING[user.tier].name}
              </span>
            </div>
            <p className="text-sm text-white/50 mb-3">
              {getRemainingGenerations()} of {PRICING[user.tier].gensPerMonth} generations remaining
            </p>
            <Button onClick={() => setView('upgrade')} variant="secondary" size="sm">
              {user.tier === 'free' ? 'Upgrade Plan' : 'Manage Plan'}
            </Button>
          </div>
          
          {/* Reset Date */}
          <div className="bg-white/5 rounded-2xl p-4">
            <h3 className="font-medium mb-2">Credits Reset</h3>
            <p className="text-sm text-white/50">
              Your credits reset on {new Date(user.resetsAt).toLocaleDateString()}
            </p>
          </div>
          
          {/* Referral */}
          <ReferralCard
            code={user.referralCode}
            count={user.referralCount}
            onShare={handleShareReferral}
            onCopy={() => {
              navigator.clipboard.writeText(user.referralCode);
              setToast({ message: 'Referral code copied!', type: 'success' });
            }}
          />
        </div>
      )}
      
      {settingsTab === 'api' && (
        <div className="space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
            <div className="flex gap-3">
              <HelpCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-300 font-medium mb-1">API Keys (Optional)</p>
                <p className="text-white/60">
                  Add your own API keys for faster generation and higher limits. 
                  Without keys, the app uses free fallback services.
                </p>
              </div>
            </div>
          </div>
          
          {/* PiAPI Key (Free Tier) */}
          <div className="bg-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-cyan-400" />
              <h3 className="font-medium">PiAPI Key (Free Tier)</h3>
            </div>
            <p className="text-xs text-white/50 mb-3">
              Get 50 free generations/day from{' '}
              <a href="https://piapi.ai" target="_blank" className="text-cyan-400 underline">
                piapi.ai
              </a>
            </p>
            <div className="flex gap-2">
              <TextInput
                value={apiKeyInputs.piapi}
                onChange={(v) => setApiKeyInputs(prev => ({ ...prev, piapi: v }))}
                placeholder="Enter PiAPI key..."
                type="password"
              />
              <Button onClick={() => handleSaveApiKey('piapi')} size="sm">Save</Button>
            </div>
          </div>
          
          {/* FAL Key (Paid Tiers) */}
          <div className="bg-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-purple-400" />
              <h3 className="font-medium">FAL.ai Key (Paid Tiers)</h3>
            </div>
            <p className="text-xs text-white/50 mb-3">
              Required for Basic/Pro tiers. Get from{' '}
              <a href="https://fal.ai" target="_blank" className="text-purple-400 underline">
                fal.ai
              </a>
            </p>
            <div className="flex gap-2">
              <TextInput
                value={apiKeyInputs.fal}
                onChange={(v) => setApiKeyInputs(prev => ({ ...prev, fal: v }))}
                placeholder="Enter FAL.ai key..."
                type="password"
              />
              <Button onClick={() => handleSaveApiKey('fal')} size="sm">Save</Button>
            </div>
          </div>
          
          {/* Google Key (Pro Veo) */}
          <div className="bg-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-amber-400" />
              <h3 className="font-medium">Google AI Key (Pro Veo)</h3>
            </div>
            <p className="text-xs text-white/50 mb-3">
              Optional for Veo model. Get from{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" className="text-amber-400 underline">
                Google AI Studio
              </a>
            </p>
            <div className="flex gap-2">
              <TextInput
                value={apiKeyInputs.google}
                onChange={(v) => setApiKeyInputs(prev => ({ ...prev, google: v }))}
                placeholder="Enter Google AI key..."
                type="password"
              />
              <Button onClick={() => handleSaveApiKey('google')} size="sm">Save</Button>
            </div>
          </div>
        </div>
      )}
      
      {settingsTab === 'account' && (
        <div className="space-y-6">
          <div className="bg-white/5 rounded-2xl p-4">
            <h3 className="font-medium mb-3">Account Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">User ID</span>
                <span className="font-mono text-xs">{user.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Member Since</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Total Videos</span>
                <span>{videos.length}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-2xl p-4">
            <h3 className="font-medium mb-3">Data Management</h3>
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  const data = {
                    user,
                    videos,
                    exportedAt: new Date().toISOString()
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'neoclip-backup.json';
                  a.click();
                  setToast({ message: 'Data exported!', type: 'success' });
                }}
                variant="secondary" 
                className="w-full"
              >
                <Download className="w-4 h-4" />
                Export Data
              </Button>
              
              <Button 
                onClick={() => {
                  if (confirm('This will delete all your videos. Are you sure?')) {
                    setVideos([]);
                    setToast({ message: 'Videos cleared', type: 'info' });
                  }
                }}
                variant="ghost" 
                className="w-full text-red-400 hover:bg-red-500/20"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Videos
              </Button>
            </div>
          </div>
          
          <div className="text-center text-sm text-white/30 pt-4">
            <p>NeoClip AI v3.0.0</p>
            <p className="mt-1">Zero-Cost Video Generation</p>
          </div>
        </div>
      )}
    </div>
  );

  // Upgrade View
  const renderUpgrade = () => (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('create')} className="p-2 hover:bg-white/10 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Upgrade Plan</h1>
      </div>
      
      <p className="text-white/60 mb-6">
        Unlock more generations, longer videos, and remove ads.
      </p>
      
      <div className="space-y-4">
        <PricingCard tier="free" isCurrentTier={user.tier === 'free'} onSelect={() => handleUpgrade('free')} />
        <PricingCard tier="basic" isCurrentTier={user.tier === 'basic'} onSelect={() => handleUpgrade('basic')} />
        <PricingCard tier="pro" isCurrentTier={user.tier === 'pro'} onSelect={() => handleUpgrade('pro')} />
      </div>
      
      {/* App Store Compliance Notice */}
      <div className="mt-6 text-xs text-white/30 text-center space-y-2">
        <p>Subscription auto-renews monthly unless cancelled.</p>
        <p>Payment will be charged to your account upon confirmation.</p>
        <a href="#" className="text-cyan-400 underline">Terms of Service</a>
        {' • '}
        <a href="#" className="text-cyan-400 underline">Privacy Policy</a>
      </div>
    </div>
  );

  // Referral View
  const renderReferral = () => (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('settings')} className="p-2 hover:bg-white/10 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Invite Friends</h1>
      </div>
      
      <ReferralCard
        code={user.referralCode}
        count={user.referralCount}
        onShare={handleShareReferral}
        onCopy={() => {
          navigator.clipboard.writeText(user.referralCode);
          setToast({ message: 'Referral code copied!', type: 'success' });
        }}
      />
      
      <div className="mt-6 space-y-4">
        <h3 className="font-medium">How it works</h3>
        <div className="space-y-3">
          {[
            { icon: Share2, text: 'Share your unique referral code with friends' },
            { icon: Check, text: 'They sign up and create their first video' },
            { icon: Gift, text: 'You get 1 month Pro free for every 3 friends!' }
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <step.icon className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-sm">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Navigation Bar
  const renderNavBar = () => {
    if (view === 'onboarding') return null;
    
    const navItems = [
      { icon: Home, label: 'Home', view: 'create' as AppView },
      { icon: Film, label: 'Library', view: 'library' as AppView },
      { icon: Crown, label: 'Upgrade', view: 'upgrade' as AppView },
      { icon: Settings, label: 'Settings', view: 'settings' as AppView }
    ];
    
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-t border-white/10 px-4 py-2 safe-area-pb">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
                view === item.view
                  ? 'text-cyan-400'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    );
  };

  // ============ MAIN RENDER ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white">
      {/* Status Bar Padding */}
      <div className="h-safe-area-top bg-black/50" />
      
      {/* Main Content */}
      <main className="max-w-lg mx-auto">
        {view === 'onboarding' && renderOnboarding()}
        {view === 'create' && renderCreate()}
        {view === 'library' && renderLibrary()}
        {view === 'settings' && renderSettings()}
        {view === 'upgrade' && renderUpgrade()}
        {view === 'referral' && renderReferral()}
      </main>
      
      {/* Navigation */}
      {renderNavBar()}
      
      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={isGenerating}
        message="Generating your video..."
        progress={generatingProgress}
      />
      
      {/* Ad Overlay (Free Tier) */}
      <AdOverlay
        isVisible={showAdOverlay}
        onComplete={handleAdComplete}
      />
      
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={true}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default App;
