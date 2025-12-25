/**
 * NeoClip AI v3 - UI Components
 * Mobile-first, App Store compliant design
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, X, Loader2, Sparkles, Check, Lock, Play, Pause,
  Crown, Zap, Gift, Copy, Share2, Star, AlertCircle
} from 'lucide-react';
import { UserTier, PRICING } from '../types';

// ============ BUTTON COMPONENT ============
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'premium';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
  size = 'md'
}) => {
  const baseStyles = 'font-semibold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 active:scale-95';
  
  const variants = {
    primary: 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50',
    secondary: 'bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20',
    ghost: 'bg-transparent text-white/70 hover:text-white hover:bg-white/10',
    premium: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50'
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
    </button>
  );
};

// ============ INPUT COMPONENT ============
interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({
  value,
  onChange,
  placeholder = 'Describe your video...',
  maxLength = 500,
  disabled = false
}) => {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className="w-full h-32 p-4 bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/40 resize-none focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition-all"
      />
      <span className="absolute bottom-3 right-3 text-xs text-white/30">
        {value.length}/{maxLength}
      </span>
    </div>
  );
};

// ============ TEXT INPUT COMPONENT ============
interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'email';
  label?: string;
  error?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  label,
  error
}) => {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm text-white/70">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 bg-white/5 border ${error ? 'border-red-400' : 'border-white/20'} rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition-all`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};

// ============ TOGGLE COMPONENT ============
interface ToggleProps {
  options: string[];
  selected: number;
  onChange: (index: number) => void;
}

export const Toggle: React.FC<ToggleProps> = ({ options, selected, onChange }) => {
  return (
    <div className="flex bg-white/5 rounded-xl p-1">
      {options.map((option, index) => (
        <button
          key={option}
          onClick={() => onChange(index)}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            selected === index
              ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
              : 'text-white/60 hover:text-white'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

// ============ TIER SELECTOR COMPONENT ============
interface TierSelectorProps {
  selectedTier: UserTier;
  userTier: UserTier;
  onChange: (tier: UserTier) => void;
  freeUsed: number;
}

export const TierSelector: React.FC<TierSelectorProps> = ({
  selectedTier,
  userTier,
  onChange,
  freeUsed
}) => {
  const tiers: UserTier[] = ['free', 'basic', 'pro'];
  
  const tierIcons = {
    free: <Zap className="w-4 h-4" />,
    basic: <Star className="w-4 h-4" />,
    pro: <Crown className="w-4 h-4" />
  };
  
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {tiers.map((tier) => {
          const config = PRICING[tier];
          const isLocked = tier !== 'free' && userTier === 'free';
          const isSelected = selectedTier === tier;
          
          return (
            <button
              key={tier}
              onClick={() => !isLocked && onChange(tier)}
              className={`flex-1 p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-400/10'
                  : isLocked
                    ? 'border-white/10 bg-white/5 opacity-50'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
              }`}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                {tierIcons[tier]}
                <span className="text-sm font-medium">{config.name}</span>
                {isLocked && <Lock className="w-3 h-3" />}
              </div>
              <div className="text-xs text-white/50">
                {config.maxLength}s • {config.resolution}
              </div>
            </button>
          );
        })}
      </div>
      
      {selectedTier === 'free' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
          <p className="text-sm text-amber-300">
            <Zap className="w-4 h-4 inline mr-1" />
            {PRICING.free.gensPerMonth - freeUsed} free clips left this month
          </p>
        </div>
      )}
    </div>
  );
};

// ============ IMAGE UPLOADER COMPONENT ============
interface ImageUploaderProps {
  image: string | null;
  onUpload: (image: string) => void;
  onClear: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  image,
  onUpload,
  onClear
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  return (
    <div className="relative">
      {image ? (
        <div className="relative rounded-2xl overflow-hidden">
          <img src={image} alt="Upload" className="w-full h-48 object-cover" />
          <button
            onClick={onClear}
            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-32 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-white/40 hover:bg-white/5 transition-all"
        >
          <Upload className="w-6 h-6 text-white/40" />
          <span className="text-sm text-white/40">Upload image (optional)</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

// ============ VIDEO PLAYER COMPONENT ============
interface VideoPlayerProps {
  url: string;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  showControls?: boolean;
  autoPlay?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  aspectRatio = '9:16',
  showControls = true,
  autoPlay = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  const aspectClasses = {
    '9:16': 'aspect-[9/16]',
    '16:9': 'aspect-[16/9]',
    '1:1': 'aspect-square'
  };
  
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const isImage = url.includes('pollinations.ai') || url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  
  if (error || isImage) {
    return (
      <div className={`relative ${aspectClasses[aspectRatio]} bg-black/50 rounded-2xl overflow-hidden`}>
        <img 
          src={url} 
          alt="Generated" 
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`relative ${aspectClasses[aspectRatio]} bg-black rounded-2xl overflow-hidden`}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      )}
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-cover"
        loop
        playsInline
        autoPlay={autoPlay}
        muted={autoPlay}
        onLoadedData={() => setIsLoaded(true)}
        onError={() => setError(true)}
        onClick={handlePlayPause}
      />
      {showControls && isLoaded && (
        <button
          onClick={handlePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors group"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </div>
        </button>
      )}
    </div>
  );
};

// ============ LOADING OVERLAY COMPONENT ============
interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Generating your video...',
  progress
}) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center px-8">
        {/* CSS Loading Animation */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-cyan-400/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
          </div>
        </div>
        
        <p className="text-lg font-medium text-white mb-2">{message}</p>
        {progress !== undefined && (
          <div className="w-48 mx-auto bg-white/10 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <p className="text-sm text-white/50 mt-4">This may take 15-30 seconds</p>
      </div>
    </div>
  );
};

// ============ AD OVERLAY COMPONENT (App Store Compliant) ============
interface AdOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip?: () => void;
}

export const AdOverlay: React.FC<AdOverlayProps> = ({
  isVisible,
  onComplete,
  onSkip
}) => {
  const [countdown, setCountdown] = useState(5);
  
  useEffect(() => {
    if (isVisible && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      onComplete();
    }
  }, [isVisible, countdown, onComplete]);
  
  useEffect(() => {
    if (isVisible) setCountdown(5);
  }, [isVisible]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Simulated Ad - In production, replace with AdMob component */}
      <div className="w-full max-w-md aspect-video bg-gradient-to-br from-purple-900 to-cyan-900 rounded-xl flex flex-col items-center justify-center mb-6">
        <Crown className="w-16 h-16 text-amber-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Upgrade to Pro</h3>
        <p className="text-white/70 text-center px-4">
          Remove ads, get 300 clips/month, and unlock 30s videos!
        </p>
        <p className="text-2xl font-bold text-amber-400 mt-4">$9.99/month</p>
      </div>
      
      <div className="text-center">
        {countdown > 0 ? (
          <p className="text-white/70">
            Video ready in <span className="text-cyan-400 font-bold">{countdown}</span> seconds
          </p>
        ) : (
          <Button onClick={onComplete} variant="primary">
            Watch Your Video
          </Button>
        )}
      </div>
      
      {onSkip && countdown > 0 && (
        <button onClick={onSkip} className="absolute top-4 right-4 text-white/50 text-sm">
          Skip →
        </button>
      )}
    </div>
  );
};

// ============ WATERMARK COMPONENT ============
interface WatermarkProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  text?: string;
}

export const Watermark: React.FC<WatermarkProps> = ({
  position = 'bottom-right',
  text = '#MadeWithNeoClip'
}) => {
  const positionClasses = {
    'top-left': 'top-3 left-3',
    'top-right': 'top-3 right-3',
    'bottom-left': 'bottom-3 left-3',
    'bottom-right': 'bottom-3 right-3'
  };
  
  return (
    <div className={`absolute ${positionClasses[position]} z-10`}>
      <span className="text-xs font-medium text-white/60 bg-black/30 px-2 py-1 rounded-lg backdrop-blur-sm">
        {text}
      </span>
    </div>
  );
};

// ============ PRICING CARD COMPONENT ============
interface PricingCardProps {
  tier: UserTier;
  isCurrentTier: boolean;
  onSelect: () => void;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  tier,
  isCurrentTier,
  onSelect
}) => {
  const config = PRICING[tier];
  const isPopular = tier === 'basic';
  
  const features = tier === 'free' 
    ? ['10 clips/month', '10s max length', '768p resolution', 'Watermark', '5s ad after export']
    : tier === 'basic'
      ? ['120 clips/month', '15s max length', '1080p resolution', 'No watermark', 'No ads', 'Priority queue']
      : ['300 clips/month', '30s max length', '1080p resolution', 'No watermark', 'No ads', 'Veo toggle', 'Priority queue'];
  
  return (
    <div className={`relative p-6 rounded-2xl border ${
      isPopular 
        ? 'border-amber-400 bg-gradient-to-br from-amber-500/10 to-orange-500/10' 
        : 'border-white/20 bg-white/5'
    }`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-black px-3 py-1 rounded-full text-xs font-bold">
          MOST POPULAR
        </div>
      )}
      
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold mb-1">{config.name}</h3>
        <div className="text-3xl font-bold">
          {config.price === 0 ? 'Free' : `$${config.price}`}
          {config.price > 0 && <span className="text-sm font-normal text-white/50">/month</span>}
        </div>
      </div>
      
      <ul className="space-y-2 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-400" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      
      <Button
        onClick={onSelect}
        variant={isCurrentTier ? 'secondary' : isPopular ? 'premium' : 'primary'}
        className="w-full"
        disabled={isCurrentTier}
      >
        {isCurrentTier ? 'Current Plan' : tier === 'free' ? 'Start Free' : 'Upgrade'}
      </Button>
    </div>
  );
};

// ============ TOAST COMPONENT ============
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  isVisible,
  onClose
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);
  
  if (!isVisible) return null;
  
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-cyan-500'
  };
  
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slideDown">
      <div className={`${colors[type]} px-4 py-3 rounded-xl shadow-lg flex items-center gap-2`}>
        {type === 'success' && <Check className="w-5 h-5" />}
        {type === 'error' && <X className="w-5 h-5" />}
        {type === 'info' && <Sparkles className="w-5 h-5" />}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
};

// ============ REFERRAL CARD COMPONENT ============
interface ReferralCardProps {
  code: string;
  count: number;
  onShare: () => void;
  onCopy: () => void;
}

export const ReferralCard: React.FC<ReferralCardProps> = ({
  code,
  count,
  onShare,
  onCopy
}) => {
  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30">
      <div className="flex items-center gap-3 mb-4">
        <Gift className="w-8 h-8 text-purple-400" />
        <div>
          <h3 className="font-bold text-lg">Invite Friends</h3>
          <p className="text-sm text-white/60">Get 1 month Pro free for every 3 friends</p>
        </div>
      </div>
      
      <div className="bg-black/30 rounded-xl p-3 mb-4 flex items-center justify-between">
        <code className="text-cyan-400 font-mono">{code || 'Loading...'}</code>
        <button onClick={onCopy} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <Copy className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-white/60">Friends joined:</span>
        <span className="font-bold">{count}/3</span>
      </div>
      
      <div className="w-full bg-white/10 rounded-full h-2 mb-4">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all"
          style={{ width: `${(count / 3) * 100}%` }}
        />
      </div>
      
      <Button onClick={onShare} variant="secondary" className="w-full">
        <Share2 className="w-4 h-4" />
        Share Invite Link
      </Button>
    </div>
  );
};

// ============ PROMPT IDEAS COMPONENT ============
interface PromptIdeasProps {
  onSelect: (prompt: string) => void;
  ideas: Array<{ emoji: string; text: string }>;
}

export const PromptIdeas: React.FC<PromptIdeasProps> = ({ onSelect, ideas }) => {
  return (
    <div className="space-y-2">
      <p className="text-sm text-white/50 mb-2">Try these ideas:</p>
      <div className="flex flex-wrap gap-2">
        {ideas.slice(0, 5).map((idea, i) => (
          <button
            key={i}
            onClick={() => onSelect(idea.text)}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-all flex items-center gap-2"
          >
            <span>{idea.emoji}</span>
            <span className="truncate max-w-[150px]">{idea.text.split(',')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
