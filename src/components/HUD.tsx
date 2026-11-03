import React from 'react';
import { Fuel, Clock, AlertTriangle, Flame, Zap } from 'lucide-react';

interface HUDProps {
  hp: number;
  score: number;
  timeLeft: number;
}

export const HUD: React.FC<HUDProps> = ({ hp, score, timeLeft }) => {
  const isLowHp = hp <= 25;
  const isCriticalHp = hp <= 15;

  // Percentage formatted for visual bar
  const hpPercent = Math.max(0, Math.min(100, hp));

  // Elapsed time (0 to 60s)
  const elapsed = Math.max(0, 60.0 - timeLeft);

  // Speed multiplier: 1.0x up to 3.0x
  const speedMultiplier = 1.0 + (elapsed / 60.0) * 2.0;

  // Health depletion rate exactly matched with speed multiplier (10.0 * speedMultiplier)
  const currentDrainRate = (10.0 * speedMultiplier).toFixed(1);

  // Determine bar color
  const getBarColor = () => {
    if (hpPercent > 50) return 'from-emerald-500 to-green-400';
    if (hpPercent > 25) return 'from-amber-500 to-yellow-400';
    return 'from-rose-600 to-red-500 animate-pulse';
  };

  return (
    <div className="w-full bg-slate-900/95 backdrop-blur-sm border-b border-slate-800/80 px-3 py-2 text-slate-100 shrink-0">
      {/* Top metrics row */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        {/* Score display */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 px-2 py-1 rounded-lg">
          <Fuel className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
          <span className="text-[11px] font-semibold text-slate-300">연료</span>
          <span className="text-base font-black text-amber-400 font-mono tabular-nums leading-none">
            {score}
          </span>
        </div>

        {/* Speed / Acceleration Multiplier (1.0x ~ 3.0x) */}
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border font-mono transition-colors ${
            speedMultiplier >= 2.0
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
              : speedMultiplier >= 1.5
              ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
              : 'bg-slate-800/80 border-slate-700/60 text-slate-300'
          }`}
        >
          <Zap
            className={`w-3.5 h-3.5 ${
              speedMultiplier >= 2.0
                ? 'text-rose-400 fill-rose-400/40 animate-bounce'
                : speedMultiplier >= 1.5
                ? 'text-orange-400 fill-orange-400/40 animate-pulse'
                : 'text-slate-400'
            }`}
          />
          <span className="text-[11px] font-bold">속도</span>
          <span className="text-xs font-black tabular-nums">{speedMultiplier.toFixed(1)}x</span>
        </div>

        {/* Time Left */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 px-2 py-1 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-semibold text-slate-300">시간</span>
          <span
            className={`text-base font-black font-mono tabular-nums leading-none ${
              timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-cyan-300'
            }`}
          >
            {Math.max(0, timeLeft).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* HP Bar row */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-1">
            <Flame className={`w-3.5 h-3.5 ${isLowHp ? 'text-red-500 animate-bounce' : 'text-emerald-400'}`} />
            <span className="text-slate-300 text-[11px]">체력 (연료 잔량)</span>
            <span className="text-[10px] text-slate-400 font-mono">(-{currentDrainRate}/s)</span>
            {isLowHp && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-400 animate-pulse ml-0.5">
                <AlertTriangle className="w-3 h-3" />
                위험!
              </span>
            )}
          </div>
          <span
            className={`font-mono text-[11px] tabular-nums font-bold ${
              isLowHp ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {Math.round(hpPercent)}%
          </span>
        </div>

        {/* Bar container */}
        <div className="relative h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-700/70 p-0.5 shadow-inner">
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-all duration-100 ease-out ${getBarColor()}`}
            style={{ width: `${hpPercent}%` }}
          />
          {/* Subtle glossy sheen */}
          <div className="absolute inset-x-0 top-0 h-1 bg-white/20 pointer-events-none" />
        </div>
      </div>

      {/* Flashing screen warning border if critical */}
      {isCriticalHp && (
        <div className="text-center mt-1">
          <p className="text-[10px] text-red-400 font-bold tracking-wider animate-pulse uppercase">
            연료를 획득하여 체력을 회복하세요!
          </p>
        </div>
      )}
    </div>
  );
};
