import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Wind,
  Settings2,
  ArrowLeft,
  X,
  Music,
  Palette,
  Check,
  Shuffle,
  ChevronDown,
  ChevronUp,
  FastForward,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  Monitor,
  Moon,
  Sun,
  BarChart3,
  EyeOff,
  Square,
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
  UserStats,
} from './types';
import {
  getUserStats,
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
  setStoredAutoCycles,
} from './utils/storage';

const STAGE_DURATIONS: Record<BpmState, number> = {
  30: 180,
  60: 240,
  90: 120,
  120: 60,
};

const STAGE_META: Record<BpmState, { name: string; desc: string; short: string; mins: string }> = {
  30: { name: '慢速试探', desc: '深长呼吸 · 建立基准', short: '慢速', mins: '3m' },
  60: { name: '稳定匀速', desc: '均匀节律 · 平稳推进', short: '匀速', mins: '4m' },
  90: { name: '深入加速', desc: '提升频率 · 保持冷静', short: '加速', mins: '2m' },
  120: { name: '极致冲刺', desc: '高频输出 · 掌控边缘', short: '冲刺', mins: '1m' },
};

const PREP_STEPS: Record<number, { title: string; desc: string; step: string }> = {
  3: {
    title: '调整姿态',
    desc: '放松肩颈与腰腹，保持舒适稳定的训练姿势',
    step: '01 / 03',
  },
  2: {
    title: '平缓深呼吸',
    desc: '缓慢吸气与呼气，将注意力集中至即将开始的节拍',
    step: '02 / 03',
  },
  1: {
    title: '准备切入节拍',
    desc: '跟随听觉提示与底部律动轨，稳步掌控全程节奏',
    step: '03 / 03',
  },
};

const THEME_ORDER: ThemeType[] = ['midnight', 'peach', 'mint', 'taro', 'cheese'];

export default function App() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [playMode, setPlayMode] = useState<PlayMode>('AUTO');
  const [bpm, setBpm] = useState<BpmState>(30);
  const [prevBpm, setPrevBpm] = useState<BpmState>(30);
  const [theme, setTheme] = useState<ThemeType>(() => getStoredTheme('midnight'));
  const [followSystemTheme, setFollowSystemTheme] = useState<boolean>(() =>
    getStoredFollowSystemTheme(false)
  );
  const [favoriteLightTheme, setFavoriteLightTheme] = useState<ThemeType>(() =>
    getStoredFavoriteLightTheme('peach')
  );
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [soundType, setSoundType] = useState<SoundType>(() => getStoredSoundType('impact'));
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

  // Fullscreen state (progressive enhancement)
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Progressive Cycle Settings
  const [autoCycles, setAutoCycles] = useState<number>(() => getStoredAutoCycles(2));
  const [currentCycle, setCurrentCycle] = useState<number>(1);
  const [showCycleWhy, setShowCycleWhy] = useState<boolean>(false);

  // Preparation Countdown State
  const [targetMode, setTargetMode] = useState<PlayMode>('AUTO');
  const [prepCount, setPrepCount] = useState<number>(3);

  // User Cumulative History Stats
  const [userStats, setUserStats] = useState<UserStats>(() => getUserStats());

  // Mobile portrait compact archive toggle
  const [isMobilePortrait, setIsMobilePortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 && window.innerHeight > window.innerWidth;
  });
  const [showPortraitArchive, setShowPortraitArchive] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const t = THEMES[theme];
  const isDark = t.isDark;
  const isFocusMode = appState !== 'IDLE';
  const isEdgeWarning =
    appState === 'RUNNING' && playMode === 'AUTO' && bpm === 120 && timeLeft > 0 && timeLeft <= 10;

  // Sync document .dark class & browser theme-color meta tag
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', t.metaColor);
    }
  }, [isDark, t.metaColor]);

  // Persist settings
  useEffect(() => {
    setStoredTheme(theme);
  }, [theme]);

  useEffect(() => {
    setStoredFollowSystemTheme(followSystemTheme);
  }, [followSystemTheme]);

  useEffect(() => {
    setStoredFavoriteLightTheme(favoriteLightTheme);
  }, [favoriteLightTheme]);

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

  // System dark mode listener (only overrides when followSystemTheme is explicitly enabled)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const syncThemeWithSystem = (darkMatch: boolean) => {
      setSystemIsDark(darkMatch);
      if (followSystemTheme) {
        setTheme(darkMatch ? 'midnight' : favoriteLightTheme);
      }
    };

    syncThemeWithSystem(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => syncThemeWithSystem(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [followSystemTheme, favoriteLightTheme]);

  // Viewport orientation check
  useEffect(() => {
    const updateViewport = () => {
      setIsMobilePortrait(window.innerWidth < 768 && window.innerHeight > window.innerWidth);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  // Fullscreen capability detection & sync
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setCanFullscreen(Boolean(document.fullscreenEnabled));
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === 'undefined' || !document.fullscreenEnabled) return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Gracefully ignore in sandboxed iframes or restricted browsers
    }
  }, []);

  // Screen Wake Lock during active training/cooldown to keep mobile display awake
  useEffect(() => {
    const shouldLock =
      appState === 'PREPARING' || appState === 'RUNNING' || appState === 'COOLDOWN';

    const requestLock = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
        };
        if (nav.wakeLock && !wakeLockRef.current) {
          wakeLockRef.current = await nav.wakeLock.request('screen');
        }
      } catch {
        // Ignore if unsupported or blocked
      }
    };

    const releaseLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch {}
        wakeLockRef.current = null;
      }
    };

    if (shouldLock) {
      requestLock();
    } else {
      releaseLock();
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldLock) {
        requestLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      releaseLock();
    };
  }, [appState]);

  // Sync real-time training presence with Cloudflare Worker / Node server
  useEffect(() => {
    const isTraining = appState === 'RUNNING' || appState === 'COOLDOWN';
    realtimePresence.setTrainingState(isTraining, bpm);
  }, [appState, bpm]);

  // Metronome Beat Pulse callback
  useEffect(() => {
    metronome.onBeat = () => {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 130);
    };
  }, []);

  const updatePhrase = useCallback((currentBpm: BpmState) => {
    const list = PHRASES[currentBpm];
    setPhrase(list[Math.floor(Math.random() * list.length)]);
  }, []);

  const initAudio = useCallback(() => {
    if (!audioEnabled) {
      metronome.init();
      setAudioEnabled(true);
    }
  }, [audioEnabled]);

  const exitToConsole = useCallback(() => {
    setAppState('IDLE');
    metronome.stop(true, 0.35);
    setShowParticles(false);
    setTimeLeft(0);
    setBpm(30);
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Execute Running Stage
  const executeStartRunning = useCallback(
    (mode: PlayMode = targetMode, cycles: number = autoCycles) => {
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
        setTotalDuration(1);
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
    },
    [targetMode, autoCycles, initAudio, updatePhrase]
  );

  // Start 3-second Preparation Ritual
  const startPreparation = useCallback(
    (mode: PlayMode, cycles: number = autoCycles) => {
      initAudio();
      setTargetMode(mode);
      setAutoCycles(cycles);
      setPrepCount(3);
      setAppState('PREPARING');
      try {
        metronome.playSample(soundType);
      } catch {}
    },
    [autoCycles, initAudio, soundType]
  );

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

  // Main Training & Cooldown Timer State Machine
  useEffect(() => {
    if (appState === 'IDLE' || appState === 'CLIMAX') {
      metronome.stop(true, 0.35);
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }

    if (appState === 'RUNNING') {
      metronome.start(bpm, true);

      if (playMode === 'RANDOM') {
        if (timeLeft === 0) {
          const newDuration = Math.floor(Math.random() * 105) + 15;
          setTimeLeft(newDuration);
          setTotalDuration(newDuration);
          updatePhrase(bpm);
        }

        timerRef.current = window.setInterval(() => {
          setUserStats((s) => recordTrainingSeconds(s, 1));

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

          if (Math.random() < 0.08) {
            setBpm((b) => {
              updatePhrase(b);
              return b;
            });
          }
        }, 1000);
      } else if (playMode === 'MANUAL') {
        timerRef.current = window.setInterval(() => {
          setUserStats((s) => recordTrainingSeconds(s, 1));
          setTimeLeft((prev) => prev + 1);
        }, 1000);
      } else if (playMode === 'AUTO') {
        timerRef.current = window.setInterval(() => {
          setUserStats((s) => recordTrainingSeconds(s, 1));

          setTimeLeft((prev) => {
            const nextVal = prev - 1;

            if (bpm === 120 && nextVal <= 10 && nextVal >= 1) {
              try {
                metronome.playEdgeWarning(nextVal);
              } catch {}
              if (nextVal === 10) {
                setPhrase('最后 10 秒冲刺，稳定呼吸锁定临界边界');
              }
            }

            if (prev <= 1) {
              let nextBpm: BpmState | null = null;
              if (bpm === 30) nextBpm = 60;
              else if (bpm === 60) nextBpm = 90;
              else if (bpm === 90) nextBpm = 120;

              if (nextBpm) {
                setBpm(nextBpm);
                metronome.setBpm(nextBpm);
                updatePhrase(nextBpm);
                setTotalDuration(STAGE_DURATIONS[nextBpm]);
                return STAGE_DURATIONS[nextBpm];
              } else {
                setUserStats((s) => recordCycle(s));

                if (currentCycle < autoCycles) {
                  const nextCycleNum = currentCycle + 1;
                  setCurrentCycle(nextCycleNum);
                  setBpm(30);
                  metronome.setBpm(30);
                  setPhrase(`进入第 ${nextCycleNum} 轮 · 降至 30 BPM 平复呼吸`);
                  setTotalDuration(STAGE_DURATIONS[30]);
                  return STAGE_DURATIONS[30];
                } else {
                  setUserStats((s) => recordSession(s));
                  setAppState('CLIMAX');
                  setShowParticles(true);
                  return 0;
                }
              }
            }
            return prev - 1;
          });

          if (Math.random() < 0.05) {
            setBpm((b) => {
              updatePhrase(b);
              return b;
            });
          }
        }, 1000);
      }
    } else if (appState === 'COOLDOWN') {
      metronome.stop(true, 0.5);
      setBpm(30);
      setPhrase('双手离开，进行 4 秒吸气与 4 秒慢呼');

      if (timeLeft === 0) {
        setTimeLeft(30);
        setTotalDuration(30);
      }

      timerRef.current = window.setInterval(() => {
        setUserStats((s) => recordTrainingSeconds(s, 1));

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
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [appState, playMode, bpm, prevBpm, currentCycle, autoCycles, updatePhrase]);

  const enterCooldown = useCallback(() => {
    setPrevBpm(bpm);
    setAppState('COOLDOWN');
    setTimeLeft(30);
    setTotalDuration(30);
  }, [bpm]);

  const resumeFromCooldown = useCallback(() => {
    setAppState('RUNNING');
    if (playMode === 'RANDOM') {
      setTimeLeft(0);
    } else if (playMode === 'MANUAL') {
      setBpm(prevBpm);
      metronome.setBpm(prevBpm);
      updatePhrase(prevBpm);
      setTimeLeft(0);
      setTotalDuration(0);
    } else {
      setBpm(prevBpm);
      metronome.setBpm(prevBpm);
      updatePhrase(prevBpm);
      setTimeLeft(STAGE_DURATIONS[prevBpm]);
      setTotalDuration(STAGE_DURATIONS[prevBpm]);
    }
  }, [playMode, prevBpm, updatePhrase]);

  const switchManualBpm = useCallback(
    (nextBpm: BpmState) => {
      setBpm(nextBpm);
      metronome.setBpm(nextBpm);
      updatePhrase(nextBpm);
    },
    [updatePhrase]
  );

  // Keyboard shortcuts: Space (toggle/start), Escape (close/back), 1-4 (manual BPM)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSettings) {
          setShowSettings(false);
          return;
        }
        if (appState !== 'IDLE') {
          exitToConsole();
        }
        return;
      }

      if (showSettings) return;

      if (e.code === 'Space') {
        const targetTag = (e.target as HTMLElement | null)?.tagName;
        if (targetTag === 'BUTTON' || targetTag === 'INPUT') return;
        e.preventDefault();
        initAudio();
        if (appState === 'RUNNING') {
          enterCooldown();
        } else if (appState === 'COOLDOWN') {
          resumeFromCooldown();
        } else if (appState === 'PREPARING') {
          executeStartRunning(targetMode, autoCycles);
        } else if (appState === 'IDLE') {
          startPreparation('AUTO', autoCycles);
        }
      } else if (appState === 'RUNNING' && playMode === 'MANUAL') {
        const map: Record<string, BpmState> = {
          '1': 30,
          '2': 60,
          '3': 90,
          '4': 120,
        };
        if (map[e.key]) {
          switchManualBpm(map[e.key]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    appState,
    playMode,
    showSettings,
    autoCycles,
    targetMode,
    initAudio,
    enterCooldown,
    resumeFromCooldown,
    executeStartRunning,
    startPreparation,
    exitToConsole,
    switchManualBpm,
  ]);

  const handleStageTap = useCallback(() => {
    initAudio();
    if (appState === 'RUNNING' || appState === 'COOLDOWN') {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12);
      }
    }
  }, [appState, initAudio]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatTotalTime = (totalSecs: number) => {
    if (totalSecs <= 0) return '0 分钟';
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes} 分 ${seconds > 0 ? `${seconds} 秒` : ''}`.trim();
    return `${seconds} 秒`;
  };

  const getRankInfo = (cycles: number, seconds: number) => {
    if (cycles >= 12 || seconds >= 7200) {
      return { rank: 'LV.4 精通', desc: '高阶自主节律掌控' };
    }
    if (cycles >= 6 || seconds >= 3600) {
      return { rank: 'LV.3 进阶', desc: '稳定突破耐受阈值' };
    }
    if (cycles >= 2 || seconds >= 1200) {
      return { rank: 'LV.2 熟练', desc: '建立清晰边缘感知' };
    }
    return { rank: 'LV.1 入门', desc: '开启基础脱敏训练' };
  };

  const rankInfo = getRankInfo(userStats.totalCycles, userStats.totalSeconds);
  const currentSound = SOUND_PRESETS.find((s) => s.id === soundType);

  const stageProgress =
    appState === 'COOLDOWN'
      ? Math.max(0, Math.min(1, timeLeft / Math.max(1, totalDuration)))
      : playMode === 'MANUAL'
        ? undefined
        : Math.max(0, Math.min(1, timeLeft / Math.max(1, totalDuration)));

  return (
    <div
      className={`min-h-[100dvh] w-full ${t.canvasBg} ${t.textPrimary} transition-colors duration-300 flex flex-col relative overflow-x-hidden`}
    >
      {/* Low-noise Atmospheric Vignette (Compositor-only opacity, zero dynamic blur) */}
      <div
        className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-300 ${
          appState === 'COOLDOWN'
            ? 'cooldown-vignette'
            : isEdgeWarning
              ? 'warning-vignette'
              : isDark
                ? 'deep-space-vignette'
                : ''
        }`}
        style={{
          opacity:
            appState === 'RUNNING'
              ? pulse
                ? 1
                : 0.55
              : appState === 'COOLDOWN'
                ? 0.9
                : isDark
                  ? 0.75
                  : 0,
        }}
        aria-hidden="true"
      />

      {/* Ultra-thin Top Edge Progress Hairline during Focus Mode */}
      {(appState === 'RUNNING' || appState === 'COOLDOWN') && stageProgress !== undefined && (
        <div
          className={`fixed top-0 left-0 right-0 h-[2px] z-50 pointer-events-none ${t.progressTrack}`}
          aria-hidden="true"
        >
          <div
            className={`h-full origin-left transition-transform duration-500 ease-out ${
              appState === 'COOLDOWN'
                ? 'bg-sky-400'
                : isEdgeWarning
                  ? 'bg-amber-400'
                  : t.progressFill
            }`}
            style={{ transform: `scaleX(${stageProgress})` }}
          />
        </div>
      )}

      {/* Unified Top Control Bar (Single Row, <= 56px mobile height, strictly flex-nowrap) */}
      <header
        className={`sticky top-0 z-30 w-full shrink-0 pt-safe pb-2.5 px-4 sm:px-6 lg:px-8 border-b transition-colors duration-200 ${
          isFocusMode
            ? isDark
              ? 'bg-[#090A0F]/80 border-white/[0.05] backdrop-blur-md'
              : 'bg-[#F8F7F6]/85 border-stone-200/70 backdrop-blur-md'
            : isDark
              ? 'bg-[#090A0F]/90 border-white/[0.07] backdrop-blur-md'
              : 'bg-[#F8F7F6]/90 border-stone-200/80 backdrop-blur-md'
        }`}
      >
        <div className="max-w-[1160px] mx-auto flex items-center justify-between gap-2 sm:gap-4 flex-nowrap min-h-[40px]">
          {/* Zone 1: Brand Wordmark or Return Action */}
          <div className="flex items-center gap-2 shrink-0 flex-nowrap min-w-0">
            {isFocusMode ? (
              <button
                type="button"
                onClick={exitToConsole}
                className={`inline-flex items-center gap-1.5 min-h-[40px] px-2.5 -ml-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 ${
                  isDark
                    ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                    : 'text-stone-700 hover:text-stone-950 hover:bg-stone-200/70'
                }`}
                title="退出专注并返回控制台 (Esc)"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>返回</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
                <span
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${
                    isDark
                      ? 'bg-[#11131B] border-white/[0.12]'
                      : 'bg-white border-stone-300'
                  }`}
                  aria-hidden="true"
                >
                  <span className={`w-2 h-2 rounded-full ${t.accentBg}`} />
                </span>
                <h1 className="text-base sm:text-lg font-bold tracking-tight whitespace-nowrap shrink-0">
                  律动控速
                </h1>
              </div>
            )}
          </div>

          {/* Zone 2 (Focus Mode Desktop Inline Context) */}
          {isFocusMode && (
            <div
              className={`hidden md:flex items-center gap-2 text-xs whitespace-nowrap truncate ${t.textMuted}`}
            >
              <span>
                {playMode === 'AUTO'
                  ? `阶梯模式 · 第 ${currentCycle}/${autoCycles} 轮`
                  : playMode === 'RANDOM'
                    ? '随机盲盒'
                    : '手动控速'}
              </span>
              <span aria-hidden="true" className="opacity-40">
                ·
              </span>
              <span>{currentSound?.name}</span>
            </div>
          )}

          {/* Zone 3: Clock & Online Telemetry + Compact Utility Triggers (Strictly flex-nowrap) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
            <div className="flex flex-nowrap items-center gap-2 shrink-0 w-auto max-w-full overflow-hidden">
              <div className="min-w-fit shrink-0">
                <LiveClockBadge variant="header" isDark={isDark} className="shrink-0" />
              </div>
              <span aria-hidden="true" className={`text-xs opacity-25 shrink-0 ${t.textMuted}`}>
                ·
              </span>
              <div className="min-w-fit shrink-0">
                <OnlineUserBadge variant="header" isDark={isDark} className="shrink-0" />
              </div>
            </div>

            {isFocusMode && canFullscreen && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 ${
                  isDark
                    ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/70'
                }`}
                title={isFullscreen ? '退出系统全屏' : '进入系统全屏'}
                aria-label={isFullscreen ? '退出系统全屏' : '进入系统全屏'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setMuted(!muted)}
              className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 ${
                muted
                  ? isDark
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-rose-600/10 text-rose-700 border border-rose-600/25'
                  : isDark
                    ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/70'
              }`}
              title={muted ? '已静音（点击开启声音）' : '静音'}
              aria-label={muted ? '开启声音' : '静音'}
              aria-pressed={muted}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 ${
                isDark
                  ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/70'
              }`}
              title="音频与外观设置"
              aria-label="打开设置"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* VIEW A: IDLE THEATER CONSOLE                                          */}
      {/* ===================================================================== */}
      {appState === 'IDLE' && (
        <main className="relative z-10 flex-1 w-full max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 pb-safe flex flex-col gap-6 lg:gap-8 animate-[stage-in_240ms_cubic-bezier(0.16,1,0.3,1)]">
          {/* Audio Activation Notice (Only before first user audio gesture) */}
          {!audioEnabled && (
            <button
              type="button"
              onClick={initAudio}
              className={`w-full py-2.5 px-4 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 ${
                isDark
                  ? 'bg-[#11131B] border-rose-500/25 text-slate-200 hover:border-rose-500/45'
                  : 'bg-white border-rose-600/25 text-stone-800 hover:border-rose-600/45'
              }`}
            >
              <span>点击任意开始按钮或此处，即可激活 Web Audio 精准节拍合成引擎</span>
              <span className={`font-semibold whitespace-nowrap shrink-0 ${t.accentText}`}>
                激活音频
              </span>
            </button>
          )}

          {/* Upper Proportional Theater Split (Desktop ~54% Left : ~46% Right, Equal Height) */}
          <section className="w-full flex flex-col lg:flex-row items-stretch gap-6 lg:gap-8">
            {/* Left Zone: Command Console & Progressive Training */}
            <div className="w-full min-w-0 flex-1 lg:flex-[54] lg:basis-0 flex flex-col justify-between gap-5">
              {/* Concise Editorial Title */}
              <div className="space-y-2">
                <div className={`text-xs font-medium flex items-center gap-2 ${t.textMuted}`}>
                  <span>阶梯节奏训练室</span>
                  <span aria-hidden="true" className="opacity-40">
                    ·
                  </span>
                  <span className="font-numeric">30 / 60 / 90 / 120 BPM</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-[2.15rem] font-bold tracking-tight leading-tight text-balance-heading">
                  精准节律控制与渐进耐力训练
                </h2>
                <p className={`text-sm leading-relaxed max-w-[62ch] ${t.textSecondary}`}>
                  以低干扰深空视觉与精确音频节拍构建四阶段递增循环，在可控边界内系统提升节奏稳定性与耐受阈值。
                </p>
              </div>

              {/* Primary Progressive Command Surface (Single-Elevation Hairline Card) */}
              <div
                className={`w-full flex-1 p-5 sm:p-6 rounded-2xl border flex flex-col justify-between gap-6 ${t.surfaceBg} ${t.border}`}
              >
                <div className="space-y-5">
                  {/* Card Heading Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold">循序渐进模式</h3>
                      <p className={`text-xs mt-1 ${t.textMuted}`}>
                        4 阶段自动变速递进 · 单轮标准时长 10 分钟
                      </p>
                    </div>
                    <span className={`font-numeric text-xs font-medium shrink-0 ${t.accentText}`}>
                      {currentSound?.name}
                    </span>
                  </div>

                  {/* 4-Stage Precision Linear Breakdown (Unboxed Hairline Cells) */}
                  <div
                    className={`grid grid-cols-4 border-y py-3.5 gap-2 ${
                      isDark ? 'border-white/[0.07]' : 'border-stone-200/80'
                    }`}
                  >
                    {([30, 60, 90, 120] as BpmState[]).map((stepBpm) => (
                      <div key={stepBpm} className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-numeric text-sm sm:text-base font-bold">
                          {stepBpm}
                        </span>
                        <span className={`text-[11px] truncate ${t.textMuted}`}>
                          {STAGE_META[stepBpm].short} · {STAGE_META[stepBpm].mins}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Cycle Count Segmented Control */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${t.textSecondary}`}>循环轮数</span>
                      <span className={t.textMuted}>推荐 2–3 轮（20–30 分钟）</span>
                    </div>

                    <div
                      className={`grid grid-cols-4 gap-1.5 p-1 rounded-xl border ${t.surfaceElevated} ${t.border}`}
                      role="radiogroup"
                      aria-label="选择循环轮数"
                    >
                      {[1, 2, 3, 4].map((cycleNum) => {
                        const isSelected = autoCycles === cycleNum;
                        const isRec = cycleNum === 2 || cycleNum === 3;
                        return (
                          <button
                            key={cycleNum}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => setAutoCycles(cycleNum)}
                            className={`min-h-[48px] py-2 px-1 rounded-lg text-center transition-colors duration-150 flex flex-col items-center justify-center focus-visible:outline-2 focus-visible:outline-rose-500 ${
                              isSelected
                                ? isDark
                                  ? 'bg-[#232838] text-white border border-white/[0.14]'
                                  : 'bg-white text-stone-900 border border-stone-300 shadow-2xs'
                                : isDark
                                  ? 'text-slate-400 hover:text-slate-200 border border-transparent'
                                  : 'text-stone-500 hover:text-stone-900 border border-transparent'
                            }`}
                          >
                            <span className="font-numeric text-sm font-semibold leading-none">
                              {cycleNum} 轮
                            </span>
                            <span
                              className={`font-numeric text-[11px] mt-1 leading-none ${
                                isSelected
                                  ? isRec
                                    ? t.accentText
                                    : t.textSecondary
                                  : 'opacity-65'
                              }`}
                            >
                              {cycleNum * 10}m{isRec ? ' · 荐' : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Collapsible Rationale */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowCycleWhy(!showCycleWhy)}
                        className={`w-full min-h-[36px] flex items-center justify-between text-xs transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 rounded-lg px-0.5 ${t.textMuted} hover:${t.textPrimary}`}
                      >
                        <span>为什么建议每次训练 2–3 轮？</span>
                        {showCycleWhy ? (
                          <ChevronUp className="w-4 h-4 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 shrink-0" />
                        )}
                      </button>

                      {showCycleWhy && (
                        <div
                          className={`mt-2 pt-3 border-t text-xs leading-relaxed space-y-2 animate-[fade-in_160ms_ease-out] ${
                            isDark
                              ? 'border-white/[0.07] text-slate-300'
                              : 'border-stone-200/80 text-stone-600'
                          }`}
                        >
                          <p>
                            <strong className={t.textPrimary}>第 1 轮（建立基准）：</strong>
                            由 30 BPM 递增至 120 BPM，使外周神经适应阶段性节律变化。
                          </p>
                          <p>
                            <strong className={t.textPrimary}>第 2 轮（核心控制）：</strong>
                            在高兴奋点主动降速回 30 BPM，强化急停降频与边缘自控能力。
                          </p>
                          <p>
                            <strong className={t.textPrimary}>第 3 轮（巩固阈值）：</strong>
                            稳定延续持久耐受区间；超过 4 轮易引起肌肉代偿疲劳，2–3 轮效益最优。
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Single Dominant Primary CTA */}
                <button
                  type="button"
                  onClick={() => startPreparation('AUTO', autoCycles)}
                  className={`w-full min-h-[52px] py-3.5 px-5 rounded-xl font-semibold text-sm tracking-wide text-white flex items-center justify-center gap-2.5 transition-all duration-150 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 ${t.accentBg} ${t.accentBgHover}`}
                >
                  <Play className="w-4 h-4 fill-current shrink-0" />
                  <span>开始阶梯训练</span>
                  <span aria-hidden="true" className="opacity-50">
                    ·
                  </span>
                  <span className="font-numeric opacity-90">
                    {autoCycles} 轮 / {autoCycles * 10}m
                  </span>
                </button>
              </div>
            </div>

            {/* Right Zone: Live Presence, Personal Metrics & 7-Day Frequency */}
            <div className="w-full min-w-0 flex-1 lg:flex-[46] lg:basis-0 flex flex-col justify-between gap-4">
              {/* Contextual Time Reminder Bar */}
              <LiveClockBadge variant="banner" isDark={isDark} />

              {/* Real-time Peer Status Card */}
              <OnlineUserBadge variant="card" isDark={isDark} />

              {/* Mobile Portrait Collapsible Archive Switch */}
              {isMobilePortrait && (
                <button
                  type="button"
                  onClick={() => setShowPortraitArchive(!showPortraitArchive)}
                  className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-colors ${t.surfaceBg} ${t.border} ${t.textSecondary}`}
                >
                  <span className="flex items-center gap-2">
                    {showPortraitArchive ? (
                      <EyeOff className="w-4 h-4 opacity-70" />
                    ) : (
                      <BarChart3 className="w-4 h-4 opacity-70" />
                    )}
                    <span>{showPortraitArchive ? '收起训练统计与近 7 日频率' : '展开训练统计与近 7 日频率'}</span>
                  </span>
                  <span className="font-numeric opacity-70">
                    {formatTotalTime(userStats.totalSeconds)}
                  </span>
                </button>
              )}

              {/* Personal Cumulative Metrics & 7-Day Matrix */}
              {(!isMobilePortrait || showPortraitArchive) && (
                <>
                  <div
                    className={`w-full p-4 rounded-2xl border flex flex-col gap-3.5 ${t.surfaceBg} ${t.border}`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">训练档案</span>
                      <span className={t.textMuted}>
                        <span className={`font-numeric font-semibold ${t.accentText}`}>
                          {rankInfo.rank}
                        </span>
                        <span aria-hidden="true" className="mx-1.5 opacity-40">
                          ·
                        </span>
                        <span>{rankInfo.desc}</span>
                      </span>
                    </div>

                    <div
                      className={`grid grid-cols-2 divide-x pt-2 border-t ${
                        isDark
                          ? 'border-white/[0.06] divide-white/[0.06]'
                          : 'border-stone-200/80 divide-stone-200/80'
                      }`}
                    >
                      <div className="pr-3">
                        <div className={`text-[11px] ${t.textMuted}`}>累计训练时长</div>
                        <div className="font-numeric text-lg sm:text-xl font-bold mt-1 truncate">
                          {formatTotalTime(userStats.totalSeconds)}
                        </div>
                      </div>
                      <div className="pl-4">
                        <div className={`text-[11px] ${t.textMuted}`}>完成循环总数</div>
                        <div className="font-numeric text-lg sm:text-xl font-bold mt-1">
                          {userStats.totalCycles}{' '}
                          <span className={`text-xs font-normal ${t.textMuted}`}>轮</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <WeeklyActivityChart userStats={userStats} isDark={isDark} />
                </>
              )}

              {/* Quiet Practice Note */}
              <p className={`text-xs leading-relaxed px-1 ${t.textMuted}`}>
                训练提示：全程保持规律腹式呼吸，接近临界点可随时按空格键或点击下方「降温休息」进入 30 秒冷却。
              </p>
            </div>
          </section>

          {/* Lower Secondary Modes Row (Equal 1:1 Split, Clean Hairline Buttons) */}
          <section className="w-full space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs px-0.5">
              <span className={`font-semibold ${t.textSecondary}`}>自由训练模式</span>
              <span className={t.textMuted}>启动后自动进入全屏专注态</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => startPreparation('RANDOM')}
                className={`w-full p-5 rounded-2xl border text-left flex items-center justify-between gap-4 transition-colors duration-150 group focus-visible:outline-2 focus-visible:outline-rose-500 ${t.surfaceBg} ${t.border} ${
                  isDark ? 'hover:border-white/[0.18]' : 'hover:border-stone-300'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.surfaceElevated} ${t.accentText}`}
                  >
                    <Shuffle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">随机盲盒模式</div>
                    <p className={`text-xs mt-1 leading-relaxed ${t.textMuted}`}>
                      15–120 秒随机切换四档节拍，打破预期强化临场控速
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold whitespace-nowrap shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${t.accentText}`}
                >
                  进入
                </span>
              </button>

              <button
                type="button"
                onClick={() => startPreparation('MANUAL')}
                className={`w-full p-5 rounded-2xl border text-left flex items-center justify-between gap-4 transition-colors duration-150 group focus-visible:outline-2 focus-visible:outline-rose-500 ${t.surfaceBg} ${t.border} ${
                  isDark ? 'hover:border-white/[0.18]' : 'hover:border-stone-300'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.surfaceElevated} ${t.accentText}`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">手动控速模式</div>
                    <p className={`text-xs mt-1 leading-relaxed ${t.textMuted}`}>
                      自由切换 30 / 60 / 90 / 120 BPM 档位，桌面端支持 1–4 快捷键
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold whitespace-nowrap shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${t.accentText}`}
                >
                  进入
                </span>
              </button>
            </div>
          </section>
        </main>
      )}

      {/* ===================================================================== */}
      {/* VIEW B: FULLSCREEN FOCUS STAGE (PREPARING / RUNNING / COOLDOWN / CLIMAX) */}
      {/* ===================================================================== */}
      {isFocusMode && (
        <main
          className="relative z-10 flex-1 w-full max-w-[960px] mx-auto px-5 sm:px-8 flex flex-col items-center justify-center touch-manipulation select-none"
          onMouseDown={() => {
            setIsPressing(true);
            handleStageTap();
          }}
          onMouseUp={() => setIsPressing(false)}
          onMouseLeave={() => setIsPressing(false)}
          onTouchStart={() => {
            setIsPressing(true);
            handleStageTap();
          }}
          onTouchEnd={() => setIsPressing(false)}
          onTouchCancel={() => setIsPressing(false)}
        >
          {/* PREPARING (3-Second Ritual) */}
          {appState === 'PREPARING' && (
            <div
              key={prepCount}
              className="w-full max-w-md flex flex-col items-center text-center gap-6 py-8 animate-[stage-in_220ms_cubic-bezier(0.16,1,0.3,1)]"
            >
              <div className={`font-numeric text-xs tracking-widest ${t.textMuted}`}>
                准备入场 · {PREP_STEPS[prepCount]?.step}
              </div>

              <div
                className="font-numeric font-bold leading-none tracking-tighter"
                style={{ fontSize: 'clamp(5.5rem, 22vw, 9.5rem)' }}
              >
                {prepCount}
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {PREP_STEPS[prepCount]?.title}
                </h2>
                <p className={`text-xs sm:text-sm leading-relaxed ${t.textSecondary}`}>
                  {PREP_STEPS[prepCount]?.desc}
                </p>
              </div>

              {/* 3-Step Hairline Progress Indicator */}
              <div className="flex items-center justify-center gap-2 w-36 pt-1" aria-hidden="true">
                {[3, 2, 1].map((step) => {
                  const isCurrent = prepCount === step;
                  const isDone = prepCount < step;
                  return (
                    <div
                      key={step}
                      className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                        isCurrent
                          ? t.accentBg
                          : isDone
                            ? isDark
                              ? 'bg-rose-500/40'
                              : 'bg-rose-600/35'
                            : t.progressTrack
                      }`}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeStartRunning(targetMode, autoCycles);
                }}
                className={`mt-2 min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 ${t.buttonSecondary} ${t.buttonSecondaryHover}`}
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>跳过准备立即开始</span>
              </button>
            </div>
          )}

          {/* RUNNING & COOLDOWN: Minimalist Oversized Numeric Dashboard + Micro-Rhythm Rail */}
          {(appState === 'RUNNING' || appState === 'COOLDOWN') && (
            <div className="w-full max-w-xl flex flex-col items-center text-center gap-6 sm:gap-8 py-4 animate-[stage-in_240ms_cubic-bezier(0.16,1,0.3,1)]">
              {/* Mobile Context Line (unboxed text with dot separators) */}
              <div
                className={`flex items-center justify-center flex-wrap gap-x-2 gap-y-1 text-xs ${t.textMuted}`}
              >
                <span className="md:hidden">
                  {playMode === 'AUTO'
                    ? `第 ${currentCycle}/${autoCycles} 轮`
                    : playMode === 'RANDOM'
                      ? '随机盲盒'
                      : '手动控速'}
                </span>
                <span aria-hidden="true" className="md:hidden opacity-40">
                  ·
                </span>
                <span
                  className={
                    appState === 'COOLDOWN'
                      ? 'text-sky-400 font-semibold'
                      : isEdgeWarning
                        ? 'text-amber-400 font-semibold'
                        : t.textSecondary
                  }
                >
                  {appState === 'COOLDOWN'
                    ? '降温呼吸阶段'
                    : `${STAGE_META[bpm].name} · ${STAGE_META[bpm].desc}`}
                </span>
              </div>

              {/* Focal Anchor: Oversized Tabular Numeric Readout */}
              {appState === 'COOLDOWN' ? (
                <div className="flex flex-col items-center gap-3 relative">
                  {/* Subtle Compositor-Only Breathing Halo */}
                  <div
                    className="absolute -inset-10 rounded-full border border-sky-400/25 pointer-events-none"
                    style={{ animation: 'cooldown-breath 6s ease-in-out infinite' }}
                    aria-hidden="true"
                  />
                  <div
                    className="font-numeric font-bold leading-none tracking-tighter text-sky-400"
                    style={{ fontSize: 'clamp(4.75rem, 18vw, 9rem)' }}
                  >
                    {formatTimer(timeLeft)}
                  </div>
                  <div className="text-base sm:text-lg font-semibold tracking-wide text-sky-300">
                    双手离开 · 深呼吸平复
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`flex items-baseline justify-center transition-transform duration-150 ease-out ${
                      isPressing ? 'scale-[0.98]' : pulse ? 'scale-[1.015]' : 'scale-100'
                    }`}
                  >
                    <span
                      className={`font-numeric font-bold leading-none tracking-tighter ${
                        isEdgeWarning ? 'text-amber-400' : t.textPrimary
                      }`}
                      style={{ fontSize: 'clamp(5rem, 19vw, 9.5rem)' }}
                    >
                      {bpm}
                    </span>
                    <span
                      className={`font-numeric text-lg sm:text-2xl font-medium ml-2 sm:ml-3 ${t.textMuted}`}
                    >
                      BPM
                    </span>
                  </div>

                  {/* Secondary Numeric Countdown / Elapsed Timer */}
                  <div
                    className={`font-numeric text-xl sm:text-2xl font-semibold tracking-tight ${
                      isEdgeWarning ? 'text-amber-400' : t.textSecondary
                    }`}
                  >
                    {playMode === 'MANUAL' ? `已用时 ${formatTimer(timeLeft)}` : formatTimer(timeLeft)}
                  </div>
                </div>
              )}

              {/* Centerpiece: Minimalist Micro-Rhythm Linear Progress Rail */}
              <RhythmWaveform
                bpm={bpm}
                pulse={pulse}
                isCooldown={appState === 'COOLDOWN'}
                isWarning={isEdgeWarning}
                progress={stageProgress}
                isDark={isDark}
              />

              {/* Restrained Guidance Phrase */}
              <div className="min-h-[2.25rem] flex items-center justify-center px-2">
                <p
                  className={`text-sm sm:text-base font-medium leading-relaxed transition-opacity duration-150 ${
                    appState === 'COOLDOWN'
                      ? 'text-sky-300/90'
                      : isEdgeWarning
                        ? 'text-amber-300'
                        : pulse
                          ? t.textPrimary
                          : t.textSecondary
                  }`}
                >
                  {phrase}
                </p>
              </div>

              {/* AUTO Mode: 4-Stage Precision Linear Step Indicator */}
              {playMode === 'AUTO' && (
                <div className="w-full max-w-md grid grid-cols-4 gap-2 pt-1">
                  {([30, 60, 90, 120] as BpmState[]).map((stepBpm) => {
                    const isActive = appState === 'RUNNING' && bpm === stepBpm;
                    const isPassed = appState === 'RUNNING' && bpm > stepBpm;
                    return (
                      <div
                        key={stepBpm}
                        className={`py-2 px-1 rounded-lg border text-center transition-colors duration-200 ${
                          isActive
                            ? isEdgeWarning
                              ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
                              : `${t.accentBorder} ${t.accentSoft} ${t.accentText}`
                            : isPassed
                              ? isDark
                                ? 'border-white/[0.06] bg-white/[0.02] text-slate-400'
                                : 'border-stone-200 bg-stone-100/60 text-stone-500'
                              : isDark
                                ? 'border-white/[0.04] text-slate-600'
                                : 'border-stone-200/60 text-stone-400'
                        }`}
                      >
                        <div className="font-numeric text-xs font-semibold">{stepBpm}</div>
                        <div className="text-[10px] mt-0.5">{STAGE_META[stepBpm].short}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* MANUAL Mode: Direct 4-Speed Tactile Switcher (>= 48px touch target) */}
              {playMode === 'MANUAL' && appState === 'RUNNING' && (
                <div className="w-full max-w-md grid grid-cols-4 gap-2 pt-1">
                  {([30, 60, 90, 120] as BpmState[]).map((stepBpm, idx) => {
                    const isActive = bpm === stepBpm;
                    return (
                      <button
                        key={stepBpm}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          switchManualBpm(stepBpm);
                        }}
                        className={`min-h-[54px] py-2 px-1 rounded-xl border text-center transition-colors duration-150 flex flex-col items-center justify-center focus-visible:outline-2 focus-visible:outline-rose-500 ${
                          isActive
                            ? `${t.accentBg} text-white border-transparent`
                            : `${t.buttonSecondary} ${t.buttonSecondaryHover}`
                        }`}
                      >
                        <span className="font-numeric text-sm font-bold leading-none">
                          {stepBpm}
                        </span>
                        <span className="text-[11px] mt-1 opacity-85 leading-none">
                          {STAGE_META[stepBpm].short}
                        </span>
                        <span className="hidden md:inline font-numeric text-[9px] mt-0.5 opacity-45">
                          [{idx + 1}]
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CLIMAX (Completion Summary State) */}
          {appState === 'CLIMAX' && (
            <div className="w-full max-w-md flex flex-col items-center text-center gap-6 py-8 animate-[stage-in_240ms_cubic-bezier(0.16,1,0.3,1)]">
              <div className={`font-numeric text-xs tracking-widest uppercase ${t.accentText}`}>
                训练完成
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">释放与复盘</h2>
                <p className={`text-sm leading-relaxed ${t.textSecondary}`}>
                  {playMode === 'AUTO'
                    ? `已完成全部 ${autoCycles} 轮渐进阶梯循环，保持放松调整呼吸。`
                    : '本次节奏训练已圆满结束，建议补充水分并适当休息。'}
                </p>
              </div>

              <div
                className={`w-full grid grid-cols-2 divide-x p-4 rounded-2xl border ${t.surfaceBg} ${t.border} ${
                  isDark ? 'divide-white/[0.07]' : 'divide-stone-200'
                }`}
              >
                <div className="pr-3">
                  <div className={`text-[11px] ${t.textMuted}`}>累计总时长</div>
                  <div className="font-numeric text-lg font-bold mt-1">
                    {formatTotalTime(userStats.totalSeconds)}
                  </div>
                </div>
                <div className="pl-3">
                  <div className={`text-[11px] ${t.textMuted}`}>累计循环数</div>
                  <div className="font-numeric text-lg font-bold mt-1">
                    {userStats.totalCycles} 轮
                  </div>
                </div>
              </div>

              <LiveClockBadge variant="banner" isDark={isDark} />

              <div className="w-full flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    exitToConsole();
                  }}
                  className={`flex-1 min-h-[48px] py-3 px-4 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 ${t.buttonSecondary} ${t.buttonSecondaryHover}`}
                >
                  返回控制台
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startPreparation(playMode, autoCycles);
                  }}
                  className={`flex-1 min-h-[48px] py-3 px-4 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 ${t.accentBg} ${t.accentBgHover}`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>再来一轮</span>
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Focus Stage Bottom Ergonomic Thumb-Zone Action Dock */}
      {(appState === 'RUNNING' || appState === 'COOLDOWN') && (
        <footer className="relative z-20 w-full shrink-0 px-4 sm:px-6 pt-2 pb-safe">
          <div className="max-w-md mx-auto flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {appState === 'RUNNING' ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    enterCooldown();
                  }}
                  className={`flex-1 min-h-[52px] py-3 px-4 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-rose-500 ${t.buttonSecondary} ${t.buttonSecondaryHover}`}
                >
                  <Wind className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>降温休息</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resumeFromCooldown();
                  }}
                  className={`flex-1 min-h-[52px] py-3 px-4 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-sky-400 bg-sky-500 hover:bg-sky-400`}
                >
                  <Play className="w-4 h-4 fill-current shrink-0" />
                  <span>恢复节奏</span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAppState('CLIMAX');
                  setShowParticles(true);
                }}
                className={`flex-1 min-h-[52px] py-3 px-4 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-rose-500 ${t.accentBg} ${t.accentBgHover}`}
              >
                <Square className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>结束并释放</span>
              </button>
            </div>

            <div className={`hidden md:flex items-center justify-center gap-3 text-[11px] ${t.textMuted}`}>
              <span>Space 键切换降温/恢复</span>
              <span aria-hidden="true" className="opacity-40">
                ·
              </span>
              <span>Esc 返回控制台</span>
            </div>
          </div>
        </footer>
      )}

      {/* ===================================================================== */}
      {/* SETTINGS SHEET / MODAL (Bottom Sheet on Mobile, Centered on Desktop)  */}
      {/* ===================================================================== */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-[fade-in_160ms_ease-out]"
          onClick={() => setShowSettings(false)}
          role="dialog"
          aria-modal="true"
          aria-label="音频与外观设置"
        >
          <div
            className={`w-full sm:max-w-lg max-h-[88dvh] overflow-y-auto p-5 sm:p-6 pb-safe sm:pb-6 rounded-t-3xl sm:rounded-2xl border flex flex-col gap-5 animate-[sheet-up_200ms_cubic-bezier(0.16,1,0.3,1)] ${t.surfaceBg} ${t.borderStrong}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Sheet Handle */}
            <div className="sm:hidden w-9 h-1 rounded-full bg-current opacity-20 mx-auto -mt-1" />

            {/* Header */}
            <div
              className={`flex items-center justify-between pb-3.5 border-b ${
                isDark ? 'border-white/[0.08]' : 'border-stone-200'
              }`}
            >
              <h3 className="text-base font-semibold">偏好设置</h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 ${
                  isDark
                    ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                }`}
                aria-label="关闭设置"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Tab Bar */}
            <div
              className={`grid grid-cols-2 gap-1 p-1 rounded-xl border ${t.surfaceElevated} ${t.border}`}
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeSettingsTab === 'sound'}
                onClick={() => setActiveSettingsTab('sound')}
                className={`min-h-[40px] py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  activeSettingsTab === 'sound'
                    ? isDark
                      ? 'bg-[#232838] text-white'
                      : 'bg-white text-stone-900 shadow-2xs'
                    : t.textMuted
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>节拍音色</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeSettingsTab === 'theme'}
                onClick={() => setActiveSettingsTab('theme')}
                className={`min-h-[40px] py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  activeSettingsTab === 'theme'
                    ? isDark
                      ? 'bg-[#232838] text-white'
                      : 'bg-white text-stone-900 shadow-2xs'
                    : t.textMuted
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>外观主题</span>
              </button>
            </div>

            {/* Sound Presets Tab */}
            {activeSettingsTab === 'sound' && (
              <div className="space-y-2">
                <p className={`text-xs px-0.5 ${t.textMuted}`}>
                  点击任一音色即可通过本地音频引擎实时试听：
                </p>
                <div className="flex flex-col gap-2">
                  {SOUND_PRESETS.map((preset) => {
                    const isSelected = soundType === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSoundType(preset.id);
                          metronome.playSample(preset.id, true);
                        }}
                        className={`w-full min-h-[56px] px-4 py-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 ${
                          isSelected
                            ? `${t.accentBorder} ${t.accentSoft}`
                            : `${t.surfaceElevated} ${t.border} ${t.surfaceHover}`
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <span>{preset.name}</span>
                            <span aria-hidden="true" className="opacity-35 text-xs">
                              ·
                            </span>
                            <span className={`text-xs font-normal ${t.textMuted}`}>
                              {preset.tag}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 truncate ${t.textMuted}`}>{preset.desc}</p>
                        </div>
                        {isSelected && <Check className={`w-4 h-4 shrink-0 ${t.accentText}`} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Theme Tab */}
            {activeSettingsTab === 'theme' && (
              <div className="space-y-4">
                {/* Follow System Row */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${t.surfaceElevated} ${t.border}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Monitor className={`w-4 h-4 shrink-0 ${t.textSecondary}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold">
                        跟随系统深浅色 · 当前系统{systemIsDark ? '深色' : '浅色'}
                      </div>
                      <p className={`text-[11px] mt-0.5 ${t.textMuted}`}>
                        开启后随设备系统外观自动在深空暗夜与浅色主题间切换
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={followSystemTheme}
                    onClick={() => {
                      const nextFollow = !followSystemTheme;
                      setFollowSystemTheme(nextFollow);
                      if (nextFollow && typeof window !== 'undefined' && window.matchMedia) {
                        const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        setTheme(sysDark ? 'midnight' : favoriteLightTheme);
                      }
                    }}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-rose-500 ${
                      followSystemTheme ? t.accentBg : isDark ? 'bg-white/15' : 'bg-stone-300'
                    }`}
                    aria-label="切换跟随系统外观"
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white transition-transform duration-150 ${
                        followSystemTheme ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Quick Dark/Light Switch Row */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${t.surfaceElevated} ${t.border}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isDark ? (
                      <Moon className={`w-4 h-4 shrink-0 ${t.accentText}`} />
                    ) : (
                      <Sun className={`w-4 h-4 shrink-0 ${t.accentText}`} />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold">深空暗夜主视觉</div>
                      <p className={`text-[11px] mt-0.5 ${t.textMuted}`}>
                        低噪点曜石深色基底，夜间训练保护视力
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isDark}
                    onClick={() => {
                      if (isDark) {
                        setTheme(favoriteLightTheme);
                        if (followSystemTheme && systemIsDark) setFollowSystemTheme(false);
                      } else {
                        setTheme('midnight');
                        if (followSystemTheme && !systemIsDark) setFollowSystemTheme(false);
                      }
                    }}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-rose-500 ${
                      isDark ? t.accentBg : 'bg-stone-300'
                    }`}
                    aria-label="切换深空暗夜模式"
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white transition-transform duration-150 ${
                        isDark ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 5 Curated Theme Swatches */}
                <div className="space-y-2">
                  <div className={`text-xs px-0.5 ${t.textMuted}`}>配色方案</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {THEME_ORDER.map((key) => {
                      const item = THEMES[key];
                      const isSelected = theme === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setTheme(key);
                            if (key !== 'midnight') {
                              setFavoriteLightTheme(key);
                              if (followSystemTheme && systemIsDark) setFollowSystemTheme(false);
                            } else if (followSystemTheme && !systemIsDark) {
                              setFollowSystemTheme(false);
                            }
                          }}
                          className={`min-h-[64px] p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 ${
                            item.swatchBg
                          } ${isSelected ? 'ring-2 ring-rose-500' : 'opacity-80 hover:opacity-100'}`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`w-3 h-3 rounded-full ${item.swatchDot}`} />
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold leading-tight">{item.label}</div>
                            <div className="text-[10px] opacity-65 mt-0.5 truncate">
                              {item.shortDesc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className={`w-full min-h-[44px] py-2.5 rounded-xl text-xs font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 ${t.accentBg} ${t.accentBgHover}`}
            >
              完成
            </button>
          </div>
        </div>
      )}

      {/* Celebratory Luminous Ember Overlay on CLIMAX */}
      {showParticles && (
        <ParticleEffect
          colors={t.particleColors}
          onComplete={() => setShowParticles(false)}
        />
      )}
    </div>
  );
}
