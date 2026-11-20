import React from 'react';

interface RhythmWaveformProps {
  bpm: number;
  pulse?: boolean;
  isCooldown?: boolean;
  isWarning?: boolean;
  progress?: number; // 0 to 1 remaining progress (optional; undefined for manual elapsed mode)
  isDark?: boolean;
  className?: string;
}

export default function RhythmWaveform({
  bpm,
  pulse = false,
  isCooldown = false,
  isWarning = false,
  progress,
  isDark = true,
  className = '',
}: RhythmWaveformProps) {
  const hz = isCooldown ? '0.25' : (bpm / 60).toFixed(2);
  const clampedProgress =
    typeof progress === 'number' ? Math.max(0, Math.min(1, progress)) : null;

  const beatIntervalSec = isCooldown ? 4 : Math.max(0.45, 60 / Math.max(20, bpm));

  const barFillClass = isCooldown
    ? 'bg-sky-400'
    : isWarning
      ? 'bg-amber-400'
      : isDark
        ? 'bg-rose-500'
        : 'bg-rose-600';

  const glowColor = isCooldown
    ? 'rgba(56, 189, 248, 0.55)'
    : isWarning
      ? 'rgba(245, 158, 11, 0.65)'
      : 'rgba(244, 63, 94, 0.55)';

  // 24 precision micro-ticks along the track for an optical instrument feel
  const TICK_COUNT = 24;

  return (
    <div
      className={`w-full max-w-md flex flex-col gap-2.5 select-none ${className}`}
      aria-label="微幅律动进度轨道"
    >
      {/* Micro-Rhythm Linear Progress Rail */}
      <div
        className={`relative w-full h-1.5 rounded-full overflow-hidden ${
          isDark ? 'bg-white/[0.08]' : 'bg-stone-900/[0.09]'
        }`}
      >
        {/* Stage Progress Fill (Compositor transform scaleX) */}
        {clampedProgress !== null ? (
          <div
            className={`absolute inset-0 origin-left transition-transform duration-500 ease-out ${barFillClass}`}
            style={{
              transform: `scaleX(${clampedProgress})`,
              opacity: pulse ? 1 : 0.82,
            }}
          />
        ) : (
          /* Indeterminate beat-synced kinetic beam for manual/open timer */
          <div
            className={`absolute inset-y-0 left-0 w-1/3 rounded-full ${barFillClass}`}
            style={{
              animation: `beat-travel ${beatIntervalSec * 2}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
            }}
          />
        )}

        {/* Beat-Synced Micro-Pulse Luminance Sweep (Compositor-only opacity + scaleX) */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-150 ease-out"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${glowColor} 50%, transparent 100%)`,
            opacity: pulse ? 0.95 : 0,
          }}
        />
      </div>

      {/* Subtle Precision Scale Ticks + Beat Indicator */}
      <div className="flex items-center justify-between w-full px-0.5">
        <div className="flex items-center gap-[3px] h-2.5" aria-hidden="true">
          {Array.from({ length: TICK_COUNT }).map((_, idx) => {
            const isMajor = idx % 6 === 0;
            const ratio = idx / (TICK_COUNT - 1);
            const isLit =
              clampedProgress !== null
                ? ratio <= clampedProgress
                : pulse && idx % 2 === 0;
            return (
              <span
                key={idx}
                className={`block w-[1.5px] rounded-full transition-opacity duration-150 ${
                  isMajor ? 'h-2.5' : 'h-1.5'
                } ${
                  isLit
                    ? isCooldown
                      ? 'bg-sky-400/90'
                      : isWarning
                        ? 'bg-amber-400/90'
                        : isDark
                          ? 'bg-rose-400/90'
                          : 'bg-rose-600/85'
                    : isDark
                      ? 'bg-white/[0.12]'
                      : 'bg-stone-900/[0.14]'
                }`}
                style={{
                  transform: pulse && isMajor ? 'scaleY(1.25)' : 'scaleY(1)',
                  transition: 'transform 140ms cubic-bezier(0.16, 1, 0.3, 1), opacity 140ms ease',
                }}
              />
            );
          })}
        </div>

        {/* Unboxed Monospace Telemetry */}
        <div
          className={`flex items-center gap-2 text-[11px] font-medium whitespace-nowrap ${
            isDark ? 'text-slate-400' : 'text-stone-500'
          }`}
        >
          <span>{isCooldown ? '呼吸周期' : isWarning ? '边缘临界' : '节拍频响'}</span>
          <span aria-hidden="true" className="opacity-40">
            ·
          </span>
          <span
            className={`font-numeric font-semibold ${
              isCooldown
                ? 'text-sky-400'
                : isWarning
                  ? 'text-amber-400'
                  : isDark
                    ? 'text-slate-200'
                    : 'text-stone-800'
            }`}
          >
            {hz} Hz
          </span>
        </div>
      </div>
    </div>
  );
}
