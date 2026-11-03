import React from 'react';
import { Fuel, Play, Zap, ArrowLeft, ArrowRight, ArrowUp, Trophy, Gauge } from 'lucide-react';

interface StartScreenProps {
  onStart: () => void;
  highScore: number;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, highScore }) => {
  return (
    <div className="w-full flex-1 flex flex-col justify-between p-4 text-center select-none bg-slate-900/90">
      {/* Title & Brand */}
      <div className="pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
          <Zap className="w-3.5 h-3.5 fill-amber-400" />
          <span>60초 아케이드 레이싱 챌린지</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white mb-1">
          로드런 <span className="text-amber-400 text-2xl font-extrabold tracking-normal">ROAD RUN</span>
        </h1>
        <p className="text-xs text-slate-300 max-w-[280px] mx-auto leading-relaxed">
          연료가 바닥나기 전에 지상과 공중의 연료를 모아 60초 동안 끝까지 질주하세요!
        </p>
      </div>

      {/* High score badge */}
      {highScore > 0 && (
        <div className="flex items-center justify-center gap-2 bg-slate-800/80 border border-amber-500/30 rounded-xl py-2 px-4 max-w-[240px] mx-auto shadow-sm">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-slate-300 font-medium">최고 기록:</span>
          <span className="text-base font-black text-amber-400 font-mono tabular-nums">
            {highScore} <span className="text-xs font-normal text-slate-400">개</span>
          </span>
        </div>
      )}

      {/* Rules & Control Guide */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 text-left space-y-2 max-w-[320px] mx-auto w-full">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          주요 규칙 & 가속 시스템
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 flex flex-col">
            <span className="text-[11px] text-amber-300 font-bold mb-0.5">⚠️ 가속 체력소모</span>
            <span className="text-[11px] text-slate-400 leading-tight">
              시간이 지날수록 체력 소모 속도가 점점 빨라집니다.
            </span>
          </div>

          <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 flex flex-col">
            <span className="text-[11px] text-cyan-300 font-bold mb-0.5">⚡ 속도 가속 (최대 3.0x)</span>
            <span className="text-[11px] text-slate-400 leading-tight">
              시간이 지날수록 주행 및 연료 이동속도가 최대 3배까지 빨라집니다.
            </span>
          </div>
        </div>

        {/* Controls row */}
        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
            <span>조작 방식</span>
            <span className="text-[10px] text-slate-500 font-normal">터치 & 키보드</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-300 gap-1.5">
            <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700/60">
              <ArrowLeft className="w-3 h-3 text-amber-400" />
              <ArrowRight className="w-3 h-3 text-amber-400" />
              <span className="font-mono text-[10px]">이동 [←, →]</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700/60">
              <ArrowUp className="w-3 h-3 text-cyan-400" />
              <span className="font-mono text-[10px]">점프 [Space]</span>
            </div>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="pt-2 pb-1">
        <button
          type="button"
          onClick={onStart}
          className="game-btn w-full max-w-[280px] mx-auto py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-orange-950/40 active:scale-95 transition-all"
        >
          <Play className="w-5 h-5 fill-slate-950 stroke-none" />
          <span>시작하기</span>
        </button>
      </div>
    </div>
  );
};
