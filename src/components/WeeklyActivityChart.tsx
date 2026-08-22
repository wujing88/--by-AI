import React, { useState } from 'react';
import { DayActivity, UserStats } from '../types';
import { getWeeklyActivity } from '../utils/storage';
import { Flame } from 'lucide-react';

interface WeeklyActivityChartProps {
  userStats: UserStats;
  isDark?: boolean;
}

// 5-level pink color values for compact minimal pill blocks
const PINK_LEVELS: Record<number, { fill: string; stroke: string; desc: string }> = {
  0: {
    fill: 'rgba(244, 63, 94, 0.08)',
    stroke: 'rgba(244, 63, 94, 0.15)',
    desc: '未训练'
  },
  1: {
    fill: '#fbcfe8',
    stroke: '#f472b6',
    desc: '< 5分钟'
  },
  2: {
    fill: '#f472b6',
    stroke: '#ec4899',
    desc: '5-10分钟'
  },
  3: {
    fill: '#fb7185',
    stroke: '#e11d48',
    desc: '10-20分钟'
  },
  4: {
    fill: '#e11d48',
    stroke: '#be123c',
    desc: '20+分钟'
  }
};

export default function WeeklyActivityChart({ userStats, isDark = false }: WeeklyActivityChartProps) {
  const [hoveredDay, setHoveredDay] = useState<DayActivity | null>(null);
  const weeklyData: DayActivity[] = getWeeklyActivity(userStats);

  // Total minutes in past 7 days
  const totalWeeklySeconds = weeklyData.reduce((acc, d) => acc + d.seconds, 0);
  const totalWeeklyMinutes = Math.round(totalWeeklySeconds / 60);

  return (
    <div className={`w-full px-3.5 py-2.5 rounded-2xl ${
      isDark ? 'bg-[#1c1533] border-purple-800/40 text-purple-200' : 'bg-white/80 border-rose-100'
    } border shadow-xs backdrop-blur-md flex flex-col gap-1.5 text-left select-none`}>
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-black tracking-wide ${isDark ? 'text-rose-200' : 'text-slate-800'}`}>近 7 日律动频率</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-500/10 text-rose-700'
          }`}>
            周累计 {totalWeeklyMinutes}m
          </span>
        </div>

        {/* Mini Streak Indicator */}
        <div className={`flex items-center gap-0.5 text-[10px] font-black ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
          <Flame className="w-3 h-3 text-orange-500 animate-pulse" />
          <span>连练 {userStats.streakDays || (totalWeeklySeconds > 0 ? 1 : 0)} 天</span>
        </div>
      </div>

      {/* Ultra-compact SVG Bar/Pill Heatmap */}
      <div className="relative">
        <svg 
          viewBox="0 0 280 44" 
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label="近7日训练频率简图"
        >
          {weeklyData.map((day, idx) => {
            const blockWidth = 28;
            const blockHeight = 22;
            const gap = 10;
            const startX = 8 + idx * (blockWidth + gap);
            const startY = 3;
            const cfg = PINK_LEVELS[day.level];
            const isHovered = hoveredDay?.date === day.date;

            return (
              <g 
                key={day.date}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                onClick={() => setHoveredDay(day)}
              >
                {/* Active indicator dot for Today */}
                {day.isToday && (
                  <circle
                    cx={startX + blockWidth / 2}
                    cy={startY - 1.5}
                    r="1.8"
                    fill="#f43f5e"
                  />
                )}

                {/* Simplified Rounded Capsule */}
                <rect
                  x={startX}
                  y={startY}
                  width={blockWidth}
                  height={blockHeight}
                  rx="6"
                  fill={cfg.fill}
                  stroke={day.isToday ? '#f43f5e' : cfg.stroke}
                  strokeWidth={day.isToday ? 1.5 : (isHovered ? 1.5 : 0.8)}
                  strokeDasharray={day.isToday && day.seconds === 0 ? '3 1.5' : 'none'}
                  style={{
                    transform: isHovered ? 'scale(1.08) translateY(-1px)' : 'scale(1)',
                    transformOrigin: `${startX + blockWidth / 2}px ${startY + blockHeight / 2}px`,
                    transition: 'transform 0.15s ease'
                  }}
                />

                {/* Compact Min label or dot inside capsule */}
                {day.seconds > 0 ? (
                  <text
                    x={startX + blockWidth / 2}
                    y={startY + 12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`font-black ${day.level >= 3 ? 'fill-white' : 'fill-rose-950'} text-[9px] tabular-nums`}
                  >
                    {Math.max(1, Math.round(day.seconds / 60))}
                    <tspan className="text-[6.5px]">m</tspan>
                  </text>
                ) : (
                  <circle
                    cx={startX + blockWidth / 2}
                    cy={startY + 11}
                    r="1.5"
                    fill="rgba(244, 63, 94, 0.25)"
                  />
                )}

                {/* Simplified Day of Week Below */}
                <text
                  x={startX + blockWidth / 2}
                  y={startY + blockHeight + 11}
                  textAnchor="middle"
                  className={`text-[8.5px] font-bold ${
                    day.isToday ? 'fill-rose-400 font-black' : (isDark ? 'fill-purple-300/70' : 'fill-slate-500')
                  }`}
                >
                  {day.dayName === '今天' ? '今' : day.dayName.replace('周', '')}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Minimal Micro Hover Tip */}
        {hoveredDay && (
          <div className={`mt-1 px-2 py-1 rounded-lg ${
            isDark ? 'bg-[#251d42] border-purple-700/50 text-purple-200' : 'bg-rose-50 border-rose-200/70 text-slate-700'
          } border text-[10px] flex items-center justify-between animate-fadeIn`}>
            <span className="font-bold">
              {hoveredDay.dateLabel} ({hoveredDay.dayName}) · {PINK_LEVELS[hoveredDay.level].desc}
            </span>
            <span className={`font-black ${isDark ? 'text-rose-300' : 'text-rose-600'} tabular-nums`}>
              {hoveredDay.seconds > 0 ? `${Math.round(hoveredDay.seconds / 60)} 分钟` : '0 分钟'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
