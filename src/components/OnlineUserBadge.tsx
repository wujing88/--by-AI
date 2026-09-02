import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, Activity, ShieldCheck, Heart, Radio, WifiOff, HardDrive, Sparkles } from 'lucide-react';
import { realtimePresence, PresenceState } from '../utils/realtime';

interface OnlineUserBadgeProps {
  variant?: 'header' | 'hud' | 'card';
  className?: string;
  isDark?: boolean;
}

export default function OnlineUserBadge({ variant = 'header', className = '', isDark = false }: OnlineUserBadgeProps) {
  const [showModal, setShowModal] = useState(false);
  const [presence, setPresence] = useState<PresenceState>(() => realtimePresence.getState());
  const [delta, setDelta] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = realtimePresence.subscribe((state) => {
      setPresence((old) => {
        const diff = state.onlineCount - old.onlineCount;
        if (diff !== 0 && !state.isOffline) {
          setDelta(diff);
          const t = setTimeout(() => setDelta(null), 2500);
          return { ...state };
        }
        return state;
      });
    });

    return () => unsubscribe();
  }, []);

  const { onlineCount, trainingCount, isConnected, isOffline } = presence;

  const modalContent = showModal && mounted ? createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={() => setShowModal(false)}
    >
      <div 
        className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl flex flex-col gap-4 text-left animate-scaleUp ${
          isDark 
            ? 'bg-[#1c1533] border-purple-800/60 text-purple-100' 
            : 'bg-white border-rose-100 text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-purple-800/40' : 'border-black/5'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isOffline 
                ? (isDark ? 'bg-purple-900/60 text-purple-300' : 'bg-slate-500/15 text-slate-700') 
                : (isDark ? 'bg-emerald-900/60 text-emerald-300' : 'bg-emerald-500/15 text-emerald-700')
            }`}>
              {isOffline ? <WifiOff className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
            <div>
              <h4 className={`text-sm font-black ${isDark ? 'text-rose-100' : 'text-slate-800'}`}>
                {isOffline ? '离线模式 · 本地独立运行' : '真实在线连接'}
              </h4>
              <span className={`text-[10px] font-bold flex items-center gap-1 ${
                isOffline 
                  ? (isDark ? 'text-purple-300/70' : 'text-slate-500') 
                  : (isDark ? 'text-emerald-400' : 'text-emerald-600')
              }`}>
                {isOffline ? (
                  <>⚡ 已自适应切换为本地免网络模式</>
                ) : (
                  <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> 当前全网真实连接 {onlineCount} 人在线</>
                )}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setShowModal(false)}
            className={`p-1.5 rounded-full transition-all text-xs font-black ${
              isDark ? 'bg-purple-900/50 hover:bg-purple-800 text-purple-300' : 'bg-black/5 hover:bg-black/10 text-slate-500'
            }`}
          >
            ✕
          </button>
        </div>

        <div className="space-y-2.5 text-xs leading-relaxed">
          {isOffline ? (
            <>
              <div className={`p-3 rounded-2xl border flex items-start gap-2.5 ${
                isDark ? 'bg-[#251d42] border-purple-800/40 text-purple-200' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <HardDrive className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-purple-400' : 'text-slate-600'}`} />
                <p>
                  <strong className={isDark ? 'text-purple-100' : 'text-slate-800'}>本地独立运行保障</strong>：当前检测到离线状态或 Cloudflare Pages 静态环境，已自动切换为纯本地运行模式，避免数值产生困惑。
                </p>
              </div>

              <div className={`p-3 rounded-2xl border flex items-start gap-2.5 ${
                isDark ? 'bg-[#2a1c47] border-rose-900/40 text-rose-200' : 'bg-rose-50/70 border-rose-100 text-slate-600'
              }`}>
                <Sparkles className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p>
                  <strong className={isDark ? 'text-rose-100' : 'text-slate-800'}>核心功能 100% 完整</strong>：精准音频节拍合成与 7 日活跃成就完全在本地保存与计算，断网亦可随时随地流畅练习。
                </p>
              </div>
            </>
          ) : (
            <>
              <div className={`p-3 rounded-2xl border flex items-start gap-2.5 ${
                isDark ? 'bg-[#182736] border-emerald-900/40 text-emerald-200' : 'bg-emerald-50/70 border-emerald-100 text-slate-600'
              }`}>
                <Radio className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  <strong className={isDark ? 'text-emerald-100' : 'text-slate-800'}>真实全双工服务同步</strong>：当前在线人数来自实际活跃连接，无任何伪造数字。
                </p>
              </div>

              <div className={`p-3 rounded-2xl border flex items-start gap-2.5 ${
                isDark ? 'bg-[#2a1c47] border-rose-900/40 text-rose-200' : 'bg-rose-50/70 border-rose-100 text-slate-600'
              }`}>
                <Heart className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p>
                  <strong className={isDark ? 'text-rose-100' : 'text-slate-800'}>实时同步训练状态</strong>：{trainingCount > 0 ? `当前已有 ${trainingCount} 人正在律动训练中。` : '当前你可以作为第一位开启律动训练！'}
                </p>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setShowModal(false)}
          className={`w-full py-3 rounded-2xl font-black text-xs tracking-wider transition-all shadow-md active:scale-98 ${
            isDark 
              ? 'bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white shadow-rose-950/60' 
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          我知道了 · 关闭
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  if (variant === 'hud') {
    // In-Training / Cooldown / Preparing HUD Variant
    if (isOffline) {
      return (
        <>
          <div 
            onClick={() => setShowModal(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold backdrop-blur-md shadow-xs cursor-pointer active:scale-95 transition-all select-none ${
              isDark 
                ? 'bg-purple-950/60 border-purple-800/60 text-purple-300 hover:bg-purple-900/60' 
                : 'bg-slate-500/15 border-slate-400/20 text-slate-700 hover:bg-slate-500/20'
            } ${className}`}
            title="当前已切换为本地离线运行模式（点击查看详情）"
          >
            <WifiOff className="w-3.5 h-3.5 opacity-75" />
            <span className="text-[11px] font-black tracking-wide">离线模式</span>
            <span className="opacity-40">|</span>
            <span className="text-[11px] opacity-75 font-medium">本地独立运行</span>
          </div>
          {modalContent}
        </>
      );
    }

    return (
      <>
        <div 
          onClick={() => setShowModal(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold backdrop-blur-md shadow-xs cursor-pointer active:scale-95 transition-all select-none ${
            isDark 
              ? 'bg-purple-950/60 border-purple-800/60 text-purple-200 hover:bg-purple-900/60' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 hover:bg-emerald-500/15'
          } ${className}`}
          title="点击查看全球在线同伴真实连接数据"
        >
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full rounded-full ${isConnected ? 'bg-emerald-400 animate-ping opacity-75' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span className={`tabular-nums font-black text-[12px] ${isDark ? 'text-rose-200' : 'text-emerald-900'}`}>{onlineCount}</span>
          <span className="text-[11px] opacity-80 font-medium">人同频在线</span>
          {trainingCount > 0 && (
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              isDark ? 'bg-rose-500/25 text-rose-300' : 'bg-rose-500/15 text-rose-700'
            }`}>
              {trainingCount} 律动中
            </span>
          )}
          {delta !== null && (
            <span className={`text-[10px] font-black ${delta > 0 ? 'text-emerald-400' : 'text-slate-400'} animate-bounce`}>
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </div>
        {modalContent}
      </>
    );
  }

  if (variant === 'card') {
    // Community Live Card for IDLE View
    return (
      <>
        <div 
          onClick={() => setShowModal(true)}
          className={`w-full min-w-0 p-3.5 rounded-2xl border shadow-xs backdrop-blur-md flex items-center justify-between cursor-pointer hover:opacity-95 active:scale-[0.99] transition-all ${
            isDark
              ? 'bg-[#1c1533] border-purple-800/40 text-rose-100 hover:border-purple-700/60'
              : (isOffline 
                  ? 'bg-slate-500/10 border-slate-300/60 text-slate-800' 
                  : 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-rose-500/10 border-emerald-500/20 text-slate-800')
          } ${className}`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`relative flex items-center justify-center w-9 h-9 rounded-xl shadow-xs shrink-0 ${
              isOffline 
                ? (isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-slate-500/15 text-slate-700') 
                : (isDark ? 'bg-purple-900/50 text-emerald-400' : 'bg-emerald-500/15 text-emerald-700')
            }`}>
              {isOffline ? <WifiOff className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              {!isOffline && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-xs font-black ${isDark ? 'text-rose-100' : 'text-slate-800'}`}>
                  {isOffline ? '本地离线运行模式' : '真实在线同伴律动'}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isOffline 
                    ? (isDark ? 'bg-purple-900/50 text-purple-300 border-purple-700/40' : 'bg-slate-500/15 text-slate-700 border-slate-400/20') 
                    : (isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50' : 'bg-emerald-500/15 text-emerald-800 border-emerald-500/20')
                }`}>
                  {isOffline ? '本地免联网' : <><Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" /> 实时同步</>}
                </span>
              </div>
              <p className={`text-[11px] font-medium mt-0.5 leading-snug truncate ${isDark ? 'text-purple-300/70' : 'text-slate-600'}`}>
                {isOffline 
                  ? '已切换为本地运行：音频引擎与训练记录完全在本地运行' 
                  : '实时统计当前打开网页与进行训练的真实在线人数'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 pl-2">
            {isOffline ? (
              <>
                <div className={`flex items-center gap-1 text-xs font-black ${isDark ? 'text-purple-300' : 'text-slate-700'}`}>
                  <HardDrive className="w-3.5 h-3.5 opacity-70" />
                  <span>本地就绪</span>
                </div>
                <span className={`text-[10px] font-bold mt-0.5 ${isDark ? 'text-purple-400/70' : 'text-slate-500'}`}>
                  流畅不受限
                </span>
              </>
            ) : (
              <>
                <div className={`flex items-center gap-1 text-sm font-black tabular-nums ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                  <span>{onlineCount}</span>
                  <span className="text-[10px] font-bold opacity-75">人在线</span>
                </div>
                <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isDark ? 'text-emerald-400/90' : 'text-emerald-600/90'}`}>
                  <Activity className="w-3 h-3 animate-pulse" /> 
                  {trainingCount > 0 ? `${trainingCount} 人正在律动` : '即刻开启训练'}
                </span>
              </>
            )}
          </div>
        </div>

        {modalContent}
      </>
    );
  }

  // Header Variant (Compact with pulse dot or offline pill)
  return (
    <>
      <div 
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full border shadow-xs text-xs font-bold backdrop-blur-md cursor-pointer active:scale-95 transition-all select-none ${
          isDark 
            ? 'bg-purple-950/70 border-purple-800/60 text-purple-200 hover:bg-purple-900/80' 
            : 'bg-white/80 border-black/5 text-slate-800 hover:bg-white'
        } ${className}`}
        title={isOffline ? "当前处于离线模式（点击查看说明）" : "点击查看真实在线用户连接数据"}
      >
        {isOffline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-slate-400" />
            <span className={`text-[10px] sm:text-[11px] font-bold ${isDark ? 'text-purple-300' : 'text-slate-600'}`}>离线</span>
          </>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full ${isConnected ? 'bg-emerald-400 animate-ping opacity-75' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-70" />
            <span className={`tabular-nums font-black text-xs sm:text-[13px] ${isDark ? 'text-rose-200' : 'text-slate-900'}`}>{onlineCount}</span>
            <span className={`text-[10px] font-bold px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full ${
              isDark 
                ? 'text-emerald-300 bg-emerald-950/70 border border-emerald-700/40' 
                : 'text-emerald-700 bg-emerald-500/10'
            }`}>
              在线
            </span>
            {delta !== null && (
              <span className={`hidden sm:inline-block text-[10px] font-black ${delta > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {delta > 0 ? `+${delta}` : delta}
              </span>
            )}
          </>
        )}
      </div>

      {modalContent}
    </>
  );
}

