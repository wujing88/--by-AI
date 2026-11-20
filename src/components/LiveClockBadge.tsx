import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface LiveClockBadgeProps {
  variant?: 'header' | 'hud' | 'banner';
  className?: string;
  isDark?: boolean;
}

export default function LiveClockBadge({
  variant = 'header',
  className = '',
  isDark = true,
}: LiveClockBadgeProps) {
  const [time, setTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(time.getMinutes()).padStart(2, '0');
  const secondsStr = String(time.getSeconds()).padStart(2, '0');

  const getContextualReminder = (h: number) => {
    if (h >= 23 || h < 5) {
      return {
        text: '深夜时段，建议控制单次训练时长，保持充足睡眠',
        shortText: '深夜 · 适度控制',
      };
    }
    if (h >= 5 && h < 9) {
      return {
        text: '晨间时段，循序渐进唤醒节律，保持呼吸平稳',
        shortText: '晨间 · 规律节奏',
      };
    }
    if (h >= 9 && h < 18) {
      return {
        text: '日间时段，合理分配训练与休整，注重专注质量',
        shortText: '日间 · 专注自律',
      };
    }
    return {
      text: '晚间时段，按计划完成阶梯循环，避免过度疲劳',
      shortText: '晚间 · 合理节制',
    };
  };

  const reminder = getContextualReminder(hours);

  if (variant === 'hud') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap select-none ${
          isDark ? 'text-slate-400' : 'text-stone-500'
        } ${className}`}
        title="当前本地时间"
      >
        <span className={`font-numeric font-medium ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>
          {hoursStr}:{minutesStr}:{secondsStr}
        </span>
        <span aria-hidden="true" className="hidden sm:inline opacity-40">
          ·
        </span>
        <span className="hidden sm:inline">{reminder.shortText}</span>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        className={`w-full py-2.5 px-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
          isDark
            ? 'bg-[#11131B] border-white/[0.07] text-slate-300'
            : 'bg-white border-stone-200/90 text-stone-600'
        } ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-slate-400' : 'text-stone-400'}`} />
          <span className="truncate">{reminder.text}</span>
        </div>
        <span
          className={`font-numeric text-xs font-semibold shrink-0 ${
            isDark ? 'text-slate-200' : 'text-stone-900'
          }`}
        >
          {hoursStr}:{minutesStr}:{secondsStr}
        </span>
      </div>
    );
  }

  // Header variant: crisp unboxed monospace clock, single-line flex-nowrap friendly
  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap select-none ${
        isDark ? 'text-slate-300' : 'text-stone-700'
      } ${className}`}
      title={`当前时间 ${hoursStr}:${minutesStr}:${secondsStr} · ${reminder.shortText}`}
    >
      <span className="font-numeric font-semibold tracking-tight">
        {hoursStr}:{minutesStr}
        <span className="hidden sm:inline opacity-70">:{secondsStr}</span>
      </span>
    </div>
  );
}
