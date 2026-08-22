import React, { useState, useEffect } from 'react';
import { Clock, Moon, Sun, Sunrise, Sunset } from 'lucide-react';

interface LiveClockBadgeProps {
  variant?: 'header' | 'hud' | 'banner';
  className?: string;
  isDark?: boolean;
}

export default function LiveClockBadge({ variant = 'header', className = '', isDark = false }: LiveClockBadgeProps) {
  const [time, setTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(time.getMinutes()).padStart(2, '0');
  const secondsStr = String(time.getSeconds()).padStart(2, '0');

  // Anti-addiction & friendly contextual tips based on time
  const getContextualReminder = (h: number) => {
    if (h >= 23 || h < 5) {
      return {
        text: '夜已深，适度训练莫沉迷，早点休息',
        shortText: '深夜别沉迷·早点休息',
        icon: <Moon className="w-3.5 h-3.5 text-indigo-500" />
      };
    } else if (h >= 5 && h < 9) {
      return {
        text: '清晨律动，唤醒一天活力，适度为佳',
        shortText: '晨间活力·适度为佳',
        icon: <Sunrise className="w-3.5 h-3.5 text-amber-500" />
      };
    } else if (h >= 9 && h < 18) {
      return {
        text: '专注当下，合理安排节奏，健康自律',
        shortText: '健康自律·劳逸结合',
        icon: <Sun className="w-3.5 h-3.5 text-amber-500" />
      };
    } else {
      return {
        text: '傍晚时光，科学锻炼，掌握时间不过度',
        shortText: '适度训练·别过度沉迷',
        icon: <Sunset className="w-3.5 h-3.5 text-rose-500" />
      };
    }
  };

  const reminder = getContextualReminder(hours);

  if (variant === 'hud') {
    // Training / Cooldown / Preparing HUD Variant
    return (
      <div 
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${
          isDark ? 'bg-purple-950/60 border-purple-800/60 text-purple-200' : 'bg-black/10 border-black/10 text-current'
        } backdrop-blur-md border text-xs font-bold shadow-xs select-none ${className}`}
        title="当前系统真实时间（提醒合理把控训练时长，避免沉迷）"
      >
        <Clock className="w-3.5 h-3.5 opacity-75 animate-pulse" />
        <span className="tabular-nums font-black tracking-wider">
          {hoursStr}:{minutesStr}:{secondsStr}
        </span>
        <span className="opacity-40">|</span>
        <span className="text-[11px] opacity-85 font-medium flex items-center gap-1">
          {reminder.shortText}
        </span>
      </div>
    );
  }

  if (variant === 'banner') {
    // Large reminder banner on IDLE or CLIMAX screen
    return (
      <div className={`w-full px-4 py-2.5 rounded-2xl ${
        isDark ? 'bg-[#18122c] border-purple-800/40 text-purple-200' : 'bg-white/75 border-black/5 text-slate-800'
      } border backdrop-blur-sm shadow-xs flex items-center justify-between text-xs ${className}`}>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-500/10 text-rose-600'} flex items-center justify-center`}>
            {reminder.icon}
          </div>
          <span className={`font-bold ${isDark ? 'text-rose-100' : 'text-slate-700'}`}>{reminder.text}</span>
        </div>
        <div className={`flex items-center gap-1 font-black ${isDark ? 'text-rose-200 bg-purple-950/80 border border-purple-800/40' : 'text-slate-900 bg-black/5'} tabular-nums px-2.5 py-1 rounded-xl`}>
          <Clock className="w-3 h-3 opacity-60" />
          <span>{hoursStr}:{minutesStr}:{secondsStr}</span>
        </div>
      </div>
    );
  }

  // Default 'header' Variant (Compact & Elegant for Top Bar)
  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
        isDark ? 'bg-[#1c1533] border-purple-800/50 text-rose-200' : 'bg-white/80 border-black/5 text-slate-800'
      } border shadow-xs text-xs font-bold backdrop-blur-md select-none transition-all ${className}`}
      title="当前真实时间 · 理性训练，注意休息，别沉迷"
    >
      <div className={`flex items-center gap-1 ${isDark ? 'text-rose-300' : 'text-slate-700'}`}>
        <Clock className="w-3.5 h-3.5 text-rose-500" />
        <span className="tabular-nums font-black text-[13px] tracking-wide">
          {hoursStr}:{minutesStr}:{secondsStr}
        </span>
      </div>
      <span className={`hidden sm:inline-block text-[10px] font-bold ${
        isDark ? 'text-rose-300 bg-rose-500/20 border border-rose-500/30' : 'text-rose-700/80 bg-rose-500/10'
      } px-2 py-0.5 rounded-full`}>
        {reminder.shortText}
      </span>
    </div>
  );
}
