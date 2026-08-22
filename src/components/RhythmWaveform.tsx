import React from 'react';
import { Activity } from 'lucide-react';

interface RhythmWaveformProps {
  bpm: number;
  pulse?: boolean;
  isCooldown?: boolean;
  className?: string;
}

export default function RhythmWaveform({ 
  bpm, 
  pulse = false, 
  isCooldown = false, 
  className = '' 
}: RhythmWaveformProps) {
  // Calculate dynamic cycle duration in seconds based on bpm
  // At 60 bpm, 1 beat = 1s; at 120 bpm, 1 beat = 0.5s; at 30 bpm, 1 beat = 2s
  const beatDuration = 60 / Math.max(20, bpm);
  
  // Wave bar count
  const BAR_COUNT = 17;
  const centerIndex = Math.floor(BAR_COUNT / 2);

  // Normalized intensity ratio (0.25 to 1.0)
  const intensity = Math.min(1, Math.max(0.25, bpm / 120));

  return (
    <div 
      className={`w-full max-w-xs flex flex-col items-center select-none ${className}`}
      aria-label="节拍波形指示器"
    >
      {/* Waveform Bars Container */}
      <div className="relative w-full h-10 flex items-center justify-center gap-1 px-3 py-1 rounded-2xl bg-white/40 border border-black/5 shadow-xs backdrop-blur-xs">
        
        {/* Dynamic Wave Lines */}
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          // Distance from center (0 at center, higher towards edges)
          const distFromCenter = Math.abs(i - centerIndex);
          const normalizedDist = distFromCenter / centerIndex; // 0 to 1
          
          // Center bars have higher peak amplitude
          const baseHeightScale = Math.cos(normalizedDist * (Math.PI / 2.2)); // ~ 0.2 to 1.0
          const minHeight = isCooldown ? 4 : 4 + Math.round(intensity * 4);
          const maxHeight = isCooldown ? 14 : Math.round(14 + baseHeightScale * intensity * 20);

          // Staggered animation delay based on wave position
          const animDelay = (i * (beatDuration / BAR_COUNT)) * 0.75;
          const animDuration = isCooldown ? 2.5 : Math.max(0.35, beatDuration);

          // Pulse expansion effect on active beat
          const isCenter = distFromCenter <= 2;
          const pulseScale = pulse && isCenter ? 1.25 : 1;

          return (
            <div
              key={i}
              className="relative flex items-center justify-center h-full"
              style={{ width: '4px' }}
            >
              <div
                className={`w-full rounded-full transition-all ${
                  isCooldown
                    ? 'bg-cyan-500/60'
                    : distFromCenter <= 1
                      ? 'bg-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                      : distFromCenter <= 4
                        ? 'bg-rose-500/80'
                        : 'bg-rose-400/50'
                }`}
                style={{
                  height: `${Math.max(minHeight, Math.round(maxHeight * pulseScale))}px`,
                  minHeight: `${minHeight}px`,
                  animation: `rhythm-bar-wave ${animDuration}s ease-in-out infinite alternate`,
                  animationDelay: `${animDelay}s`,
                  transformOrigin: 'center',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Micro Status Label */}
      <div className="flex items-center justify-between w-full px-2 mt-1 text-[10px] font-bold opacity-60">
        <span className="flex items-center gap-1">
          <Activity className="w-2.5 h-2.5 text-rose-500 animate-pulse" />
          <span>{isCooldown ? '降温舒缓波' : '节奏频响'}</span>
        </span>
        <span className="tabular-nums font-black">
          {isCooldown ? '0.4 Hz' : `${(bpm / 60).toFixed(1)} Hz · ${bpm} BPM`}
        </span>
      </div>

      {/* Inlined CSS Animation Keyframe */}
      <style>{`
        @keyframes rhythm-bar-wave {
          0% {
            transform: scaleY(0.35);
            opacity: 0.55;
          }
          50% {
            transform: scaleY(0.95);
            opacity: 0.95;
          }
          100% {
            transform: scaleY(0.45);
            opacity: 0.65;
          }
        }
      `}</style>
    </div>
  );
}
