import React, { useState, useEffect } from 'react';
import { Users, Activity, ShieldCheck, Heart, Radio, WifiOff, HardDrive, Sparkles } from 'lucide-react';
import { realtimePresence, PresenceState } from '../utils/realtime';

interface OnlineUserBadgeProps {
  variant?: 'header' | 'hud' | 'card';
  className?: string;
}

export default function OnlineUserBadge({ variant = 'header', className = '' }: OnlineUserBadgeProps) {
  const [showModal, setShowModal] = useState(false);
  const [presence, setPresence] = useState<PresenceState>(() => realtimePresence.getState());
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
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

  if (variant === 'hud') {
    // In-Training / Cooldown / Preparing HUD Variant
    if (isOffline) {
      return (
        <div 
          onClick={() => setShowModal(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-500/15 border border-slate-400/20 text-slate-700 text-xs font-bold backdrop-blur-md shadow-xs cursor-pointer active:scale-95 transition-all select-none hover:bg-slate-500/20 ${className}`}
          title="当前已切换为本地离线运行模式（点击查看详情）"
        >
          <WifiOff className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] font-black tracking-wide">离线模式</span>
          <span className="opacity-40">|</span>
          <span className="text-[11px] opacity-75 font-medium">本地独立运行</span>
        </div>
      );
    }

    return (
      <div 
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-bold backdrop-blur-md shadow-xs cursor-pointer active:scale-95 transition-all select-none hover:bg-emerald-500/15 ${className}`}
        title="点击查看全球在线同伴真实连接数据"
      >
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full rounded-full ${isConnected ? 'bg-emerald-400 animate-ping opacity-75' : 'bg-amber-400'}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
        </span>
        <Users className="w-3.5 h-3.5 text-emerald-600" />
        <span className="tabular-nums font-black text-[12px]">{onlineCount}</span>
        <span className="text-[11px] opacity-80 font-medium">人同频在线</span>
        {trainingCount > 0 && (
          <span className="text-[10px] bg-rose-500/15 text-rose-700 font-black px-1.5 py-0.2 rounded-full">
            {trainingCount} 律动中
          </span>
        )}
        {delta !== null && (
          <span className={`text-[10px] font-black ${delta > 0 ? 'text-emerald-600' : 'text-slate-500'} animate-bounce`}>
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    // Community Live Card for IDLE View
    return (
      <>
        <div 
          onClick={() => setShowModal(true)}
          className={`w-full min-w-0 p-3.5 rounded-2xl ${
            isOffline 
              ? 'bg-slate-500/10 border-slate-300/60' 
              : 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-rose-500/10 border-emerald-500/20'
          } border shadow-xs backdrop-blur-md flex items-center justify-between cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all ${className}`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`relative flex items-center justify-center w-9 h-9 rounded-xl ${isOffline ? 'bg-slate-500/15 text-slate-700' : 'bg-emerald-500/15 text-emerald-700'} shadow-xs shrink-0`}>
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
                <span className="text-xs font-black text-slate-800">
                  {isOffline ? '本地离线运行模式' : '真实在线同伴律动'}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isOffline 
                    ? 'bg-slate-500/15 text-slate-700 border border-slate-400/20' 
                    : 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/20 flex items-center gap-1'
                }`}>
                  {isOffline ? '本地免联网' : <><Radio className="w-2.5 h-2.5 animate-pulse text-emerald-600" /> 实时同步</>}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-600 mt-0.5 leading-snug">
                {isOffline 
                  ? '已切换为本地运行：音频引擎与训练记录完全在本地运行' 
                  : '实时统计当前打开网页与进行训练的真实在线人数'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 pl-2">
            {isOffline ? (
              <>
                <div className="flex items-center gap-1 text-xs font-black text-slate-700">
                  <HardDrive className="w-3.5 h-3.5 opacity-70" />
                  <span>本地就绪</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 mt-0.5">
                  流畅不受限
                </span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 text-sm font-black text-emerald-800 tabular-nums">
                  <span>{onlineCount}</span>
                  <span className="text-[10px] font-bold opacity-75">人在线</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600/90 flex items-center gap-0.5">
                  <Activity className="w-3 h-3 animate-pulse" /> 
                  {trainingCount > 0 ? `${trainingCount} 人正在律动` : '即刻开启训练'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Companion / Offline Interactive Modal */}
        {showModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setShowModal(false)}
          >
            <div 
              className="w-full max-w-sm p-6 rounded-3xl bg-white border border-rose-100 shadow-2xl flex flex-col gap-4 text-left animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${isOffline ? 'bg-slate-500/15 text-slate-700' : 'bg-emerald-500/15 text-emerald-700'} flex items-center justify-center`}>
                    {isOffline ? <WifiOff className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">
                      {isOffline ? '离线模式 · 本地独立运行' : '真实在线连接'}
                    </h4>
                    <span className={`text-[10px] font-bold ${isOffline ? 'text-slate-500' : 'text-emerald-600'} flex items-center gap-1`}>
                      {isOffline ? (
                        <>⚡ Cloudflare / 本地沙箱环境自适应运行</>
                      ) : (
                        <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> 当前全网连接 {onlineCount} 人在线</>
                      )}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-full bg-black/5 hover:bg-black/10 text-slate-500 transition-all text-xs font-black"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                {isOffline ? (
                  <>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                      <HardDrive className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                      <p>
                        <strong>本地独立运行保障</strong>：当前检测到网络断开或静态部署环境（如 Cloudflare Pages），应用已自动切换为纯本地运行模式，避免数值混淆。
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <p>
                        <strong>全功能不受限</strong>：Web Audio 纯高精度音频节拍合成、30~120 BPM 阶梯渐进、7日活跃统计均可在离线状态下完美运行与持久化保存。
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p>
                        <strong>零隐私与断网可用</strong>：网络恢复后将自动静默重连，无需手动刷新。
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2.5">
                      <Radio className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p>
                        <strong>真实全双工连接</strong>：采用服务端 WebSocket / SSE 实时心跳同步，绝无模拟或伪造数据，数值真实反映全网当前在线访客。
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-start gap-2.5">
                      <Heart className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <p>
                        <strong>同频自律陪伴</strong>：你开启训练时，状态会自动同步为「训练中」，与正在坚持的伙伴相互激励。
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                      <p>
                        <strong>零隐私收集</strong>：连接仅维护匿名 Socket 会话 ID，不追踪任何设备或个人敏感信息。
                      </p>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 rounded-2xl font-black text-xs tracking-wider bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-md active:scale-98"
              >
                我知道了 · 继续律动
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Header Variant (Compact with pulse dot or offline pill)
  return (
    <>
      <div 
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full bg-white/80 border border-black/5 shadow-xs text-xs font-bold text-slate-800 backdrop-blur-md cursor-pointer hover:bg-white active:scale-95 transition-all select-none ${className}`}
        title={isOffline ? "当前处于离线模式（点击查看说明）" : "点击查看真实在线用户连接数据"}
      >
        {isOffline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-600">离线</span>
          </>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full ${isConnected ? 'bg-emerald-400 animate-ping opacity-75' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500" />
            <span className="tabular-nums font-black text-xs sm:text-[13px] text-slate-900">{onlineCount}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full">
              在线
            </span>
            {delta !== null && (
              <span className={`hidden sm:inline-block text-[10px] font-black ${delta > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {delta > 0 ? `+${delta}` : delta}
              </span>
            )}
          </>
        )}
      </div>

      {/* Companion / Offline Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="w-full max-w-sm p-6 rounded-3xl bg-white border border-rose-100 shadow-2xl flex flex-col gap-4 text-left animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full ${isOffline ? 'bg-slate-500/15 text-slate-700' : 'bg-emerald-500/15 text-emerald-700'} flex items-center justify-center`}>
                  {isOffline ? <WifiOff className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">
                    {isOffline ? '离线模式 · 本地独立运行' : '真实在线连接'}
                  </h4>
                  <span className={`text-[10px] font-bold ${isOffline ? 'text-slate-500' : 'text-emerald-600'} flex items-center gap-1`}>
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
                className="p-1.5 rounded-full bg-black/5 hover:bg-black/10 text-slate-500 transition-all text-xs font-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              {isOffline ? (
                <>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <HardDrive className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                    <p>
                      <strong>本地独立运行保障</strong>：当前检测到离线状态或 Cloudflare Pages 静态环境，已自动切换为纯本地运行模式，避免数值产生困惑。
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <p>
                      <strong>核心功能 100% 完整</strong>：精准音频节拍合成与 7 日活跃成就完全在本地保存与计算，断网亦可随时随地流畅练习。
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2.5">
                    <Radio className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>
                      <strong>真实全双工服务同步</strong>：当前在线人数来自实际活跃连接，无任何伪造数字。
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-start gap-2.5">
                    <Heart className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <p>
                      <strong>实时同步训练状态</strong>：{trainingCount > 0 ? `当前已有 ${trainingCount} 人正在律动训练中。` : '当前你可以作为第一位开启律动训练！'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 rounded-2xl font-black text-xs tracking-wider bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-md active:scale-98"
            >
              我知道了 · 关闭
            </button>
          </div>
        </div>
      )}
    </>
  );
}
