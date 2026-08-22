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
  { id: 'impact', name: '肉体撞击', desc: '沉闷肉感 · 强力撞击的低频肉感共鸣', tag: '撞击', emoji: '🍑' },
  { id: 'moist', name: '水声黏腻', desc: '水润包裹 · 深入抽送的湿润汁水声', tag: '水润', emoji: '💦' },
  { id: 'slap', name: '肌肤拍打', desc: '清脆响亮 · 紧致肌肤相撞的拍击声', tag: '拍打', emoji: '✋' },
  { id: 'breath', name: '温热喘息', desc: '耳边呢喃 · 贴近颈侧的温热低吟喘息', tag: '喘息', emoji: '🫦' },
  { id: 'spring', name: '床幔轻晃', desc: '规律轻颤 · 随动作起伏的弹性金属微鸣', tag: '床震', emoji: '🛏️' },
  { id: 'heartbeat', name: '狂热心跳', desc: '贴胸共鸣 · 意乱情迷时的剧烈狂跳', tag: '心跳', emoji: '💓' }
];

export const MANUAL_PRESETS: { bpm: BpmState; name: string; desc: string; duration: number; timeText: string }[] = [
  { bpm: 30, name: '慢速试探', desc: '缓慢进入 · 适应节奏', duration: 180, timeText: '3 分钟' },
  { bpm: 60, name: '稳定匀速', desc: '均匀律动 · 渐入佳境', duration: 240, timeText: '4 分钟' },
  { bpm: 90, name: '深入加速', desc: '有力挺进 · 紧致包裹', duration: 120, timeText: '2 分钟' },
  { bpm: 120, name: '极致冲刺', desc: '全速前行 · 释放渴望', duration: 60, timeText: '1 分钟' }
];

export const PHRASES = {
  30: [
    "缓慢进入，感受边缘",
    "深呼吸，控制节奏",
    "只用龟头浅浅进出",
    "放松身体，不要着急",
    "感受每一次摩擦的细节",
    "闭上眼睛，专注触感",
    "把速度降到最慢",
    "体验若即若离的快感"
  ],
  60: [
    "稳定节奏，均匀抽插",
    "加快一点，深入一半",
    "保持这个频率，不要停",
    "感受包裹感越来越强",
    "跟着节拍，一下一下",
    "腰部发力，保持专注",
    "积累快感，但别越界",
    "想象正在不断深入"
  ],
  90: [
    "加快频率，保持力度",
    "有节奏地挺进",
    "每次都顶到最深处",
    "感受紧致的包裹",
    "稳住呼吸，不要乱",
    "持续输出，享受快感",
    "保持这个绝佳的节奏"
  ],
  120: [
    "全速冲刺！",
    "干到底部！",
    "狂风骤雨！",
    "不要保留，全力以赴！",
    "最快速度抽插！",
    "顶到最深处！",
    "把所有的忍耐都释放出来！",
    "冲！冲！冲！"
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
  level: 0 | 1 | 2 | 3 | 4; // Intensity level for pink heatmap
  isToday: boolean;
}

export const THEMES: Record<ThemeType, any> = {
  peach: {
    appBg: 'bg-rose-50',
    cardBg: 'bg-white/80 backdrop-blur-xl',
    text: 'text-rose-900',
    accent: 'text-rose-500',
    progress: 'bg-rose-300',
    border: 'border-rose-100',
    shadow: 'shadow-[0_10px_40px_rgba(251,113,133,0.15)]',
    glow: 'rgba(251,113,133,0.2)',
    buttonBg: 'bg-white text-rose-500 border border-rose-100',
    buttonHover: 'hover:bg-rose-50 hover:shadow-md hover:-translate-y-0.5',
    particleColors: ['#fb7185', '#f43f5e', '#ffe4e6', '#fda4af']
  },
  mint: {
    appBg: 'bg-teal-50',
    cardBg: 'bg-white/80 backdrop-blur-xl',
    text: 'text-teal-900',
    accent: 'text-teal-500',
    progress: 'bg-teal-300',
    border: 'border-teal-100',
    shadow: 'shadow-[0_10px_40px_rgba(45,212,191,0.15)]',
    glow: 'rgba(45,212,191,0.2)',
    buttonBg: 'bg-white text-teal-600 border border-teal-100',
    buttonHover: 'hover:bg-teal-50 hover:shadow-md hover:-translate-y-0.5',
    particleColors: ['#2dd4bf', '#14b8a6', '#ccfbf1', '#99f6e4']
  },
  taro: {
    appBg: 'bg-purple-50',
    cardBg: 'bg-white/80 backdrop-blur-xl',
    text: 'text-purple-900',
    accent: 'text-purple-500',
    progress: 'bg-purple-300',
    border: 'border-purple-100',
    shadow: 'shadow-[0_10px_40px_rgba(168,85,247,0.15)]',
    glow: 'rgba(168,85,247,0.2)',
    buttonBg: 'bg-white text-purple-600 border border-purple-100',
    buttonHover: 'hover:bg-purple-50 hover:shadow-md hover:-translate-y-0.5',
    particleColors: ['#a855f7', '#9333ea', '#f3e8ff', '#e9d5ff']
  },
  cheese: {
    appBg: 'bg-amber-50',
    cardBg: 'bg-white/80 backdrop-blur-xl',
    text: 'text-amber-900',
    accent: 'text-amber-500',
    progress: 'bg-amber-300',
    border: 'border-amber-100',
    shadow: 'shadow-[0_10px_40px_rgba(245,158,11,0.15)]',
    glow: 'rgba(245,158,11,0.2)',
    buttonBg: 'bg-white text-amber-600 border border-amber-100',
    buttonHover: 'hover:bg-amber-50 hover:shadow-md hover:-translate-y-0.5',
    particleColors: ['#f59e0b', '#d97706', '#fef3c7', '#fde68a']
  },
  midnight: {
    appBg: 'bg-[#0b0813]',
    cardBg: 'bg-[#151026]/90 backdrop-blur-2xl',
    text: 'text-rose-100',
    accent: 'text-rose-400',
    progress: 'bg-gradient-to-r from-purple-500 to-rose-500',
    border: 'border-purple-900/40',
    shadow: 'shadow-[0_15px_50px_rgba(0,0,0,0.6)]',
    glow: 'rgba(217,70,239,0.08)',
    buttonBg: 'bg-[#211938] text-rose-200 border border-purple-800/50',
    buttonHover: 'hover:bg-[#2c224a] hover:shadow-md hover:-translate-y-0.5',
    particleColors: ['#f43f5e', '#d946ef', '#a855f7', '#6366f1'],
    isDark: true
  }
};
