export type AppState = 'IDLE' | 'PREPARING' | 'RUNNING' | 'COOLDOWN' | 'CLIMAX';
export type BpmState = 30 | 60 | 90 | 120;
export type ThemeType = 'peach' | 'mint' | 'taro' | 'cheese' | 'midnight';
export type PlayMode = 'MANUAL' | 'RANDOM' | 'AUTO';
export type SoundType = 'impact' | 'moist' | 'slap' | 'breath' | 'spring' | 'heartbeat';

export interface SoundPreset {
  id: SoundType;
  name: string;
  desc: string;
  tag: string;
  emoji: string;
}

export const SOUND_PRESETS: SoundPreset[] = [
  { id: 'impact', name: '低频撞击', desc: '沉稳低频肉感共鸣，节拍边界清晰', tag: '低频', emoji: '●' },
  { id: 'moist', name: '水润律动', desc: '柔和中频包裹质感，过渡顺滑细腻', tag: '柔润', emoji: '●' },
  { id: 'slap', name: '清脆拍击', desc: '短促瞬态弹性反馈，定位精准干脆', tag: '瞬态', emoji: '●' },
  { id: 'breath', name: '温热气息', desc: '低噪点呼气共振声，适合舒缓专注', tag: '气息', emoji: '●' },
  { id: 'spring', name: '弹性轻颤', desc: '轻微机械回弹韵律，周期感鲜明', tag: '回弹', emoji: '●' },
  { id: 'heartbeat', name: '深沉心跳', desc: '双拍超低频脉冲，契合沉浸节律', tag: '脉冲', emoji: '●' }
];

export const MANUAL_PRESETS: { bpm: BpmState; name: string; desc: string; duration: number; timeText: string }[] = [
  { bpm: 30, name: '慢速试探', desc: '缓慢进入 · 适应节奏', duration: 180, timeText: '3 分钟' },
  { bpm: 60, name: '稳定匀速', desc: '均匀律动 · 渐入佳境', duration: 240, timeText: '4 分钟' },
  { bpm: 90, name: '深入加速', desc: '有力挺进 · 保持稳定', duration: 120, timeText: '2 分钟' },
  { bpm: 120, name: '极致冲刺', desc: '全速节拍 · 边缘掌控', duration: 60, timeText: '1 分钟' }
];

export const PHRASES: Record<BpmState, string[]> = {
  30: [
    '缓慢进入，感受边缘边界',
    '深呼吸，将主动权留在节拍内',
    '放慢幅度，细致感知每次触感',
    '放松肩颈与腰腹，保持平稳',
    '专注呼吸周期，不必急于加速',
    '稳定在最慢频率，建立耐受基准'
  ],
  60: [
    '稳定频率，保持均匀节律',
    '稳步推进，呼吸与拍点同步',
    '维持当前速率，不要抢拍',
    '腰腹发力均衡，保持专注度',
    '逐步累积感受，但稳住阈值边界',
    '跟随每一下节拍，平稳延续'
  ],
  90: [
    '提升频率，同时稳住呼吸深度',
    '保持有力而稳定的节律输出',
    '注意控制肌肉张力，避免急促',
    '保持专注，在高频中维持冷静',
    '紧跟拍点，维持节奏稳定性',
    '持续稳定输出，掌控当前区间'
  ],
  120: [
    '高频冲刺，紧盯倒计时边界',
    '全速跟随节拍，稳住核心呼吸',
    '高强度阶段，专注掌控临界点',
    '保持节奏不散乱，坚持到底',
    '释放耐力潜能，锁定最后区间',
    '全速维持，准备迎接节点切换'
  ]
};

export interface UserStats {
  version: number;
  totalSeconds: number;
  totalCycles: number;
  completedSessions: number;
  dailyActivity: Record<string, number>; // YYYY-MM-DD -> seconds trained
  lastActiveDate?: string;
  streakDays?: number;
}

export interface DayActivity {
  date: string; // YYYY-MM-DD
  dayName: string; // e.g. "周一", "今天"
  dateLabel: string; // e.g. "8/22"
  seconds: number;
  minutes: number;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
}

export interface ThemeTokens {
  id: ThemeType;
  label: string;
  shortDesc: string;
  isDark: boolean;
  metaColor: string;
  canvasBg: string;
  surfaceBg: string;
  surfaceElevated: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentText: string;
  accentBg: string;
  accentBgHover: string;
  accentSoft: string;
  accentBorder: string;
  accentHex: string;
  progressTrack: string;
  progressFill: string;
  buttonSecondary: string;
  buttonSecondaryHover: string;
  particleColors: string[];
  swatchBg: string;
  swatchDot: string;
}

export const THEMES: Record<ThemeType, ThemeTokens> = {
  midnight: {
    id: 'midnight',
    label: '深空暗夜',
    shortDesc: '低噪点曜石微光（默认）',
    isDark: true,
    metaColor: '#090A0F',
    canvasBg: 'bg-[#090A0F]',
    surfaceBg: 'bg-[#11131B]',
    surfaceElevated: 'bg-[#171A24]',
    surfaceHover: 'hover:bg-[#1B1F2B]',
    border: 'border-white/[0.08]',
    borderStrong: 'border-white/[0.15]',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-400',
    accentText: 'text-rose-400',
    accentBg: 'bg-rose-500',
    accentBgHover: 'hover:bg-rose-400',
    accentSoft: 'bg-rose-500/12',
    accentBorder: 'border-rose-500/35',
    accentHex: '#F43F5E',
    progressTrack: 'bg-white/[0.08]',
    progressFill: 'bg-rose-500',
    buttonSecondary: 'bg-[#171A24] text-slate-200 border border-white/[0.09]',
    buttonSecondaryHover: 'hover:bg-[#1E2230] hover:border-white/[0.16]',
    particleColors: ['#F43F5E', '#FB7185', '#FDA4AF', '#38BDF8'],
    swatchBg: 'bg-[#090A0F] border-white/15 text-slate-100',
    swatchDot: 'bg-rose-500'
  },
  peach: {
    id: 'peach',
    label: '暖瓷绯红',
    shortDesc: '极简高对比暖灰白',
    isDark: false,
    metaColor: '#F8F7F6',
    canvasBg: 'bg-[#F8F7F6]',
    surfaceBg: 'bg-white',
    surfaceElevated: 'bg-[#F3F1EF]',
    surfaceHover: 'hover:bg-[#EFECE9]',
    border: 'border-stone-200/90',
    borderStrong: 'border-stone-300',
    textPrimary: 'text-stone-900',
    textSecondary: 'text-stone-700',
    textMuted: 'text-stone-500',
    accentText: 'text-rose-600',
    accentBg: 'bg-rose-600',
    accentBgHover: 'hover:bg-rose-700',
    accentSoft: 'bg-rose-600/10',
    accentBorder: 'border-rose-600/30',
    accentHex: '#E11D48',
    progressTrack: 'bg-stone-200',
    progressFill: 'bg-rose-600',
    buttonSecondary: 'bg-white text-stone-800 border border-stone-200',
    buttonSecondaryHover: 'hover:bg-stone-100 hover:border-stone-300',
    particleColors: ['#E11D48', '#FB7185', '#F43F5E', '#FDA4AF'],
    swatchBg: 'bg-[#F8F7F6] border-stone-300 text-stone-900',
    swatchDot: 'bg-rose-600'
  },
  mint: {
    id: 'mint',
    label: '冷雾青松',
    shortDesc: '清爽冷灰与松青强调',
    isDark: false,
    metaColor: '#F6F8F8',
    canvasBg: 'bg-[#F6F8F8]',
    surfaceBg: 'bg-white',
    surfaceElevated: 'bg-[#EEF2F2]',
    surfaceHover: 'hover:bg-[#E7ECEC]',
    border: 'border-slate-200/90',
    borderStrong: 'border-slate-300',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-700',
    textMuted: 'text-slate-500',
    accentText: 'text-teal-700',
    accentBg: 'bg-teal-600',
    accentBgHover: 'hover:bg-teal-700',
    accentSoft: 'bg-teal-600/10',
    accentBorder: 'border-teal-600/30',
    accentHex: '#0D9488',
    progressTrack: 'bg-slate-200',
    progressFill: 'bg-teal-600',
    buttonSecondary: 'bg-white text-slate-800 border border-slate-200',
    buttonSecondaryHover: 'hover:bg-slate-100 hover:border-slate-300',
    particleColors: ['#0D9488', '#14B8A6', '#2DD4BF', '#5EEAD4'],
    swatchBg: 'bg-[#F6F8F8] border-slate-300 text-slate-900',
    swatchDot: 'bg-teal-600'
  },
  taro: {
    id: 'taro',
    label: '静谧暮紫',
    shortDesc: '中性冷白与暮靛强调',
    isDark: false,
    metaColor: '#F7F7FA',
    canvasBg: 'bg-[#F7F7FA]',
    surfaceBg: 'bg-white',
    surfaceElevated: 'bg-[#EFEFF5]',
    surfaceHover: 'hover:bg-[#E8E8F0]',
    border: 'border-zinc-200/90',
    borderStrong: 'border-zinc-300',
    textPrimary: 'text-zinc-900',
    textSecondary: 'text-zinc-700',
    textMuted: 'text-zinc-500',
    accentText: 'text-indigo-600',
    accentBg: 'bg-indigo-600',
    accentBgHover: 'hover:bg-indigo-700',
    accentSoft: 'bg-indigo-600/10',
    accentBorder: 'border-indigo-600/30',
    accentHex: '#4F46E5',
    progressTrack: 'bg-zinc-200',
    progressFill: 'bg-indigo-600',
    buttonSecondary: 'bg-white text-zinc-800 border border-zinc-200',
    buttonSecondaryHover: 'hover:bg-zinc-100 hover:border-zinc-300',
    particleColors: ['#4F46E5', '#6366F1', '#818CF8', '#A5B4FC'],
    swatchBg: 'bg-[#F7F7FA] border-zinc-300 text-zinc-900',
    swatchDot: 'bg-indigo-600'
  },
  cheese: {
    id: 'cheese',
    label: '暖珀纸白',
    shortDesc: '柔和纸白与琥珀刻度',
    isDark: false,
    metaColor: '#F9F8F5',
    canvasBg: 'bg-[#F9F8F5]',
    surfaceBg: 'bg-white',
    surfaceElevated: 'bg-[#F3F0E9]',
    surfaceHover: 'hover:bg-[#ECE8DF]',
    border: 'border-stone-200/90',
    borderStrong: 'border-stone-300',
    textPrimary: 'text-stone-900',
    textSecondary: 'text-stone-700',
    textMuted: 'text-stone-500',
    accentText: 'text-amber-700',
    accentBg: 'bg-amber-600',
    accentBgHover: 'hover:bg-amber-700',
    accentSoft: 'bg-amber-600/10',
    accentBorder: 'border-amber-600/30',
    accentHex: '#D97706',
    progressTrack: 'bg-stone-200',
    progressFill: 'bg-amber-600',
    buttonSecondary: 'bg-white text-stone-800 border border-stone-200',
    buttonSecondaryHover: 'hover:bg-stone-100 hover:border-stone-300',
    particleColors: ['#D97706', '#F59E0B', '#FBBF24', '#FDE68A'],
    swatchBg: 'bg-[#F9F8F5] border-stone-300 text-stone-900',
    swatchDot: 'bg-amber-600'
  }
};
