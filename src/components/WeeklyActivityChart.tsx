import React, { useState } from 'react';
import { DayActivity, UserStats } from '../types';
import { getWeeklyActivity } from '../utils/storage';

interface WeeklyActivityChartProps {
  userStats: UserStats;
  isDark?: boolean;
}

const DARK_LEVELS: Record<number, { fill: string; border: string; label: string }> = {
  0: { fill: 'rgba(255,255,255,0.035)', border: 'rgba(255,255,255,0.07)', label: '未训练' },
  1: { fill: 'rgba(244,63,94,0.22)', border: 'rgba(244,63,94,0.38)', label: '< 5 分钟' },
  2: { fill: 'rgba(244,63,94,0.42)', border: 'rgba(244,63,94,0.58)', label: '5–10 分钟' },
  3: { fill: 'rgba(244,63,94,0.68)', border: 'rgba(251,113,133,0.75)', label: '10–20 分钟' },
  4: { fill: '#F43F5E', border: '#FDA4AF', label: '20+ 分钟' },
};

const LIGHT_LEVELS: Record<number, { fill: string; border: string; label: string }> = {
  0: { fill: '#F3F1EF', border: '#E5E1DC', label: '未训练' },
  1: { fill: '#FFE4E6', border: '#FECDD3', label: '< 5 分钟' },
  2: { fill: '#FDA4AF', border: '#FB7185', label: '5–10 分钟' },
  3: { fill: '#F43F5E', border: '#E11D48', label: '10–20 分钟' },
  4: { fill: '#BE123C', border: '#9F1239', label: '20+ 分钟' },
};

export default function WeeklyActivityChart({
  userStats,
  isDark = true,
}: WeeklyActivityChartProps) {
  const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);
  const weeklyData: DayActivity[] = getWeeklyActivity(userStats);

  const totalWeeklySeconds = weeklyData.reduce((acc, d) => acc + d.seconds, 0);
  const totalWeeklyMinutes = Math.round(totalWeeklySeconds / 60);
  const activeDaysCount = weeklyData.filter((d) => d.seconds > 0).length;
  const streak = userStats.streakDays || (totalWeeklySeconds > 0 ? 1 : 0);
  const levels = isDark ? DARK_LEVELS : LIGHT_LEVELS;

  return (
    <div
      className={`w-full p-4 rounded-2xl border flex flex-col gap-3 text-left select-none ${
        isDark
          ? 'bg-[#11131B] border-white/[0.08] text-slate-100'
          : 'bg-white border-stone-200/90 text-stone-900'
      }`}
    >
      {/* Clean Unboxed Header Metadata */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold">近 7 日频率</span>
          <span aria-hidden="true" className="opacity-35">
            ·
          </span>
          <span className={`font-numeric ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
            周计 {totalWeeklyMinutes}m
          </span>
        </div>

        <span
          className={`font-numeric text-xs font-medium shrink-0 ${
            streak > 0
              ? isDark
                ? 'text-rose-400'
                : 'text-rose-600'
              : isDark
                ? 'text-slate-500'
                : 'text-stone-400'
          }`}
        >
          连续 {streak} 天
        </span>
      </div>

      {/* 7-Column Responsive Interactive Activity Matrix */}
      <div
        className="grid grid-cols-7 gap-2 w-full"
        role="group"
        aria-label="近7日训练频率分布"
      >
        {weeklyData.map((day) => {
          const cfg = levels[day.level];
          const isSelected = selectedDay?.date === day.date;
          const mins = Math.max(1, Math.round(day.seconds / 60));
          const textContrast =
            day.level >= 3
              ? 'text-white'
              : isDark
                ? 'text-slate-200'
                : 'text-stone-800';

          return (
            <button
              key={day.date}
              type="button"
              onMouseEnter={() => setSelectedDay(day)}
              onMouseLeave={() => setSelectedDay(null)}
              onFocus={() => setSelectedDay(day)}
              onBlur={() => setSelectedDay(null)}
              onClick={() => setSelectedDay((prev) => (prev?.date === day.date ? null : day))}
              className="flex flex-col items-center gap-1.5 group focus-visible:outline-2 focus-visible:outline-rose-500 rounded-lg"
              aria-label={`${day.dateLabel} ${day.dayName}，训练 ${day.seconds > 0 ? `${mins} 分钟` : '0 分钟'}`}
            >
              <div
                className="w-full h-9 rounded-lg flex items-center justify-center transition-transform duration-150 group-hover:-translate-y-0.5"
                style={{
                  backgroundColor: cfg.fill,
                  border: `1px solid ${day.isToday ? (isDark ? '#F43F5E' : '#E11D48') : cfg.border}`,
                  boxShadow: isSelected
                    ? `0 0 0 1px ${isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.35)'}`
                    : 'none',
                }}
              >
                {day.seconds > 0 ? (
                  <span className={`font-numeric text-[11px] font-semibold ${textContrast}`}>
                    {mins}
                  </span>
                ) : (
                  <span
                    className={`w-1 h-1 rounded-full ${
                      isDark ? 'bg-white/[0.18]' : 'bg-stone-400/50'
                    }`}
                  />
                )}
              </div>
              <span
                className={`text-[11px] leading-none ${
                  day.isToday
                    ? isDark
                      ? 'text-rose-400 font-semibold'
                      : 'text-rose-600 font-semibold'
                    : isDark
                      ? 'text-slate-400'
                      : 'text-stone-500'
                }`}
              >
                {day.dayName === '今天' ? '今' : day.dayName.replace('周', '')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Fixed-Height Detail Strip (Zero Layout Shift) */}
      <div
        className={`pt-2.5 border-t flex items-center justify-between text-[11px] min-h-[28px] ${
          isDark ? 'border-white/[0.06] text-slate-400' : 'border-stone-200/80 text-stone-500'
        }`}
      >
        {selectedDay ? (
          <>
            <span>
              {selectedDay.dateLabel} · {selectedDay.dayName} · {levels[selectedDay.level].label}
            </span>
            <span
              className={`font-numeric font-semibold ${
                isDark ? 'text-slate-200' : 'text-stone-900'
              }`}
            >
              {selectedDay.seconds > 0
                ? `${Math.max(1, Math.round(selectedDay.seconds / 60))} 分钟`
                : '0 分钟'}
            </span>
          </>
        ) : (
          <>
            <span>近 7 天活跃 {activeDaysCount} 日</span>
            <span className="font-numeric">点击日期查看详情</span>
          </>
        )}
      </div>
    </div>
  );
}
