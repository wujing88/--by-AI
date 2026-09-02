import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Play, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Wind, 
  Info, 
  Settings2, 
  Home, 
  X, 
  Music, 
  Palette, 
  Check, 
  Shuffle, 
  TrendingUp,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Flame,
  Zap,
  Target,
  Award,
  Trophy,
  Clock,
  FastForward,
  Heart,
  Smartphone,
  BarChart3,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Monitor,
  Sliders,
  SlidersHorizontal,
  Gauge
} from 'lucide-react';
import { metronome } from './utils/audio';
import ParticleEffect from './components/ParticleEffect';
import WeeklyActivityChart from './components/WeeklyActivityChart';
import LiveClockBadge from './components/LiveClockBadge';
import OnlineUserBadge from './components/OnlineUserBadge';
import RhythmWaveform from './components/RhythmWaveform';
import { realtimePresence } from './utils/realtime';
import { 
  AppState, 
  BpmState, 
  ThemeType, 
  THEMES, 
  PHRASES, 
  PlayMode, 
  SoundType, 
  SOUND_PRESETS,
  UserStats 
} from './types';
import {
  getUserStats,
  saveUserStats,
  recordTrainingSeconds,
  recordCycle,
  recordSession,
  getStoredMuted,
  setStoredMuted,
  getStoredTheme,
  setStoredTheme,
  getStoredFollowSystemTheme,
  setStoredFollowSystemTheme,
  getStoredFavoriteLightTheme,
  setStoredFavoriteLightTheme,
  getStoredSoundType,
  setStoredSoundType,
  getStoredAutoCycles,
  setStoredAutoCycles
} from './utils/storage';

export default function App() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [playMode, setPlayMode] = useState<PlayMode>('AUTO');
  const [bpm, setBpm] = useState<BpmState>(30);
  const [prevBpm, setPrevBpm] = useState<BpmState>(30);
  const [theme, setTheme] = useState<ThemeType>(() => getStoredTheme());
  const [followSystemTheme, setFollowSystemTheme] = useState<boolean>(() => getStoredFollowSystemTheme(true));
  const [favoriteLightTheme, setFavoriteLightTheme] = useState<ThemeType>(() => getStoredFavoriteLightTheme('peach'));
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [soundType, setSoundType] = useState<SoundType>(() => getStoredSoundType());
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(1);
  const [phrase, setPhrase] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => getStoredMuted());
  const [showParticles, setShowParticles] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'sound' | 'theme'>('sound');
  const [pulse, setPulse] = useState(false);
  const [isPressing, setIsPressing] = useState(false);

  // Progressive Cycle Settings
  const [autoCycles, setAutoCycles] = useState<number>(() => getStoredAutoCycles()); // Default recommended 2 cycles
  const [currentCycle, setCurrentCycle] = useState<number>(1);
  const [showCycleWhy, setShowCycleWhy] = useState<boolean>(false);

  // Preparation Countdown State
  const [targetMode, setTargetMode] = useState<PlayMode>('AUTO');
  const [prepCount, setPrepCount] = useState<number>(3);

  // User Cumulative History Stats (Loaded & Migrated via storage.ts)
  const [userStats, setUserStats] = useState<UserStats>(() => getUserStats());

  // Sync settings changes to storage
  useEffect(() => {
    setStoredTheme(theme);
  }, [theme]);

  useEffect(() => {
    setStoredFollowSystemTheme(followSystemTheme);
  }, [followSystemTheme]);

  useEffect(() => {
    setStoredFavoriteLightTheme(favoriteLightTheme);
  }, [favoriteLightTheme]);

  // Real-time listener for system dark mode (prefers-color-scheme)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const syncThemeWithSystem = (isDark: boolean) => {
      setSystemIsDark(isDark);
      if (followSystemTheme) {
        setTheme(isDark ? 'midnight' : favoriteLightTheme);
      }
    };

    // Initial check on mount or when mode changes
    syncThemeWithSystem(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      syncThemeWithSystem(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [followSystemTheme, favoriteLightTheme]);

  useEffect(() => {
    setStoredSoundType(soundType);
    metronome.setSoundType(soundType);
  }, [soundType]);

  useEffect(() => {
    setStoredAutoCycles(autoCycles);
  }, [autoCycles]);

  useEffect(() => {
    setStoredMuted(muted);
    metronome.setMuted(muted);
  }, [muted]);

  // Sync real-time training state with server
  useEffect(() => {
    const isTraining = appState === 'RUNNING' || appState === 'COOLDOWN';
    realtimePresence.setTrainingState(isTraining, bpm);
  }, [appState, bpm]);

  // Format Total Time
  const formatTotalTime = (totalSecs: number) => {
    if (totalSecs <= 0) return '0 分钟';
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    if (hours > 0) {
      return `${hours} 小时 ${minutes} 分`;
    }
    if (minutes > 0) {
      return `${minutes} 分钟 ${seconds > 0 ? `${seconds}秒` : ''}`.trim();
    }
    return `${seconds} 秒`;
  };

  // Get Achievement Level based on cycles and duration
  const getAchievementLevel = (cycles: number, seconds: number) => {
    if (cycles >= 12 || seconds >= 3600 * 2) {
      return { title: '👑 传奇控精王者', level: 'LV.4 巅峰', desc: '身心合一 · 绝对掌控' };
    } else if (cycles >= 6 || seconds >= 3600) {
      return { title: '🔥 黄金耐力大师', level: 'LV.3 进阶', desc: '突破阈值 · 坚韧持久' };
    } else if (cycles >= 2 || seconds >= 1200) {
      return { title: '⚡ 控速精进达人', level: 'LV.2 熟练', desc: '掌控边缘 · 渐入佳境' };
    }
    return { title: '🌱 律动初醒者', level: 'LV.1 新秀', desc: '开启脱敏 · 初见成效' };
  };

  const timerRef = useRef<number | null>(null);

  // Screen orientation & mobile portrait detection
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  });
  const [showPortraitChartsManual, setShowPortraitChartsManual] = useState<boolean>(false);

  useEffect(() => {
    const updateOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      const mobile = window.innerWidth < 1024;
      setIsPortrait(portrait);
      setIsMobileScreen(mobile);
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  const isMobilePortrait = isMobileScreen && isPortrait;

  const t = THEMES[theme];

  // Stage Durations for Progressive Mode (Total 10 mins per cycle)
  const STAGE_DURATIONS: Record<BpmState, number> = {
    30: 180, // 3 mins 慢速试探
    60: 240, // 4 mins 稳定匀速
    90: 120, // 2 mins 深入加速
    120: 60  // 1 min  极致冲刺
  };

  const STAGE_NAMES: Record<BpmState, { name: string; desc: string }> = {
    30: { name: '慢速试探', desc: '深长呼吸 · 感受边缘' },
    60: { name: '稳定匀速', desc: '均匀抽送 · 渐入佳境' },
    90: { name: '深入加速', desc: '强劲挺进 · 紧致包裹' },
    120: { name: '极致冲刺', desc: '全速前行 · 边缘释放' }
  };

  // Helper to pick random phrase
  const updatePhrase = useCallback((currentBpm: BpmState) => {
    const list = PHRASES[currentBpm];
    setPhrase(list[Math.floor(Math.random() * list.length)]);
  }, []);

  // Handle Metronome Beat Pulse
  useEffect(() => {
    metronome.onBeat = () => {
      setPulse(true);
      setTimeout(() => setPulse(false), 140);
    };
  }, []);

  // Preparation Step Guidance Data
  const PREP_STEPS: Record<number, { title: string; desc: string; tip: string; emoji: string; badgeColor: string }> = {
    3: {
      title: '调整好姿势',
      desc: '找一个最舒适放松的姿态 · 放松腰腹与呼吸',
      tip: '步骤 1 / 3 · 身心就绪',
      emoji: '🧘',
      badgeColor: 'bg-amber-500/15 text-amber-900 border-amber-500/30'
    },
    2: {
      title: '缓缓深呼吸',
      desc: '腹式深吸慢呼 · 保持思绪专注与沉静感知',
      tip: '步骤 2 / 3 · 气息调匀',
      emoji: '🌬️',
      badgeColor: 'bg-cyan-500/15 text-cyan-900 border-cyan-500/30'
    },
    1: {
      title: '节拍即将开启',
      desc: '跟随节奏律动 · 循序渐进享受绝对掌控',
      tip: '步骤 3 / 3 · 律动就绪',
      emoji: '💓',
      badgeColor: 'bg-rose-500/15 text-rose-900 border-rose-500/30'
    }
  };

  // Audio initialization
  const initAudio = () => {
    if (!audioEnabled) {
      metronome.init();
      setAudioEnabled(true);
    }
  };

  // Direct start execution after countdown
  const executeStartRunning = useCallback((mode: PlayMode = targetMode, cycles: number = autoCycles) => {
    initAudio();
    setAppState('RUNNING');
    if (mode === 'AUTO') {
      setPlayMode('AUTO');
      setAutoCycles(cycles);
      setCurrentCycle(1);
      setBpm(30);
      metronome.setBpm(30);
      setTimeLeft(STAGE_DURATIONS[30]);
      setTotalDuration(STAGE_DURATIONS[30]);
      updatePhrase(30);
    } else if (mode === 'RANDOM') {
      setPlayMode('RANDOM');
      setCurrentCycle(1);
      setBpm(60);
      metronome.setBpm(60);
      setTimeLeft(0);
      updatePhrase(60);
    } else if (mode === 'MANUAL') {
      setPlayMode('MANUAL');
      setCurrentCycle(1);
      setBpm(30);
      metronome.setBpm(30);
      setTimeLeft(0);
      setTotalDuration(0);
      updatePhrase(30);
    }
  }, [targetMode, autoCycles, updatePhrase]);

  // Start Preparation Countdown (3s Ritual)
  const startPreparation = (mode: PlayMode, cycles: number = autoCycles) => {
    initAudio();
    setTargetMode(mode);
    setAutoCycles(cycles);
    setPrepCount(3);
    setAppState('PREPARING');
    try {
      metronome.playSample(soundType);
    } catch {}
  };

  // Preparation Countdown Timer Engine (3 -> 2 -> 1 -> RUNNING)
  useEffect(() => {
    if (appState !== 'PREPARING') return;

    if (prepCount <= 0) {
      executeStartRunning(targetMode, autoCycles);
      return;
    }

    const timer = window.setTimeout(() => {
      setPrepCount((prev) => {
        const next = prev - 1;
        if (next > 0) {
          try {
            metronome.playSample(soundType);
          } catch {}
        }
        return next;
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [appState, prepCount, targetMode, autoCycles, soundType, executeStartRunning]);

  // Start Progressive Mode (with 3s preparation)
  const startProgressiveMode = (cycles: number = autoCycles) => {
    startPreparation('AUTO', cycles);
  };

  // Start Random Blind Box Mode (with 3s preparation)
  const startRandomMode = () => {
    startPreparation('RANDOM');
  };

  // Start Manual Custom Mode (with 3s preparation)
  const startManualMode = () => {
    startPreparation('MANUAL');
  };

  // State Machine Timer Engine
  useEffect(() => {
    if (appState === 'IDLE' || appState === 'CLIMAX') {
      metronome.stop(true, 0.4);
      if (timerRef.current) clearInterval(timerRef.current);
    } else if (appState === 'RUNNING') {
      metronome.start(bpm, true);
      
      if (playMode === 'RANDOM') {
        if (timeLeft === 0) {
          const newDuration = Math.floor(Math.random() * 105) + 15;
          setTimeLeft(newDuration);
          setTotalDuration(newDuration);
          updatePhrase(bpm);
        }

        timerRef.current = window.setInterval(() => {
          // Increment total cumulative active training seconds & daily record
          setUserStats(s => recordTrainingSeconds(s, 1));

          setTimeLeft((prev) => {
            if (prev <= 1) {
              const bpms: BpmState[] = [30, 60, 90, 120];
              const nextBpm = bpms[Math.floor(Math.random() * bpms.length)];
              setBpm(nextBpm);
              metronome.setBpm(nextBpm);
              updatePhrase(nextBpm);
              const nextDuration = Math.floor(Math.random() * 105) + 15;
              setTotalDuration(nextDuration);
              return nextDuration;
            }
            return prev - 1;
          });
          
          if (Math.random() < 0.1) {
            setBpm(b => { updatePhrase(b); return b; });
          }
        }, 1000);
      } else if (playMode === 'MANUAL') {
        timerRef.current = window.setInterval(() => {
          // Increment total cumulative active training seconds & daily record
          setUserStats(s => recordTrainingSeconds(s, 1));
          setTimeLeft(prev => prev + 1);
        }, 1000);
      } else if (playMode === 'AUTO') {
        timerRef.current = window.setInterval(() => {
          // Increment total cumulative active training seconds & daily record
          setUserStats(s => recordTrainingSeconds(s, 1));

          setTimeLeft((prev) => {
            const nextVal = prev - 1;

            // Trigger Edge Warning sound during 120 BPM sprint stage's final 10 seconds (10 -> 1)
            if (bpm === 120 && nextVal <= 10 && nextVal >= 1) {
              try {
                metronome.playEdgeWarning(nextVal);
              } catch {}
              if (nextVal === 10) {
                setPhrase('⚡ 极致冲刺最后 10 秒！锁定边缘，感受巅峰涌动！');
              }
            }

            if (prev <= 1) {
              let nextBpm: BpmState | null = null;
              if (bpm === 30) nextBpm = 60;
              else if (bpm === 60) nextBpm = 90;
              else if (bpm === 90) nextBpm = 120;
              
              if (nextBpm) {
                // Next stage in the current cycle
                setBpm(nextBpm);
                metronome.setBpm(nextBpm);
                updatePhrase(nextBpm);
                setTotalDuration(STAGE_DURATIONS[nextBpm]);
                return STAGE_DURATIONS[nextBpm];
              } else {
                // 120 BPM finished for current cycle - record completed cycle!
                setUserStats(s => recordCycle(s));

                if (currentCycle < autoCycles) {
                  const nextCycleNum = currentCycle + 1;
                  setCurrentCycle(nextCycleNum);
                  setBpm(30);
                  metronome.setBpm(30);
                  updatePhrase(30);
                  setPhrase(`第 ${nextCycleNum} 轮开始！深呼吸，放缓节拍重新掌控`);
                  setTotalDuration(STAGE_DURATIONS[30]);
                  return STAGE_DURATIONS[30];
                } else {
                  // All cycles completed!
                  setUserStats(s => recordSession(s));
                  setAppState('CLIMAX');
                  setShowParticles(true);
                  return 0;
                }
              }
            }
            return prev - 1;
          });
          if (Math.random() < 0.05) {
            setBpm(b => { updatePhrase(b); return b; });
          }
        }, 1000);
      }
    } else if (appState === 'COOLDOWN') {
      metronome.stop(true, 0.6);
      setBpm(30);
      setPhrase('深呼吸...冷静下来...双手离开');
      
      if (timeLeft === 0) {
        setTimeLeft(30);
        setTotalDuration(30);
      }

      timerRef.current = window.setInterval(() => {
        // Increment total cumulative active training seconds even in cooldown
        setUserStats(s => recordTrainingSeconds(s, 1));

        setTimeLeft((prev) => {
          if (prev <= 1) {
            setAppState('RUNNING');
            if (playMode === 'RANDOM') {
              return 0;
            } else {
              setBpm(prevBpm);
              metronome.setBpm(prevBpm);
              updatePhrase(prevBpm);
              setTotalDuration(STAGE_DURATIONS[prevBpm]);
              return STAGE_DURATIONS[prevBpm];
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [appState, playMode, bpm, prevBpm, currentCycle, autoCycles]);

  // Spacebar Hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      initAudio();
      if (e.code === 'Space') {
        e.preventDefault();
        if (appState === 'RUNNING') {
          setPrevBpm(bpm);
          setAppState('COOLDOWN');
          setTimeLeft(30);
          setTotalDuration(30);
        } else if (appState === 'COOLDOWN') {
          setAppState('RUNNING');
          if (playMode === 'RANDOM') {
            setTimeLeft(0);
          } else {
            setBpm(prevBpm);
            metronome.setBpm(prevBpm);
            updatePhrase(prevBpm);
            setTimeLeft(STAGE_DURATIONS[prevBpm]);
            setTotalDuration(STAGE_DURATIONS[prevBpm]);
          }
        } else if (appState === 'PREPARING') {
          executeStartRunning(targetMode, autoCycles);
        } else if (appState === 'IDLE') {
          startProgressiveMode(autoCycles);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appState, bpm, prevBpm, playMode, autoCycles, targetMode, executeStartRunning]);

  const handleInteraction = useCallback(() => {
    initAudio();
    if (appState === 'RUNNING' || appState === 'COOLDOWN') {
      if (navigator.vibrate) {
        navigator.vibrate([15]);
      }
    }
  }, [appState, audioEnabled]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Dynamic physiological excitement backdrop blur scaling with BPM
  const dynamicBackdropBlur = useMemo(() => {
    if (appState === 'RUNNING') {
      // 30 BPM -> 0px, 60 BPM -> 2.5px, 90 BPM -> 5.5px, 120 BPM -> 8.5px (+ extra 1.5px pulse resonance at peak)
      const baseBlur = Math.max(0, ((bpm - 30) / 90) * 8.5);
      const pulseBlur = pulse && bpm >= 90 ? 1.5 : 0;
      return `${(baseBlur + pulseBlur).toFixed(1)}px`;
    }
    if (appState === 'COOLDOWN') {
      return '2.0px';
    }
    return '0px';
  }, [appState, bpm, pulse]);

  return (
    <div 
      className={`min-h-[100dvh] w-full ${t.appBg} ${t.text} transition-colors duration-700 font-sans flex flex-col items-center justify-start md:justify-center p-0 sm:p-3 md:p-6 lg:p-8 xl:p-10 relative overflow-x-hidden`}
    >
      
      <div className={`flex flex-col justify-between w-full min-h-[100dvh] h-auto md:min-h-[740px] lg:min-h-[780px] md:max-w-3xl lg:max-w-5xl xl:max-w-6xl ${t.cardBg} md:rounded-[2.5rem] md:shadow-2xl md:border ${t.border} relative overflow-hidden transition-all duration-500`}>

        {/* Atmosphere Glow Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-500 ease-out z-0"
          style={{
            backgroundColor: (appState === 'RUNNING' || appState === 'COOLDOWN') ? (theme === 'midnight' ? 'rgba(217,70,239,0.04)' : t.glow.replace('0.2', '0.12')) : 'transparent',
            opacity: (appState === 'RUNNING' || appState === 'COOLDOWN') 
              ? (pulse || isPressing ? (theme === 'midnight' ? 0.45 : 1) : (theme === 'midnight' ? 0.15 : 0.35)) 
              : 0,
          }}
        />
        
        {/* Top Progress Bar */}
        {(appState === 'RUNNING' || appState === 'COOLDOWN') && (
          <div className="absolute top-0 left-0 right-0 h-1.5 md:h-2 bg-black/5 z-50 overflow-hidden">
            <div 
              className={`h-full ${appState === 'COOLDOWN' ? 'bg-blue-400' : t.progress} transition-all duration-1000 ease-linear rounded-r-full`}
              style={{ 
                width: `${Math.max(0, Math.min(100, (timeLeft / totalDuration) * 100))}%`
              }}
            />
          </div>
        )}

        {/* Top Bar Header */}
        <header className="sticky top-0 px-3.5 py-3 sm:px-6 sm:py-4 md:px-8 md:py-5 lg:px-10 lg:py-6 flex justify-between items-center z-30 shrink-0 gap-2 sm:gap-3 border-b border-black/[0.04] bg-inherit backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {appState !== 'IDLE' && (
              <button 
                onClick={() => {
                  setAppState('IDLE');
                  metronome.stop(true, 0.4);
                  setShowParticles(false);
                }}
                className={`p-2 sm:p-2.5 md:p-3 rounded-full ${t.buttonBg} ${t.buttonHover} transition-all duration-200 active:scale-95 shadow-xs`}
                title="返回主页"
              >
                <Home className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            )}
            <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-wider flex items-center gap-1.5 sm:gap-2">
              <Flame className={`w-5 h-5 md:w-6 md:h-6 ${t.accent} shrink-0`} />
              <span>律动</span>
              <span className="hidden sm:inline-block text-[11px] font-bold opacity-50 px-2 py-0.5 rounded-full bg-black/5">
                EdgeControl
              </span>
            </h1>
          </div>

          {/* Real-time Clock & Live Online Count Badges in Header */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 shrink-0">
            <LiveClockBadge variant="header" isDark={theme === 'midnight'} />
            <OnlineUserBadge variant="header" isDark={theme === 'midnight'} />

            <button 
              onClick={() => setMuted(!muted)} 
              className={`relative p-2 sm:p-2.5 md:p-3 rounded-full transition-all duration-300 active:scale-95 shadow-xs ${
                muted 
                  ? 'bg-rose-500/20 text-rose-700 border border-rose-400/50 ring-2 ring-rose-400/60 shadow-[0_0_16px_rgba(244,63,94,0.4)] animate-pulse' 
                  : `${t.buttonBg} ${t.buttonHover}`
              }`}
              title={muted ? '当前处于静音状态（点击开启声音）' : '点击静音'}
            >
              {muted ? (
                <div className="relative flex items-center justify-center">
                  <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-rose-600" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                  </span>
                </div>
              ) : (
                <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
              )}
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className={`p-2 sm:p-2.5 md:p-3 rounded-full ${t.buttonBg} ${t.buttonHover} transition-all duration-200 active:scale-95 shadow-xs`}
              title="偏好设置"
            >
              <Settings2 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </header>

        {/* Settings Modal Overlay */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm transition-all">
            <div 
              className={`w-full max-w-lg p-6 md:p-8 rounded-[2rem] border ${t.cardBg} ${t.border} shadow-2xl flex flex-col gap-5 max-h-[85vh] overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-black/5">
                <div className="flex items-center gap-2">
                  <Settings2 className={`w-5 h-5 ${t.accent}`} />
                  <h3 className="text-base md:text-lg font-black tracking-wider">偏好设置</h3>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-full hover:bg-black/5 transition-all"
                >
                  <X className="w-5 h-5 opacity-60" />
                </button>
              </div>

              {/* Settings Tabs */}
              <div className="flex gap-2 p-1 bg-black/5 rounded-full">
                <button
                  onClick={() => setActiveSettingsTab('sound')}
                  className={`flex-1 py-2.5 rounded-full text-xs font-black tracking-wider flex items-center justify-center gap-2 transition-all ${
                    activeSettingsTab === 'sound' ? `${t.buttonBg} shadow-sm font-black` : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <Music className="w-4 h-4" /> 节拍音色
                </button>
                <button
                  onClick={() => setActiveSettingsTab('theme')}
                  className={`flex-1 py-2.5 rounded-full text-xs font-black tracking-wider flex items-center justify-center gap-2 transition-all ${
                    activeSettingsTab === 'theme' ? `${t.buttonBg} shadow-sm font-black` : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <Palette className="w-4 h-4" /> 主题色彩
                </button>
              </div>

              {/* Sound Timbre Options */}
              {activeSettingsTab === 'sound' && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold opacity-50 px-1">选择沉浸爱欲节拍（点击即可实时试听）：</div>
                  <div className="grid grid-cols-1 gap-2">
                    {SOUND_PRESETS.map((preset) => {
                      const isSelected = soundType === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setSoundType(preset.id);
                            metronome.playSample(preset.id, true);
                          }}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                            isSelected 
                              ? `${t.buttonBg} border-current shadow-sm` 
                              : 'bg-white/40 hover:bg-white/70 border-black/5 opacity-80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isSelected ? 'bg-black/5 shadow-inner' : 'bg-white/60'}`}>
                              {preset.emoji}
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black tracking-wider">{preset.name}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-black/10' : 'bg-black/5'}`}>
                                  {preset.tag}
                                </span>
                              </div>
                              <p className="text-xs opacity-60 mt-0.5">{preset.desc}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-5 h-5 text-current stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Theme Options */}
              {activeSettingsTab === 'theme' && (
                <div className="space-y-3.5">
                  {/* Follow System Theme Switch Banner */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    followSystemTheme
                      ? (theme === 'midnight' ? 'bg-purple-950/60 border-purple-800/80 text-purple-200' : 'bg-rose-50/80 border-rose-200 text-slate-800')
                      : 'bg-black/[0.03] border-black/5 text-slate-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                          followSystemTheme 
                            ? (theme === 'midnight' ? 'bg-purple-900 text-rose-300' : 'bg-rose-500/20 text-rose-700')
                            : 'bg-black/5 text-slate-500'
                        }`}>
                          <Monitor className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black tracking-wide">跟随系统设置</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              systemIsDark 
                                ? 'bg-purple-900/60 text-purple-200 border-purple-700/50' 
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}>
                              {systemIsDark ? '🌙 系统当前: 深色' : '☀️ 系统当前: 浅色'}
                            </span>
                          </div>
                          <p className="text-xs opacity-70 mt-0.5 leading-tight">
                            {followSystemTheme 
                              ? (systemIsDark 
                                  ? '已自动匹配系统深色模式，呈现暗夜玫瑰私密界面' 
                                  : `已自动匹配系统浅色模式，呈现所选浅色主题`)
                              : '自动监听设备系统或浏览器的深浅色外观并智能同步'}
                          </p>
                        </div>
                      </div>

                      {/* Follow System Toggle Switch */}
                      <button
                        onClick={() => {
                          const nextFollow = !followSystemTheme;
                          setFollowSystemTheme(nextFollow);
                          if (nextFollow) {
                            // Immediately apply based on system
                            if (typeof window !== 'undefined' && window.matchMedia) {
                              const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                              setTheme(isDark ? 'midnight' : favoriteLightTheme);
                            }
                          }
                        }}
                        className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 relative shrink-0 focus:outline-hidden ${
                          followSystemTheme ? (theme === 'midnight' ? 'bg-purple-600' : 'bg-rose-500') : 'bg-slate-300'
                        }`}
                        title="开启/关闭跟随系统外观"
                      >
                        <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                          followSystemTheme ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Night Mode Quick Switch Banner */}
                  <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    theme === 'midnight' 
                      ? 'bg-purple-950/40 border-purple-800/60 text-purple-200' 
                      : 'bg-black/[0.03] border-black/5 text-slate-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                          theme === 'midnight' ? 'bg-purple-900/60 text-rose-300' : 'bg-slate-900 text-amber-300'
                        }`}>
                          {theme === 'midnight' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-black tracking-wide">夜间私密外观</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              theme === 'midnight' ? 'bg-purple-900/50 text-rose-300' : 'bg-black/5 text-slate-600'
                            }`}>
                              {theme === 'midnight' ? '🌙 已开启' : '已关闭'}
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs opacity-65 mt-0.5">
                            深邃深紫/暗黑玫瑰调，暗光环境下保护视力并自动调暗光晕
                          </p>
                        </div>
                      </div>

                      {/* Custom Toggle Switch */}
                      <button
                        onClick={() => {
                          if (theme === 'midnight') {
                            setTheme(favoriteLightTheme);
                            // If followSystemTheme is enabled but user explicitly turns off dark mode while system is dark, disable follow system
                            if (followSystemTheme && systemIsDark) {
                              setFollowSystemTheme(false);
                            }
                          } else {
                            setTheme('midnight');
                            // If followSystemTheme is enabled but user explicitly turns on dark mode while system is light, disable follow system
                            if (followSystemTheme && !systemIsDark) {
                              setFollowSystemTheme(false);
                            }
                          }
                        }}
                        className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 relative shrink-0 focus:outline-hidden ${
                          theme === 'midnight' ? 'bg-rose-500' : 'bg-slate-300'
                        }`}
                        title="切换夜间私密模式"
                      >
                        <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                          theme === 'midnight' ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold opacity-50 px-1 mb-2 flex items-center justify-between">
                      <span>自选配色风格：</span>
                      {followSystemTheme && (
                        <span className="text-[10px] font-bold text-rose-500">
                          {theme === 'midnight' ? '夜间生效中' : '浅色生效中'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {([
                        ['peach', '蜜桃粉', 'bg-rose-100 border-rose-300 text-rose-800', '🌸'],
                        ['mint', '薄荷绿', 'bg-teal-100 border-teal-300 text-teal-800', '🍃'],
                        ['taro', '香芋紫', 'bg-purple-100 border-purple-300 text-purple-800', '🍇'],
                        ['cheese', '芝士黄', 'bg-amber-100 border-amber-300 text-amber-800', '🧀'],
                        ['midnight', '暗夜玫瑰', 'bg-[#151026] border-purple-800/80 text-rose-200', '🌙']
                      ] as const).map(([key, name, colorClass, emoji]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setTheme(key);
                            if (key !== 'midnight') {
                              setFavoriteLightTheme(key);
                              if (followSystemTheme && systemIsDark) {
                                setFollowSystemTheme(false);
                              }
                            } else {
                              if (followSystemTheme && !systemIsDark) {
                                setFollowSystemTheme(false);
                              }
                            }
                          }}
                          className={`p-3.5 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all duration-200 active:scale-95 ${colorClass} ${
                            theme === key ? 'ring-2 ring-current shadow-md scale-[1.02]' : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          <span className="text-2xl">{emoji}</span>
                          <span className="text-xs sm:text-sm font-black">{name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowSettings(false)}
                className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-widest ${t.buttonBg} ${t.buttonHover} transition-all shadow-md mt-1`}
              >
                完成设置
              </button>
            </div>
          </div>
        )}

        {/* Main Stage Area */}
        <main 
          className={`flex-1 flex flex-col items-center ${
            appState === 'IDLE' ? 'justify-start pt-3 pb-12 sm:py-6 md:py-8' : 'justify-center py-4 sm:py-6'
          } relative w-full px-3.5 sm:px-6 md:px-8 lg:px-10 cursor-pointer touch-manipulation z-10 min-h-0 transition-[backdrop-filter] duration-700 ease-out`}
          style={{
            backdropFilter: `blur(${dynamicBackdropBlur})`,
            WebkitBackdropFilter: `blur(${dynamicBackdropBlur})`,
          }}
          onMouseDown={() => { setIsPressing(true); handleInteraction(); }}
          onMouseUp={() => setIsPressing(false)}
          onMouseLeave={() => setIsPressing(false)}
          onTouchStart={() => { setIsPressing(true); handleInteraction(); }}
          onTouchEnd={() => setIsPressing(false)}
          onTouchCancel={() => setIsPressing(false)}
        >
          
          {/* Visual Pulse Ring */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            {/* Dynamic CSS animations for Cooldown, Prep & Rhythmic breathing */}
            <style>{`
              @keyframes breathe-circle {
                0%, 100% { transform: scale(0.92); opacity: 0.15; }
                50% { transform: scale(1.08); opacity: 0.45; }
              }
              @keyframes cooldown-breathe {
                0% { transform: scale(0.88); opacity: 0.3; }
                50% { transform: scale(1.15); opacity: 0.75; }
                100% { transform: scale(0.88); opacity: 0.3; }
              }
              @keyframes cooldown-halo {
                0% { transform: scale(0.8); opacity: 0.15; }
                50% { transform: scale(1.3); opacity: 0.55; }
                100% { transform: scale(0.8); opacity: 0.15; }
              }
              @keyframes cooldown-text-pulse {
                0%, 100% { opacity: 0.45; transform: translateY(0px) scale(0.98); }
                50% { opacity: 0.95; transform: translateY(-2px) scale(1.02); }
              }
              @keyframes prep-pop {
                0% { transform: scale(0.72) translateY(8px); opacity: 0; }
                50% { transform: scale(1.06) translateY(-2px); opacity: 1; }
                100% { transform: scale(1) translateY(0px); opacity: 1; }
              }
              @keyframes prep-float {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-8px) rotate(4deg); }
              }
              @keyframes prep-glow-pulse {
                0%, 100% { transform: scale(0.92); opacity: 0.3; }
                50% { transform: scale(1.22); opacity: 0.7; }
              }
              @keyframes prep-ring-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            
            {appState === 'IDLE' && (
              <div 
                className="absolute w-72 h-72 md:w-96 md:h-96 lg:w-[32rem] lg:h-[32rem] rounded-full border-4 border-blue-400/20"
                style={{
                  animation: 'breathe-circle 5s ease-in-out infinite'
                }}
              />
            )}

            {appState === 'PREPARING' && (
              <>
                {/* Outer Rotating Dotted Ring */}
                <div 
                  className="absolute w-72 h-72 md:w-96 md:h-96 lg:w-[28rem] lg:h-[28rem] rounded-full border-2 border-dashed border-rose-400/35 pointer-events-none"
                  style={{
                    animation: 'prep-ring-spin 20s linear infinite'
                  }}
                />
                {/* Core Soft Ambient Pulse Ring */}
                <div 
                  className="absolute w-60 h-60 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full bg-gradient-to-tr from-rose-400/20 via-amber-300/20 to-indigo-300/20 pointer-events-none blur-sm"
                  style={{
                    animation: 'prep-glow-pulse 2s ease-in-out infinite'
                  }}
                />
              </>
            )}

            {appState === 'COOLDOWN' && (
              <>
                {/* Outer Calming Halo */}
                <div 
                  className="absolute w-72 h-72 md:w-[26rem] md:h-[26rem] lg:w-[32rem] lg:h-[32rem] rounded-full border-2 border-cyan-400/40 bg-cyan-300/10 pointer-events-none"
                  style={{
                    animation: 'cooldown-halo 6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                    filter: 'blur(1px)'
                  }}
                />
                {/* Core Calming Breath Ring */}
                <div 
                  className="absolute w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full border-[3px] border-blue-400/50 bg-blue-400/15 pointer-events-none shadow-[0_0_50px_rgba(56,189,248,0.25)]"
                  style={{
                    animation: 'cooldown-breathe 6s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                  }}
                />
              </>
            )}

            {appState === 'RUNNING' && (
              <>
                <div 
                  className={`w-64 h-64 md:w-80 md:h-80 lg:w-[26rem] lg:h-[26rem] rounded-full border transition-all duration-300 ease-out ${t.border}`}
                  style={{
                    transform: pulse ? 'scale(1.08)' : (isPressing ? 'scale(0.96)' : 'scale(1)'),
                    opacity: pulse ? 0.9 : (isPressing ? 0.6 : 0.25),
                    backgroundColor: pulse ? t.glow : (isPressing ? t.glow : 'transparent')
                  }}
                />
                <div 
                  className={`absolute w-64 h-64 md:w-80 md:h-80 lg:w-[26rem] lg:h-[26rem] rounded-full border-[1px] transition-all duration-500 ease-out ${t.border}`}
                  style={{
                    transform: pulse ? 'scale(1.22)' : (isPressing ? 'scale(0.92)' : 'scale(1)'),
                    opacity: pulse ? 0 : (isPressing ? 0.7 : 0)
                  }}
                />
              </>
            )}
          </div>

          <div className={`relative z-10 flex flex-col items-center justify-center w-full ${appState === 'IDLE' ? 'max-w-full' : 'max-w-2xl'} pointer-events-none transition-all duration-500`}>
            
            {!audioEnabled && (
              <div className={`mb-3 inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black tracking-widest ${t.buttonBg} shadow-sm animate-bounce pointer-events-auto`}>
                <Info className="w-4 h-4 shrink-0" />
                点击屏幕激活声音 · 开启律动
              </div>
            )}

            {/* IDLE State - Responsive 2-Column Desktop Grid / Single Column Mobile Layout */}
            {appState === 'IDLE' && (
              <div className="w-full min-w-0 pointer-events-auto">
                <div className="lg:grid lg:grid-cols-12 lg:gap-8 xl:gap-10 lg:items-start text-left w-full min-w-0">
                  
                  {/* Left Column: Command & Mode Configuration (7 cols on lg) */}
                  <div className="w-full min-w-0 lg:col-span-7 flex flex-col gap-4 md:gap-5">
                    
                    {/* Header & Subtitle */}
                    <div className="w-full min-w-0 space-y-1 text-center lg:text-left">
                      <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 mb-1">
                        <Zap className="w-3.5 h-3.5" />
                        <span>科学阶梯节奏递进 · 突破持久耐力</span>
                      </div>
                      <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${theme === 'midnight' ? 'text-rose-100' : 'text-slate-900'}`}>
                        律动控精训练
                      </h2>
                      <p className="text-xs sm:text-sm font-medium opacity-70 leading-relaxed">
                        通过精准 Web Audio 节拍器与渐进式脱敏循环，训练盆底神经抗刺激耐受度与身心掌控力。
                      </p>
                    </div>

                    {/* Real-time Clock & Anti-addiction Contextual Banner */}
                    <div className="w-full min-w-0">
                      <LiveClockBadge variant="banner" isDark={theme === 'midnight'} />
                    </div>

                    {/* Main Progressive Mode Card with Cycle Count Selector */}
                    <div className={`w-full min-w-0 p-5 sm:p-6 md:p-7 rounded-[2rem] border ${
                      theme === 'midnight' 
                        ? 'bg-[#151026] border-purple-900/60 text-rose-100 shadow-[0_10px_30px_rgba(0,0,0,0.5)]' 
                        : `${t.buttonBg} shadow-sm`
                    } text-left transition-all hover:shadow-md`}>
                      <div className="w-full min-w-0 flex flex-col gap-4">
                        <div className="flex items-center justify-between w-full min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-11 h-11 rounded-2xl ${
                              theme === 'midnight' ? 'bg-purple-900/40 text-rose-400' : 'bg-black/5'
                            } flex items-center justify-center shrink-0`}>
                              <TrendingUp className={`w-6 h-6 ${theme === 'midnight' ? 'text-rose-400' : t.accent}`} />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-base sm:text-lg font-black tracking-wider flex items-center gap-2 flex-wrap">
                                <span>循序渐进模式</span>
                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                  theme === 'midnight' 
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                                    : 'bg-rose-500/15 text-rose-700 border border-rose-500/20'
                                }`}>
                                  4 阶段递进
                                </span>
                              </h3>
                              <p className={`text-xs ${theme === 'midnight' ? 'text-purple-300/70' : 'opacity-65'} mt-0.5`}>
                                30 → 60 → 90 → 120 BPM 自动升级，单轮 10 分钟
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Cycle Counter Selector & Recommendation */}
                        <div className={`w-full min-w-0 p-3.5 rounded-2xl space-y-3 border ${
                          theme === 'midnight' 
                            ? 'bg-[#1e1738] border-purple-800/40' 
                            : 'bg-black/[0.03] border-black/5'
                        }`}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-black">
                              <Target className="w-4 h-4 opacity-70" />
                              <span>训练循环次数：</span>
                            </div>
                            
                            {/* Recommendation Badge */}
                            <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                              theme === 'midnight' 
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                                : 'bg-amber-500/15 text-amber-800 border border-amber-500/20'
                            }`}>
                              <Award className={`w-3.5 h-3.5 ${theme === 'midnight' ? 'text-amber-400' : 'text-amber-600'}`} />
                              <span>推荐 2~3 轮 (20~30分钟)</span>
                            </div>
                          </div>

                          {/* Cycle Pills */}
                          <div className="grid grid-cols-4 gap-2 w-full min-w-0">
                            {([1, 2, 3, 4] as number[]).map((cycleNum) => {
                              const isSelected = autoCycles === cycleNum;
                              const isRecommended = cycleNum === 2 || cycleNum === 3;
                              
                              let pillClass = '';
                              if (theme === 'midnight') {
                                if (isSelected) {
                                  pillClass = 'bg-gradient-to-br from-rose-500 to-purple-600 text-white font-black shadow-lg shadow-rose-950/60 ring-2 ring-rose-400 scale-[1.03]';
                                } else {
                                  pillClass = 'bg-[#291f4d] hover:bg-[#342761] text-purple-200 hover:text-white font-bold border border-purple-700/50 hover:border-purple-500/80';
                                }
                              } else {
                                if (isSelected) {
                                  pillClass = 'bg-slate-900 text-white font-black shadow-md scale-[1.03]';
                                } else {
                                  pillClass = 'bg-white hover:bg-slate-50 text-slate-800 font-bold border border-black/10 shadow-2xs opacity-90 hover:opacity-100';
                                }
                              }

                              return (
                                <button
                                  key={cycleNum}
                                  onClick={() => setAutoCycles(cycleNum)}
                                  className={`py-2.5 px-1.5 rounded-xl text-center transition-all duration-200 flex flex-col items-center justify-center relative ${pillClass}`}
                                >
                                  <span className="text-xs sm:text-sm font-black">{cycleNum} 轮</span>
                                  <span className={`text-[10px] ${isSelected ? 'text-white/85' : (theme === 'midnight' ? 'text-purple-300/80' : 'text-slate-500')} mt-0.5`}>
                                    {cycleNum * 10} 分钟
                                  </span>
                                  {isRecommended && !isSelected && (
                                    <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ${
                                      theme === 'midnight' ? 'ring-2 ring-[#291f4d]' : 'ring-2 ring-white'
                                    } animate-pulse`} />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* "Why is this recommended?" Accordion */}
                          <div className="pt-1 w-full min-w-0">
                            <button
                              onClick={() => setShowCycleWhy(!showCycleWhy)}
                              className="w-full flex items-center justify-between text-[11px] sm:text-xs font-bold opacity-75 hover:opacity-100 transition-opacity py-1 px-0.5"
                            >
                              <span className={`flex items-center gap-1 ${theme === 'midnight' ? 'text-rose-400' : 'text-rose-700'}`}>
                                <HelpCircle className="w-3.5 h-3.5" />
                                为什么科学推荐循环 2~3 轮？
                              </span>
                              {showCycleWhy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {showCycleWhy && (
                              <div className={`mt-2 p-3.5 rounded-xl border text-xs leading-relaxed space-y-2 animate-fadeIn ${
                                theme === 'midnight'
                                  ? 'bg-[#18122c] border-purple-800/50 text-purple-200'
                                  : 'bg-white/90 border-black/5 text-slate-800'
                              }`}>
                                <div className="flex gap-2">
                                  <span className={`font-black ${theme === 'midnight' ? 'text-rose-400' : 'text-rose-600'} shrink-0`}>第 1 轮：</span>
                                  <span className="opacity-90"><strong>唤醒与神经脱敏</strong> · 从 30 BPM 慢速渐入 120 冲刺，让敏感神经适应刺激节奏，建立第一道耐受防线。</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className={`font-black ${theme === 'midnight' ? 'text-amber-400' : 'text-amber-600'} shrink-0`}>第 2 轮：</span>
                                  <span className="opacity-90"><strong>强化控精与边缘掌控（核心）</strong> · 在高度兴奋阈值下骤然回到 30 BPM 急刹车，极度强化边缘控精（Edging）耐力。</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className={`font-black ${theme === 'midnight' ? 'text-teal-400' : 'text-teal-600'} shrink-0`}>第 3 轮：</span>
                                  <span className="opacity-90"><strong>突破生理持久上限</strong> · 重塑射精反射弧与神经阻断，达成身心自如的长效持久掌控。</span>
                                </div>
                                <div className={`pt-1 border-t ${theme === 'midnight' ? 'border-purple-800/40 text-purple-300/60' : 'border-black/5 text-black/60'} text-[11px] italic`}>
                                  💡 科学提示：单轮刺激未达深度脱敏；超过 4 轮肌肉易疲劳引发代偿，2~3 轮为黄金耐力区间。
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Start Progressive Button */}
                        <button
                          onClick={() => startProgressiveMode(autoCycles)}
                          className={`w-full py-4 rounded-2xl font-black text-sm md:text-base tracking-widest flex items-center justify-center gap-2 ${
                            theme === 'midnight'
                              ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-lg shadow-rose-950/60'
                              : 'bg-rose-600 hover:bg-rose-700 shadow-md'
                          } text-white transition-all active:scale-98`}
                        >
                          <Play className="w-5 h-5 fill-white" />
                          开启渐进模式（共 {autoCycles} 轮 · {autoCycles * 10} 分钟）
                        </button>
                      </div>
                    </div>

                    {/* Secondary Mode Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                      {/* Random Mode Card */}
                      <button 
                        onClick={startRandomMode}
                        className={`w-full min-w-0 p-4 rounded-2xl text-left border flex flex-col justify-between ${
                          theme === 'midnight'
                            ? 'bg-[#1e1738] border-purple-800/50 text-rose-100 hover:bg-[#271e47]'
                            : `${t.buttonBg} ${t.buttonHover}`
                        } transition-all duration-200 active:scale-[0.98] shadow-xs group`}
                      >
                        <div className="flex items-center gap-3 mb-2 min-w-0">
                          <div className={`w-10 h-10 rounded-2xl ${
                            theme === 'midnight' ? 'bg-purple-900/40 text-rose-400' : 'bg-black/5'
                          } flex items-center justify-center shrink-0`}>
                            <Shuffle className={`w-5 h-5 ${theme === 'midnight' ? 'text-rose-400' : t.accent}`} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black tracking-wider">随机盲盒模式</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              theme === 'midnight' ? 'bg-purple-900/50 text-purple-300' : 'bg-black/5 opacity-70'
                            } mt-1 inline-block`}>未知刺激</span>
                          </div>
                        </div>
                        <div className="flex items-end justify-between w-full min-w-0">
                          <p className={`text-xs ${theme === 'midnight' ? 'text-purple-300/70' : 'opacity-60'} mt-0.5 max-w-[80%]`}>节奏完全随机变换，打破预设立场</p>
                          <Play className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      </button>

                      {/* Manual Custom Mode Card */}
                      <button 
                        onClick={startManualMode}
                        className={`w-full min-w-0 p-4 rounded-2xl text-left border flex flex-col justify-between ${
                          theme === 'midnight'
                            ? 'bg-[#1e1738] border-purple-800/50 text-rose-100 hover:bg-[#271e47]'
                            : `${t.buttonBg} ${t.buttonHover}`
                        } transition-all duration-200 active:scale-[0.98] shadow-xs group`}
                      >
                        <div className="flex items-center gap-3 mb-2 min-w-0">
                          <div className={`w-10 h-10 rounded-2xl ${
                            theme === 'midnight' ? 'bg-purple-900/40 text-rose-400' : 'bg-black/5'
                          } flex items-center justify-center shrink-0`}>
                            <SlidersHorizontal className={`w-5 h-5 ${theme === 'midnight' ? 'text-rose-400' : t.accent}`} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black tracking-wider">手动自定义模式</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              theme === 'midnight' ? 'bg-rose-900/50 text-rose-300' : 'bg-black/5 opacity-70'
                            } mt-1 inline-block`}>自由控制</span>
                          </div>
                        </div>
                        <div className="flex items-end justify-between w-full min-w-0">
                          <p className={`text-xs ${theme === 'midnight' ? 'text-purple-300/70' : 'opacity-60'} mt-0.5 max-w-[80%]`}>根据自身状态，自由切换各个节奏档位</p>
                          <Play className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      </button>
                    </div>

                  </div>

                  {/* Right Column: Telemetry, Community, History & Tips (5 cols on lg) */}
                  <div className="w-full min-w-0 lg:col-span-5 flex flex-col gap-4 md:gap-5 mt-5 lg:mt-0">
                    
                    {/* Live Online Community Interactive Card */}
                    <div className="w-full min-w-0">
                      <OnlineUserBadge variant="card" isDark={theme === 'midnight'} />
                    </div>

                    {/* Mobile Portrait Optimization Notice & Collapsible Toggle */}
                    {isMobilePortrait && (
                      <div className="w-full min-w-0 p-3 rounded-2xl bg-black/[0.03] border border-black/5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-700 font-bold min-w-0">
                          <Smartphone className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="truncate">竖屏模式：已优化布局释放操作视窗</span>
                        </div>
                        <button
                          onClick={() => setShowPortraitChartsManual(!showPortraitChartsManual)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-slate-900 font-black shadow-xs border border-black/5 text-[11px] active:scale-95 transition-all shrink-0"
                        >
                          {showPortraitChartsManual ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>收起图表</span>
                            </>
                          ) : (
                            <>
                              <BarChart3 className="w-3.5 h-3.5 text-rose-600" />
                              <span>展开图表</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Historical Cumulative Stats & Achievement Card (Simplified in Portrait unless expanded, full in Landscape/Desktop) */}
                    {(!isMobilePortrait || showPortraitChartsManual) && (
                      <div className={`w-full min-w-0 p-4 sm:p-5 rounded-3xl ${
                        theme === 'midnight' 
                          ? 'bg-[#1c1533] border-purple-800/40 text-rose-100' 
                          : 'bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-indigo-500/10 border-black/5'
                      } border shadow-xs backdrop-blur-md flex flex-col gap-3 text-left animate-fadeIn`}>
                        <div className="flex items-center justify-between w-full min-w-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-xs shrink-0">
                              <Trophy className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black tracking-wider">历史成就档案</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  theme === 'midnight' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-500/20 text-amber-900 border-amber-500/30'
                                } border`}>
                                  {getAchievementLevel(userStats.totalCycles, userStats.totalSeconds).level}
                                </span>
                              </div>
                              <div className={`text-[10px] sm:text-[11px] font-bold ${
                                theme === 'midnight' ? 'text-amber-200/80' : 'text-amber-900/80'
                              } truncate`}>
                                {getAchievementLevel(userStats.totalCycles, userStats.totalSeconds).title} · {getAchievementLevel(userStats.totalCycles, userStats.totalSeconds).desc}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 2-Metric Grid */}
                        <div className="grid grid-cols-2 gap-2.5 w-full min-w-0">
                          <div className={`w-full min-w-0 p-3 sm:p-3.5 rounded-2xl ${
                            theme === 'midnight' ? 'bg-[#251d42] border-purple-800/40' : 'bg-white/85 border-black/5'
                          } border flex items-center gap-2.5 shadow-xs`}>
                            <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-bold opacity-60 truncate">累积训练时长</div>
                              <div className={`text-sm sm:text-base font-black ${theme === 'midnight' ? 'text-rose-300' : 'text-rose-700'} tabular-nums truncate`}>
                                {formatTotalTime(userStats.totalSeconds)}
                              </div>
                            </div>
                          </div>

                          <div className={`w-full min-w-0 p-3 sm:p-3.5 rounded-2xl ${
                            theme === 'midnight' ? 'bg-[#251d42] border-purple-800/40' : 'bg-white/85 border-black/5'
                          } border flex items-center gap-2.5 shadow-xs`}>
                            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                              <RotateCcw className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-bold opacity-60 truncate">完成循环总数</div>
                              <div className={`text-sm sm:text-base font-black ${theme === 'midnight' ? 'text-purple-300' : 'text-purple-700'} tabular-nums truncate`}>
                                {userStats.totalCycles} <span className="text-xs font-bold opacity-75">轮</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Weekly 7-Day Training Frequency Heatmap Visualizer (Hidden in Mobile Portrait, Full in Landscape / Desktop) */}
                    {(!isMobilePortrait || showPortraitChartsManual) && (
                      <div className="w-full min-w-0 animate-fadeIn">
                        <WeeklyActivityChart userStats={userStats} isDark={theme === 'midnight'} />
                      </div>
                    )}

                    {/* Desktop / Landscape Mindful Advice Pill Card */}
                    <div className={`w-full min-w-0 hidden lg:flex p-4 rounded-2xl ${
                      theme === 'midnight' ? 'bg-[#1c1533] border-purple-800/40 text-purple-200/80' : 'bg-white/60 border-black/5 text-slate-600'
                    } border backdrop-blur-xs items-start gap-3 text-xs leading-relaxed`}>
                      <Heart className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <strong className={theme === 'midnight' ? 'text-rose-200' : 'text-slate-800'}>身心律动小贴士：</strong>
                        训练过程中请保持腹式深呼吸，肩膀与盆底肌肉放松，在冲刺阶梯时感受神经边缘张力，勿急于释放。
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            )}

            {/* PREPARING State - 3s Warmup Ritual */}
            {appState === 'PREPARING' && (
              <div 
                key={prepCount} 
                className="space-y-4 w-full flex flex-col items-center pointer-events-auto max-w-sm mx-auto text-center px-2 py-3"
                style={{ animation: 'prep-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              >
                {/* Live Real-time Clock & Online Count for Mindful Preparation */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <LiveClockBadge variant="hud" isDark={theme === 'midnight'} />
                  <OnlineUserBadge variant="hud" />
                </div>

                {/* Step Badge */}
                <div className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border shadow-xs text-xs font-black backdrop-blur-md ${PREP_STEPS[prepCount]?.badgeColor || 'bg-white/80'}`}>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                  <span>{PREP_STEPS[prepCount]?.tip}</span>
                </div>

                {/* Big Cute Countdown Capsule & Floating Emoji */}
                <div className="relative flex items-center justify-center py-1">
                  <div className="w-36 h-36 md:w-40 md:h-40 rounded-[2.5rem] bg-white/85 shadow-xl border border-white/60 backdrop-blur-md flex flex-col items-center justify-center relative">
                    <div 
                      className="text-4xl md:text-5xl mb-0.5 select-none"
                      style={{ animation: 'prep-float 2s ease-in-out infinite' }}
                    >
                      {PREP_STEPS[prepCount]?.emoji}
                    </div>
                    <div className="text-4xl md:text-5xl font-black tabular-nums tracking-tighter text-slate-800 flex items-center leading-none">
                      {prepCount}
                    </div>
                  </div>
                </div>

                {/* Ritual Guidance Text */}
                <div className="space-y-1 px-3">
                  <h2 className="text-2xl md:text-3xl font-black tracking-wider text-slate-900">
                    {PREP_STEPS[prepCount]?.title}
                  </h2>
                  <p className="text-xs md:text-sm font-bold opacity-75 leading-relaxed text-slate-700">
                    {PREP_STEPS[prepCount]?.desc}
                  </p>
                </div>

                {/* 3-Step Progress Indicators */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  {[3, 2, 1].map((step) => {
                    const isCurrent = prepCount === step;
                    const isDone = prepCount < step;
                    return (
                      <div 
                        key={step}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isCurrent 
                            ? 'w-7 bg-rose-500 shadow-xs' 
                            : isDone 
                              ? 'w-2.5 bg-rose-400/40' 
                              : 'w-2.5 bg-black/10'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Skip Countdown Button */}
                <div className="pt-1">
                  <button
                    onClick={() => executeStartRunning(targetMode, autoCycles)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/70 hover:bg-white text-xs font-bold opacity-75 hover:opacity-100 transition-all border border-black/5 active:scale-95 shadow-xs"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>跳过倒计时直接开始</span>
                  </button>
                </div>
              </div>
            )}

            {/* Climax State */}
            {appState === 'CLIMAX' && (
              <div className="space-y-5 text-center flex flex-col items-center pointer-events-auto py-8 w-full max-w-sm">
                <div className="w-16 h-16 rounded-full bg-amber-400/20 flex items-center justify-center text-3xl">
                  🏆
                </div>
                <div className="space-y-1">
                  <h2 className="text-4xl md:text-5xl font-black tracking-widest">极致释放</h2>
                  <p className="text-xs md:text-sm font-bold opacity-75 tracking-widest">
                    太棒了！已顺利完成全部 {autoCycles} 轮渐进律动训练
                  </p>
                </div>

                {/* Real-time Clock & Reminder Banner on Completion */}
                <LiveClockBadge variant="banner" />

                <button 
                  onClick={(e) => { e.stopPropagation(); setAppState('IDLE'); setTimeLeft(0); setBpm(30); }}
                  className={`mt-3 p-5 rounded-full ${t.buttonBg} ${t.buttonHover} transition-all duration-200 active:scale-90 shadow-xl inline-block`}
                  title="重新开始"
                >
                  <RotateCcw className="w-7 h-7 opacity-80" />
                </button>
              </div>
            )}

            {/* Running & Cooldown State */}
            {(appState === 'RUNNING' || appState === 'COOLDOWN') && (
              <div className="flex flex-col items-center justify-center space-y-3 md:space-y-4 w-full">
                
                {/* Mode & Cycle & Real Time Clock & Online Badges */}
                <div className="flex items-center gap-2 pointer-events-auto flex-wrap justify-center">
                  <LiveClockBadge variant="hud" isDark={theme === 'midnight'} />
                  <OnlineUserBadge variant="hud" isDark={theme === 'midnight'} />
                  <span className={`text-[11px] tracking-wider font-black opacity-85 px-3.5 py-1 rounded-full shadow-xs border ${
                    theme === 'midnight' ? 'bg-purple-950/70 text-purple-200 border-purple-800/60' : 'bg-white/70 text-slate-800 border-black/5'
                  }`}>
                    {appState === 'COOLDOWN' ? '降温休息中' : (
                      playMode === 'AUTO' ? `第 ${currentCycle} / ${autoCycles} 轮 · 阶梯渐进` : '随机盲盒模式'
                    )}
                  </span>
                  <span className="text-[10px] font-bold opacity-70 bg-white/50 px-3 py-1 rounded-full border border-black/5">
                    音色: {SOUND_PRESETS.find(s => s.id === soundType)?.name}
                  </span>
                </div>

                {/* Big BPM or Cooldown Center Display */}
                {appState === 'COOLDOWN' ? (
                  <div className="flex flex-col items-center my-2 sm:my-3 space-y-3">
                    {/* Translucent soothing breathing guidance */}
                    <div 
                      className="px-6 py-3 rounded-full bg-cyan-500/10 border border-cyan-400/20 backdrop-blur-sm shadow-xs flex items-center gap-2.5"
                      style={{
                        animation: 'cooldown-text-pulse 4s ease-in-out infinite'
                      }}
                    >
                      <Wind className="w-4 h-4 md:w-5 md:h-5 text-cyan-600 animate-pulse" />
                      <span className="text-sm sm:text-base md:text-lg font-black tracking-widest text-cyan-800">
                        深呼吸 · 让节奏慢下来
                      </span>
                    </div>

                    <div className="text-4xl sm:text-5xl md:text-6xl font-black text-cyan-700/60 tracking-wider">
                      双手离开
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center my-1 sm:my-2">
                    <div className={`text-7xl sm:text-8xl md:text-9xl font-black tabular-nums tracking-tighter drop-shadow-xs flex items-baseline justify-center ${isPressing ? 'scale-95' : 'scale-100'} transition-transform duration-200`}>
                      <span>{bpm}</span>
                      <span className="text-xl sm:text-2xl md:text-3xl ml-2 sm:ml-3 font-bold opacity-50 tracking-wider">bpm</span>
                    </div>
                    {playMode === 'AUTO' && (
                      <span className="text-xs sm:text-sm font-black opacity-65 tracking-widest mt-1">
                        {STAGE_NAMES[bpm].name} · {STAGE_NAMES[bpm].desc}
                      </span>
                    )}
                  </div>
                )}

                {/* Dynamic BPM Rhythm Waveform Indicator */}
                <RhythmWaveform 
                  bpm={bpm} 
                  pulse={pulse} 
                  isCooldown={appState === 'COOLDOWN'} 
                  className="my-1 pointer-events-auto" 
                />

                {/* Phrase Guide */}
                <div className="min-h-[2.5rem] flex items-center justify-center px-4">
                  <p className={`text-sm md:text-base font-bold text-center leading-relaxed tracking-wider ${
                    appState === 'COOLDOWN' 
                      ? 'text-cyan-900/80 font-medium italic' 
                      : (pulse ? 'scale-105 opacity-100' : 'scale-100 opacity-90')
                  } transition-all duration-200`}>
                    {phrase}
                  </p>
                </div>

                {/* Remaining Time Badge */}
                <div className="flex flex-col items-center">
                  <div className={`text-base md:text-lg font-black tabular-nums px-5 py-1 rounded-full shadow-xs border ${
                    appState === 'COOLDOWN'
                      ? 'bg-cyan-50/80 text-cyan-800 border-cyan-300/40 ring-2 ring-cyan-400/20'
                      : 'bg-white/60 border-black/5 opacity-80'
                  }`}>
                    {appState === 'COOLDOWN' ? `冷却倒计时：${formatTime(timeLeft)}` : formatTime(timeLeft)}
                  </div>
                </div>
                
                {/* 4-Stage Visual Progress Indicators for AUTO Mode */}
                {playMode === 'AUTO' && (
                  <div className="w-full max-w-xs pt-1 pointer-events-auto">
                    <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/5 rounded-full">
                      {([
                        { b: 30, label: '30 慢速' },
                        { b: 60, label: '60 匀速' },
                        { b: 90, label: '90 加速' },
                        { b: 120, label: '120 冲刺' }
                      ] as { b: BpmState; label: string }[]).map(({ b, label }) => {
                        const isActive = bpm === b;
                        return (
                          <div 
                            key={b} 
                            className={`py-1 px-1 rounded-full text-[10px] font-black transition-all duration-200 text-center ${
                              isActive 
                                ? `${t.buttonBg} shadow-xs font-black ring-1 ring-black/10 scale-100 text-rose-700` 
                                : 'opacity-40'
                            }`}
                          >
                            {label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Interactive Controls for MANUAL Mode */}
                {playMode === 'MANUAL' && appState === 'RUNNING' && (
                  <div className="w-full max-w-sm pt-2 pointer-events-auto px-4">
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { b: 30, label: '慢速', icon: '🐢' },
                        { b: 60, label: '匀速', icon: '🚶' },
                        { b: 90, label: '加速', icon: '🏃' },
                        { b: 120, label: '冲刺', icon: '🚀' }
                      ] as { b: BpmState; label: string; icon: string }[]).map(({ b, label, icon }) => {
                        const isActive = bpm === b;
                        return (
                          <button 
                            key={b}
                            onClick={(e) => {
                              e.stopPropagation();
                              setBpm(b);
                              metronome.setBpm(b);
                              updatePhrase(b);
                            }}
                            className={`py-2 px-1 rounded-2xl text-xs font-black transition-all duration-200 text-center flex flex-col items-center gap-1 shadow-sm active:scale-95 ${
                              isActive 
                                ? `${t.buttonBg} ring-2 ring-rose-400 text-rose-700 shadow-md scale-105` 
                                : `bg-white/60 hover:bg-white/90 text-slate-600 border border-black/5`
                            }`}
                          >
                            <span className="text-sm">{icon}</span>
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
        
        {/* Bottom Control Bar */}
        {(appState === 'RUNNING' || appState === 'COOLDOWN') && (
          <footer className="px-6 py-4 md:px-8 md:py-6 w-full shrink-0 z-20 pointer-events-auto">
            <div className="flex gap-3 w-full max-w-lg mx-auto">
              {appState === 'RUNNING' ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPrevBpm(bpm);
                    setAppState('COOLDOWN');
                    setTimeLeft(30);
                    setTotalDuration(30);
                  }}
                  className={`flex-1 py-3.5 md:py-4 rounded-2xl md:rounded-full text-xs md:text-sm font-black tracking-wider transition-all duration-200 active:scale-98 flex items-center justify-center gap-2 ${t.buttonBg} ${t.buttonHover} shadow-sm`}
                >
                  <Wind className="w-4 h-4 opacity-70" /> 降温休息
                </button>
              ) : (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setAppState('RUNNING');
                    if (playMode === 'RANDOM') {
                      setTimeLeft(0);
                    } else {
                      setBpm(prevBpm);
                      metronome.setBpm(prevBpm);
                      updatePhrase(prevBpm);
                      setTimeLeft(STAGE_DURATIONS[prevBpm]);
                      setTotalDuration(STAGE_DURATIONS[prevBpm]);
                    }
                  }}
                  className={`flex-1 py-3.5 md:py-4 rounded-2xl md:rounded-full text-xs md:text-sm font-black tracking-wider transition-all duration-200 active:scale-98 flex items-center justify-center gap-2 ${t.buttonBg} ${t.buttonHover} shadow-sm`}
                >
                  <Play className="w-4 h-4 opacity-70" /> 恢复节奏
                </button>
              )}
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setAppState('CLIMAX'); 
                  setShowParticles(true); 
                }}
                className="flex-1 py-3.5 md:py-4 rounded-2xl md:rounded-full text-xs md:text-sm font-black tracking-wider transition-all duration-200 active:scale-98 flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md"
              >
                <Sparkles className="w-4 h-4 opacity-80" /> 极致释放
              </button>
            </div>
          </footer>
        )}

      </div>
      
      {/* Particles effect overlay */}
      {showParticles && (
        <ParticleEffect 
          colors={t.particleColors} 
          onComplete={() => setShowParticles(false)} 
        />
      )}
    </div>
  );
}
