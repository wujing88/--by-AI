import { useState, useEffect, useCallback, useRef } from 'react';
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
  Heart
} from 'lucide-react';
import { metronome } from './utils/audio';
import ParticleEffect from './components/ParticleEffect';
import { 
  AppState, 
  BpmState, 
  ThemeType, 
  THEMES, 
  PHRASES, 
  PlayMode, 
  SoundType, 
  SOUND_PRESETS 
} from './types';

export default function App() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [playMode, setPlayMode] = useState<PlayMode>('AUTO');
  const [bpm, setBpm] = useState<BpmState>(30);
  const [prevBpm, setPrevBpm] = useState<BpmState>(30);
  const [theme, setTheme] = useState<ThemeType>('peach');
  const [soundType, setSoundType] = useState<SoundType>('impact');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(1);
  const [phrase, setPhrase] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('rhythm_muted');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [showParticles, setShowParticles] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'sound' | 'theme'>('sound');
  const [pulse, setPulse] = useState(false);
  const [isPressing, setIsPressing] = useState(false);

  // Progressive Cycle Settings
  const [autoCycles, setAutoCycles] = useState<number>(2); // Default recommended 2 cycles
  const [currentCycle, setCurrentCycle] = useState<number>(1);
  const [showCycleWhy, setShowCycleWhy] = useState<boolean>(false);

  // Preparation Countdown State
  const [targetMode, setTargetMode] = useState<PlayMode>('AUTO');
  const [prepCount, setPrepCount] = useState<number>(3);

  // User Cumulative History Stats
  const [userStats, setUserStats] = useState<{
    totalSeconds: number;
    totalCycles: number;
    completedSessions: number;
  }>(() => {
    try {
      const saved = localStorage.getItem('rhythm_user_stats');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return { totalSeconds: 0, totalCycles: 0, completedSessions: 0 };
  });

  // Save Stats to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('rhythm_user_stats', JSON.stringify(userStats));
    } catch (e) {
      console.error(e);
    }
  }, [userStats]);

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

  useEffect(() => {
    metronome.setMuted(muted);
    try {
      localStorage.setItem('rhythm_muted', String(muted));
    } catch (e) {
      console.error(e);
    }
  }, [muted]);

  useEffect(() => {
    metronome.setSoundType(soundType);
  }, [soundType]);

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
    } else {
      setPlayMode('RANDOM');
      setCurrentCycle(1);
      setBpm(60);
      metronome.setBpm(60);
      setTimeLeft(0);
      updatePhrase(60);
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
    if (appState === 'PREPARING') {
      const interval = window.setInterval(() => {
        setPrepCount((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            executeStartRunning(targetMode, autoCycles);
            return 1;
          }
          try {
            metronome.playSample(soundType);
          } catch {}
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [appState, targetMode, autoCycles, soundType, executeStartRunning]);

  // Start Progressive Mode (with 3s preparation)
  const startProgressiveMode = (cycles: number = autoCycles) => {
    startPreparation('AUTO', cycles);
  };

  // Start Random Blind Box Mode (with 3s preparation)
  const startRandomMode = () => {
    startPreparation('RANDOM');
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
          // Increment total cumulative active training seconds
          setUserStats(s => ({ ...s, totalSeconds: s.totalSeconds + 1 }));

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
      } else if (playMode === 'AUTO') {
        timerRef.current = window.setInterval(() => {
          // Increment total cumulative active training seconds
          setUserStats(s => ({ ...s, totalSeconds: s.totalSeconds + 1 }));

          setTimeLeft((prev) => {
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
                setUserStats(s => ({ ...s, totalCycles: s.totalCycles + 1 }));

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
                  setUserStats(s => ({ ...s, completedSessions: s.completedSessions + 1 }));
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
        setUserStats(s => ({ ...s, totalSeconds: s.totalSeconds + 1 }));

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

  return (
    <div 
      className={`min-h-[100dvh] w-full ${t.appBg} ${t.text} transition-colors duration-700 font-sans flex flex-col items-center justify-center p-0 md:p-6 relative overflow-x-hidden`}
    >
      
      <div className={`flex flex-col justify-between w-full h-[100dvh] md:h-auto md:max-w-2xl md:min-h-[720px] ${t.cardBg} md:rounded-[2.5rem] md:shadow-2xl md:border ${t.border} relative overflow-hidden transition-all duration-700`}>

        {/* Atmosphere Glow Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-500 ease-out z-0"
          style={{
            backgroundColor: (appState === 'RUNNING' || appState === 'COOLDOWN') ? t.glow.replace('0.2', '0.12') : 'transparent',
            opacity: (appState === 'RUNNING' || appState === 'COOLDOWN') ? (pulse || isPressing ? 1 : 0.35) : 0,
          }}
        />
        
        {/* Top Progress Bar */}
        {(appState === 'RUNNING' || appState === 'COOLDOWN') && (
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-black/5 z-50 overflow-hidden">
            <div 
              className={`h-full ${appState === 'COOLDOWN' ? 'bg-blue-400' : t.progress} transition-all duration-1000 ease-linear rounded-r-full`}
              style={{ 
                width: `${Math.max(0, Math.min(100, (timeLeft / totalDuration) * 100))}%`
              }}
            />
          </div>
        )}

        {/* Top Bar Header */}
        <header className="px-6 py-4 md:px-8 md:py-6 flex justify-between items-center z-20 shrink-0">
          <div className="flex items-center gap-3">
            {appState !== 'IDLE' && (
              <button 
                onClick={() => {
                  setAppState('IDLE');
                  metronome.stop(true, 0.4);
                  setShowParticles(false);
                }}
                className={`p-3 rounded-full ${t.buttonBg} ${t.buttonHover} transition-all duration-200 active:scale-95 shadow-sm`}
                title="返回主页"
              >
                <Home className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-xl md:text-2xl font-black tracking-wider flex items-center gap-2">
              <Flame className={`w-6 h-6 ${t.accent}`} />
              <span>律动</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMuted(!muted)} 
              className={`relative p-3 rounded-full transition-all duration-300 active:scale-95 shadow-sm ${
                muted 
                  ? 'bg-rose-500/20 text-rose-700 border border-rose-400/50 ring-2 ring-rose-400/60 shadow-[0_0_16px_rgba(244,63,94,0.4)] animate-pulse' 
                  : `${t.buttonBg} ${t.buttonHover}`
              }`}
              title={muted ? '当前处于静音状态（点击开启声音）' : '点击静音'}
            >
              {muted ? (
                <div className="relative flex items-center justify-center">
                  <VolumeX className="w-5 h-5 text-rose-600" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                  </span>
                </div>
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className={`p-3 rounded-full ${t.buttonBg} ${t.buttonHover} transition-all duration-200 active:scale-95 shadow-sm`}
              title="偏好设置"
            >
              <Settings2 className="w-5 h-5" />
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
                            metronome.playSample(preset.id);
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
                <div className="space-y-2.5">
                  <div className="text-xs font-bold opacity-50 px-1">选择治愈系马卡龙色彩：</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {([
                      ['peach', '蜜桃粉', 'bg-rose-100 border-rose-300 text-rose-800', '🌸'],
                      ['mint', '薄荷绿', 'bg-teal-100 border-teal-300 text-teal-800', '🍃'],
                      ['taro', '香芋紫', 'bg-purple-100 border-purple-300 text-purple-800', '🍇'],
                      ['cheese', '芝士黄', 'bg-amber-100 border-amber-300 text-amber-800', '🧀']
                    ] as const).map(([key, name, colorClass, emoji]) => (
                      <button
                        key={key}
                        onClick={() => setTheme(key)}
                        className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all duration-200 active:scale-95 ${colorClass} ${
                          theme === key ? 'ring-2 ring-current shadow-md scale-[1.02]' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <span className="text-2xl">{emoji}</span>
                        <span className="text-sm font-black">{name}</span>
                      </button>
                    ))}
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
          className="flex-1 flex flex-col items-center justify-center relative w-full px-5 py-4 cursor-pointer touch-manipulation z-10 min-h-0"
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
                className="absolute w-72 h-72 md:w-96 md:h-96 rounded-full border-4 border-blue-400/30"
                style={{
                  animation: 'breathe-circle 5s ease-in-out infinite'
                }}
              />
            )}

            {appState === 'PREPARING' && (
              <>
                {/* Outer Rotating Dotted Ring */}
                <div 
                  className="absolute w-72 h-72 md:w-96 md:h-96 rounded-full border-2 border-dashed border-rose-400/35 pointer-events-none"
                  style={{
                    animation: 'prep-ring-spin 20s linear infinite'
                  }}
                />
                {/* Core Soft Ambient Pulse Ring */}
                <div 
                  className="absolute w-60 h-60 md:w-80 md:h-80 rounded-full bg-gradient-to-tr from-rose-400/20 via-amber-300/20 to-indigo-300/20 pointer-events-none blur-sm"
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
                  className="absolute w-72 h-72 md:w-[26rem] md:h-[26rem] rounded-full border-2 border-cyan-400/40 bg-cyan-300/10 pointer-events-none"
                  style={{
                    animation: 'cooldown-halo 6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                    filter: 'blur(1px)'
                  }}
                />
                {/* Core Calming Breath Ring */}
                <div 
                  className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full border-[3px] border-blue-400/50 bg-blue-400/15 pointer-events-none shadow-[0_0_50px_rgba(56,189,248,0.25)]"
                  style={{
                    animation: 'cooldown-breathe 6s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                  }}
                />
              </>
            )}

            {appState === 'RUNNING' && (
              <>
                <div 
                  className={`w-64 h-64 md:w-80 md:h-80 rounded-full border transition-all duration-300 ease-out ${t.border}`}
                  style={{
                    transform: pulse ? 'scale(1.08)' : (isPressing ? 'scale(0.96)' : 'scale(1)'),
                    opacity: pulse ? 0.9 : (isPressing ? 0.6 : 0.25),
                    backgroundColor: pulse ? t.glow : (isPressing ? t.glow : 'transparent')
                  }}
                />
                <div 
                  className={`absolute w-64 h-64 md:w-80 md:h-80 rounded-full border-[1px] transition-all duration-500 ease-out ${t.border}`}
                  style={{
                    transform: pulse ? 'scale(1.22)' : (isPressing ? 'scale(0.92)' : 'scale(1)'),
                    opacity: pulse ? 0 : (isPressing ? 0.7 : 0)
                  }}
                />
              </>
            )}
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg pointer-events-none">
            
            {!audioEnabled && (
              <div className={`mb-3 inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black tracking-widest ${t.buttonBg} shadow-sm animate-bounce pointer-events-auto`}>
                <Info className="w-4 h-4 shrink-0" />
                点击屏幕激活声音 · 开启律动
              </div>
            )}

            {/* IDLE State - Progressive Mode & Random Mode */}
            {appState === 'IDLE' && (
              <div className="space-y-4 w-full flex flex-col items-center pointer-events-auto">
                <div className="space-y-1 text-center">
                  <h2 className="text-2xl md:text-3xl font-black tracking-widest">律动训练</h2>
                  <p className="text-xs font-bold opacity-60 tracking-wider">科学阶梯节奏递进 · 突破持久耐力</p>
                </div>

                {/* Historical Cumulative Stats & Achievement Card */}
                <div className="w-full p-4 rounded-3xl bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-black/5 shadow-xs backdrop-blur-md flex flex-col gap-2.5 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center shadow-xs">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black tracking-wider">历史成就档案</span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-500/30">
                            {getAchievementLevel(userStats.totalCycles, userStats.totalSeconds).level}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-amber-900/80">
                          {getAchievementLevel(userStats.totalCycles, userStats.totalSeconds).title} · {getAchievementLevel(userStats.totalCycles, userStats.totalSeconds).desc}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2-Metric Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-2xl bg-white/80 border border-black/5 flex items-center gap-2.5 shadow-xs">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold opacity-60">累积训练时长</div>
                        <div className="text-sm font-black text-rose-700 tabular-nums truncate">
                          {formatTotalTime(userStats.totalSeconds)}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/80 border border-black/5 flex items-center gap-2.5 shadow-xs">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                        <RotateCcw className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold opacity-60">完成循环总数</div>
                        <div className="text-sm font-black text-purple-700 tabular-nums">
                          {userStats.totalCycles} <span className="text-xs font-bold opacity-75">轮</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Progressive Mode Card with Cycle Count Selector */}
                <div className={`w-full p-4 md:p-5 rounded-3xl border ${t.buttonBg} shadow-sm flex flex-col gap-3.5 text-left`}>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-black/5 flex items-center justify-center">
                        <TrendingUp className={`w-5 h-5 ${t.accent}`} />
                      </div>
                      <div>
                        <h3 className="text-base font-black tracking-wider flex items-center gap-2">
                          循序渐进模式
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600">
                            4 阶段递进
                          </span>
                        </h3>
                        <p className="text-xs opacity-60 mt-0.5">30 → 60 → 90 → 120 BPM 自动升级，单轮 10 分钟</p>
                      </div>
                    </div>
                  </div>

                  {/* Cycle Counter Selector & Recommendation */}
                  <div className="p-3 bg-black/[0.03] rounded-2xl space-y-2.5 border border-black/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black">
                        <Target className="w-4 h-4 opacity-70" />
                        <span>训练循环次数：</span>
                      </div>
                      
                      {/* Recommendation Badge */}
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 text-[11px] font-black border border-amber-500/20">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        <span>推荐 2~3 轮 (20~30分钟)</span>
                      </div>
                    </div>

                    {/* Cycle Pills */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {([1, 2, 3, 4] as number[]).map((cycleNum) => {
                        const isSelected = autoCycles === cycleNum;
                        const isRecommended = cycleNum === 2 || cycleNum === 3;
                        return (
                          <button
                            key={cycleNum}
                            onClick={() => setAutoCycles(cycleNum)}
                            className={`py-2 px-1 rounded-xl text-center transition-all duration-200 flex flex-col items-center justify-center relative ${
                              isSelected
                                ? 'bg-black/80 text-white font-black shadow-sm scale-[1.02]'
                                : 'bg-white/80 hover:bg-white text-current font-bold border border-black/5 opacity-80'
                            }`}
                          >
                            <span className="text-xs font-black">{cycleNum} 轮</span>
                            <span className="text-[9px] opacity-70 mt-0.5">{cycleNum * 10} 分钟</span>
                            {isRecommended && !isSelected && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* "Why is this recommended?" Accordion */}
                    <div className="pt-1">
                      <button
                        onClick={() => setShowCycleWhy(!showCycleWhy)}
                        className="w-full flex items-center justify-between text-[11px] font-bold opacity-75 hover:opacity-100 transition-opacity py-1 px-0.5"
                      >
                        <span className="flex items-center gap-1 text-rose-700">
                          <HelpCircle className="w-3.5 h-3.5" />
                          为什么科学推荐循环 2~3 轮？
                        </span>
                        {showCycleWhy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {showCycleWhy && (
                        <div className="mt-2 p-3 rounded-xl bg-white/90 border border-black/5 text-[11px] leading-relaxed space-y-1.5 animate-fadeIn">
                          <div className="flex gap-1.5">
                            <span className="font-black text-rose-600 shrink-0">第 1 轮：</span>
                            <span className="opacity-80"><strong>唤醒与神经脱敏</strong> · 从 30 BPM 慢速渐入 120 冲刺，让敏感神经适应刺激节奏，建立第一道耐受防线。</span>
                          </div>
                          <div className="flex gap-1.5">
                            <span className="font-black text-amber-600 shrink-0">第 2 轮：</span>
                            <span className="opacity-80"><strong>强化控精与边缘掌控（核心）</strong> · 在高度兴奋阈值下骤然回到 30 BPM 急刹车，极度强化边缘控精（Edging）耐力。</span>
                          </div>
                          <div className="flex gap-1.5">
                            <span className="font-black text-teal-600 shrink-0">第 3 轮：</span>
                            <span className="opacity-80"><strong>突破生理持久上限</strong> · 重塑射精反射弧与神经阻断，达成身心自如的长效持久掌控。</span>
                          </div>
                          <div className="pt-1 border-t border-black/5 text-[10px] text-black/60 italic">
                            💡 科学提示：单轮刺激未达深度脱敏；超过 4 轮肌肉易疲劳引发代偿，2~3 轮为黄金耐力区间。
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Start Progressive Button */}
                  <button
                    onClick={() => startProgressiveMode(autoCycles)}
                    className={`w-full py-3.5 rounded-2xl font-black text-xs md:text-sm tracking-widest flex items-center justify-center gap-2 bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-md active:scale-98`}
                  >
                    <Play className="w-4 h-4 fill-white" />
                    开启渐进模式（共 {autoCycles} 轮 · {autoCycles * 10} 分钟）
                  </button>
                </div>

                {/* Secondary Random Mode Card */}
                <button 
                  onClick={startRandomMode}
                  className={`w-full p-4 rounded-3xl text-left border ${t.buttonBg} ${t.buttonHover} transition-all duration-200 active:scale-[0.98] shadow-sm flex items-center justify-between group`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-black/5 flex items-center justify-center">
                      <Shuffle className={`w-5 h-5 ${t.accent}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm md:text-base font-black tracking-wider">随机盲盒模式</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/5 opacity-70">未知刺激</span>
                      </div>
                      <p className="text-xs opacity-60 mt-0.5">节奏与时长完全随机变换，打破预设立场</p>
                    </div>
                  </div>
                  <Play className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            )}

            {/* PREPARING State - 3s Warmup Ritual */}
            {appState === 'PREPARING' && (
              <div 
                key={prepCount} 
                className="space-y-5 w-full flex flex-col items-center pointer-events-auto max-w-sm mx-auto text-center px-2 py-4"
                style={{ animation: 'prep-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              >
                {/* Step Badge */}
                <div className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border shadow-xs text-xs font-black backdrop-blur-md ${PREP_STEPS[prepCount]?.badgeColor || 'bg-white/80'}`}>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                  <span>{PREP_STEPS[prepCount]?.tip}</span>
                </div>

                {/* Big Cute Countdown Capsule & Floating Emoji */}
                <div className="relative flex items-center justify-center py-2">
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
                <div className="pt-2">
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
              <div className="space-y-5 text-center flex flex-col items-center pointer-events-auto py-8">
                <div className="w-16 h-16 rounded-full bg-amber-400/20 flex items-center justify-center text-3xl">
                  🏆
                </div>
                <div className="space-y-1">
                  <h2 className="text-4xl md:text-5xl font-black tracking-widest">极致释放</h2>
                  <p className="text-xs md:text-sm font-bold opacity-75 tracking-widest">
                    太棒了！已顺利完成全部 {autoCycles} 轮渐进律动训练
                  </p>
                </div>
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
                
                {/* Mode & Cycle Badges */}
                <div className="flex items-center gap-2 pointer-events-auto flex-wrap justify-center">
                  <span className="text-[11px] tracking-wider font-black opacity-85 bg-white/70 px-3.5 py-1 rounded-full shadow-xs border border-black/5">
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
                  <div className="flex flex-col items-center my-2 space-y-2.5">
                    {/* Translucent soothing breathing guidance */}
                    <div 
                      className="px-5 py-2.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 backdrop-blur-sm shadow-xs flex items-center gap-2"
                      style={{
                        animation: 'cooldown-text-pulse 4s ease-in-out infinite'
                      }}
                    >
                      <Wind className="w-4 h-4 text-cyan-600 animate-pulse" />
                      <span className="text-sm md:text-base font-black tracking-widest text-cyan-800">
                        深呼吸 · 让节奏慢下来
                      </span>
                    </div>

                    <div className="text-4xl md:text-5xl font-black text-cyan-700/60 tracking-wider">
                      双手离开
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center my-0.5">
                    <div className={`text-7xl md:text-8xl font-black tabular-nums tracking-tighter drop-shadow-sm flex items-baseline justify-center ${isPressing ? 'scale-95' : 'scale-100'} transition-transform duration-200`}>
                      <span>{bpm}</span>
                      <span className="text-xl md:text-2xl ml-2 font-bold opacity-50 tracking-wider">bpm</span>
                    </div>
                    {playMode === 'AUTO' && (
                      <span className="text-xs font-black opacity-60 tracking-widest mt-1">
                        {STAGE_NAMES[bpm].name} · {STAGE_NAMES[bpm].desc}
                      </span>
                    )}
                  </div>
                )}

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
