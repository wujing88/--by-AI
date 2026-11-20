import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Radio, WifiOff, X, HardDrive, Users } from 'lucide-react';
import { realtimePresence, PresenceState } from '../utils/realtime';

interface OnlineUserBadgeProps {
  variant?: 'header' | 'hud' | 'card';
  className?: string;
  isDark?: boolean;
}

export default function OnlineUserBadge({
  variant = 'header',
  className = '',
  isDark = true,
}: OnlineUserBadgeProps) {
  const [showModal, setShowModal] = useState(false);
  const [presence, setPresence] = useState<PresenceState>(() => realtimePresence.getState());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = realtimePresence.subscribe((state) => {
      setPresence(state);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showModal]);

  const { onlineCount, trainingCount, isConnected, isOffline } = presence;

  const modalContent =
    showModal && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-[fade-in_160ms_ease-out]"
            onClick={() => setShowModal(false)}
            role="dialog"
            aria-modal="true"
            aria-label="连接与在线状态说明"
          >
            <div
              className={`w-full sm:max-w-md p-6 pb-safe sm:pb-6 rounded-t-3xl sm:rounded-2xl border flex flex-col gap-5 text-left animate-[sheet-up_200ms_cubic-bezier(0.16,1,0.3,1)] ${
                isDark
                  ? 'bg-[#11131B] border-white/[0.1] text-slate-100'
                  : 'bg-white border-stone-200 text-stone-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile sheet grab handle */}
              <div className="sm:hidden w-9 h-1 rounded-full bg-current opacity-20 mx-auto -mt-2 mb-1" />

              <div
                className={`flex items-center justify-between pb-4 border-b ${
                  isDark ? 'border-white/[0.08]' : 'border-stone-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isOffline
                        ? isDark
                          ? 'bg-white/[0.06] text-slate-300'
                          : 'bg-stone-100 text-stone-600'
                        : isDark
                          ? 'bg-emerald-500/12 text-emerald-400'
                          : 'bg-emerald-600/10 text-emerald-700'
                    }`}
                  >
                    {isOffline ? <WifiOff className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">
                      {isOffline ? '本地离线运行' : '实时在线同步'}
                    </h4>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                      {isOffline
                        ? '静态环境或离线状态下自动切换本地模式'
                        : `当前 ${onlineCount} 人在线 · ${trainingCount} 人训练中`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 ${
                    isDark
                      ? 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'
                      : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                  aria-label="关闭弹窗"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                {isOffline ? (
                  <>
                    <div
                      className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                        isDark
                          ? 'bg-[#171A24] border-white/[0.06] text-slate-300'
                          : 'bg-stone-50 border-stone-200/80 text-stone-600'
                      }`}
                    >
                      <HardDrive className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                      <p>
                        当前处于无后端静态托管或离线环境，应用已自动运行于纯本地模式，不产生伪造在线数值。
                      </p>
                    </div>
                    <p className={`px-1 ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                      Web Audio 节拍合成引擎与近 7 日训练记录均在浏览器本地完成计算与持久化，断网可完整使用。
                    </p>
                  </>
                ) : (
                  <>
                    <div
                      className={`grid grid-cols-2 gap-3 p-3.5 rounded-xl border ${
                        isDark
                          ? 'bg-[#171A24] border-white/[0.06]'
                          : 'bg-stone-50 border-stone-200/80'
                      }`}
                    >
                      <div>
                        <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                          实时在线人数
                        </div>
                        <div className="font-numeric text-xl font-bold mt-1">{onlineCount}</div>
                      </div>
                      <div>
                        <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                          正在训练
                        </div>
                        <div
                          className={`font-numeric text-xl font-bold mt-1 ${
                            isDark ? 'text-rose-400' : 'text-rose-600'
                          }`}
                        >
                          {trainingCount}
                        </div>
                      </div>
                    </div>
                    <p className={`px-1 ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                      在线数据通过 Cloudflare Workers 实时连接通道同步，仅统计当前活跃会话，不记录个人身份信息。
                    </p>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={`w-full min-h-[44px] py-2.5 rounded-xl text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 ${
                  isDark
                    ? 'bg-white/[0.09] hover:bg-white/[0.14] text-slate-100'
                    : 'bg-stone-900 hover:bg-stone-800 text-white'
                }`}
              >
                关闭
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  if (variant === 'hud') {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowModal(true);
          }}
          className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap transition-opacity hover:opacity-100 opacity-85 focus-visible:outline-2 focus-visible:outline-rose-500 rounded-md px-1 py-0.5 ${
            isDark ? 'text-slate-300' : 'text-stone-700'
          } ${className}`}
          title={isOffline ? '本地运行模式（点击查看详情）' : '点击查看实时连接详情'}
        >
          {isOffline ? (
            <span>本地模式</span>
          ) : (
            <>
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              />
              <span className="font-numeric font-semibold">{onlineCount}</span>
              <span className="opacity-70">在线</span>
              {trainingCount > 0 && (
                <>
                  <span aria-hidden="true" className="opacity-40">
                    ·
                  </span>
                  <span className="font-numeric opacity-85">{trainingCount} 训练中</span>
                </>
              )}
            </>
          )}
        </button>
        {modalContent}
      </>
    );
  }

  if (variant === 'card') {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={`w-full min-w-0 min-h-[60px] px-4 py-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-rose-500 ${
            isDark
              ? 'bg-[#11131B] border-white/[0.08] hover:border-white/[0.16] text-slate-100'
              : 'bg-white border-stone-200/90 hover:border-stone-300 text-stone-900'
          } ${className}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isOffline
                  ? isDark
                    ? 'bg-white/[0.05] text-slate-400'
                    : 'bg-stone-100 text-stone-500'
                  : isDark
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-emerald-600/10 text-emerald-700'
              }`}
            >
              {isOffline ? <WifiOff className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="truncate">{isOffline ? '本地离线运行' : '实时在线状态'}</span>
                {!isOffline && (
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                      isConnected ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                    aria-label={isConnected ? '已连接' : '连接中'}
                  />
                )}
              </div>
              <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                {isOffline
                  ? '音频与记录完全在本地存储运行'
                  : trainingCount > 0
                    ? `当前 ${trainingCount} 人正在进行节奏训练`
                    : '边缘节点实时同步中 · 点击查看详情'}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right pl-2">
            {isOffline ? (
              <span className={`font-numeric text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-stone-700'}`}>
                就绪
              </span>
            ) : (
              <div className="flex items-baseline gap-1 justify-end">
                <span className="font-numeric text-lg font-bold leading-none">{onlineCount}</span>
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>在线</span>
              </div>
            )}
          </div>
        </button>
        {modalContent}
      </>
    );
  }

  // Header Variant: minimal unboxed single-line telemetry button
  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1.5 min-h-[36px] px-2 rounded-lg text-xs whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-rose-500 ${
          isDark
            ? 'text-slate-300 hover:bg-white/[0.06] hover:text-slate-100'
            : 'text-stone-700 hover:bg-stone-200/70 hover:text-stone-900'
        } ${className}`}
        title={isOffline ? '本地离线运行（点击查看说明）' : '点击查看实时在线连接详情'}
      >
        {isOffline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 opacity-60 shrink-0" />
            <span className="text-xs font-medium opacity-75">本地</span>
          </>
        ) : (
          <>
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span className="font-numeric font-semibold">{onlineCount}</span>
            <span className="hidden xs:inline opacity-65">在线</span>
          </>
        )}
      </button>
      {modalContent}
    </>
  );
}
