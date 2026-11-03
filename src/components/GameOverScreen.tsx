import React from 'react';
import { Fuel, RotateCcw, Trophy, Home, Award, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { GameOverReason } from '../types';

interface GameOverScreenProps {
  score: number;
  highScore: number;
  survivalTime: number;
  reason: GameOverReason | null;
  onRestart: () => void;
  onGoHome: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  highScore,
  survivalTime,
  reason,
  onRestart,
  onGoHome,
}) => {
  const isClear = reason?.type === 'TIMEOUT';
  const isNewRecord = score > 0 && score >= highScore;

  return (
    <div className="w-full flex-1 flex flex-col justify-between p-4 text-center select-none bg-slate-900/95">
      {/* Result Status Banner */}
      <div className="pt-2">
        <div className="flex justify-center mb-2">
          {isClear ? (
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-950/30">
              <AlertTriangle className="w-8 h-8" />
            </div>
          )}
        </div>

        <h2 className="text-2xl font-black text-white mb-1">
          {reason?.title || '게임 종료'}
        </h2>
        <p className="text-xs text-slate-300 max-w-[280px] mx-auto leading-relaxed">
          {reason?.message || '게임이 완료되었습니다.'}
        </p>
      </div>

      {/* Score and Stats Card */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 max-w-[320px] mx-auto w-full shadow-inner space-y-3">
        {/* Main Score */}
        <div className="flex flex-col items-center justify-center py-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Fuel className="w-3.5 h-3.5 text-amber-400" />
            최종 획득 연료
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-amber-400 font-mono tabular-nums">
              {score}
            </span>
            <span className="text-sm font-semibold text-slate-400">개</span>
          </div>

          {isNewRecord && (
            <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-extrabold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 rounded-full animate-bounce">
              <Award className="w-3 h-3" />
              <span>최고 기록 달성!</span>
            </div>
          )}
        </div>

        {/* Secondary Details */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-left">
          <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block mb-0.5">주행 시간</span>
            <span className="text-sm font-mono font-bold text-cyan-300 tabular-nums">
              {survivalTime.toFixed(1)}s / 60.0s
            </span>
          </div>

          <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block mb-0.5 flex items-center gap-1">
              <Trophy className="w-2.5 h-2.5 text-amber-400" /> 최고 점수
            </span>
            <span className="text-sm font-mono font-bold text-amber-400 tabular-nums">
              {highScore} 개
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 max-w-[280px] mx-auto w-full pt-2 pb-1">
        <button
          type="button"
          onClick={onRestart}
          className="game-btn w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-orange-950/30 active:scale-95 transition-all"
        >
          <RotateCcw className="w-4 h-4 stroke-[3]" />
          <span>다시 시작</span>
        </button>

        <button
          type="button"
          onClick={onGoHome}
          className="game-btn w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700/80 active:scale-95 transition-all"
        >
          <Home className="w-3.5 h-3.5" />
          <span>시작 화면으로</span>
        </button>
      </div>
    </div>
  );
};
