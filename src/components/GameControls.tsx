import React, { useCallback, useRef } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

interface GameControlsProps {
  onMoveLeftStart: () => void;
  onMoveLeftEnd: () => void;
  onMoveRightStart: () => void;
  onMoveRightEnd: () => void;
  onJump: () => void;
  isMovingLeft: boolean;
  isMovingRight: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  onMoveLeftStart,
  onMoveLeftEnd,
  onMoveRightStart,
  onMoveRightEnd,
  onJump,
  isMovingLeft,
  isMovingRight,
}) => {
  const jumpPressedRef = useRef(false);

  const handleLeftDown = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    e.preventDefault();
    onMoveLeftStart();
  }, [onMoveLeftStart]);

  const handleLeftUp = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    e.preventDefault();
    onMoveLeftEnd();
  }, [onMoveLeftEnd]);

  const handleRightDown = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    e.preventDefault();
    onMoveRightStart();
  }, [onMoveRightStart]);

  const handleRightUp = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    e.preventDefault();
    onMoveRightEnd();
  }, [onMoveRightEnd]);

  const handleJumpDown = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!jumpPressedRef.current) {
      jumpPressedRef.current = true;
      onJump();
    }
  }, [onJump]);

  const handleJumpUp = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    e.preventDefault();
    jumpPressedRef.current = false;
  }, []);

  return (
    <div className="w-full bg-slate-900/95 border-t border-slate-800 px-3 py-3 select-none touch-none shrink-0">
      <div className="flex items-center justify-between gap-3 max-w-[360px] mx-auto">
        {/* Left / Right directional pad */}
        <div className="flex items-center gap-2">
          {/* Left button */}
          <button
            type="button"
            aria-label="좌측 이동"
            onPointerDown={handleLeftDown}
            onPointerUp={handleLeftUp}
            onPointerLeave={handleLeftUp}
            onPointerCancel={handleLeftUp}
            className={`game-btn flex flex-col items-center justify-center w-16 h-14 rounded-xl border font-bold transition-all duration-75 active:scale-95 shadow-md ${
              isMovingLeft
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-amber-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
            }`}
          >
            <div className="flex items-center justify-center text-xl">
              <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">◀ / [←]</span>
          </button>

          {/* Right button */}
          <button
            type="button"
            aria-label="우측 이동"
            onPointerDown={handleRightDown}
            onPointerUp={handleRightUp}
            onPointerLeave={handleRightUp}
            onPointerCancel={handleRightUp}
            className={`game-btn flex flex-col items-center justify-center w-16 h-14 rounded-xl border font-bold transition-all duration-75 active:scale-95 shadow-md ${
              isMovingRight
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-amber-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
            }`}
          >
            <div className="flex items-center justify-center text-xl">
              <ArrowRight className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">[→] / ▶</span>
          </button>
        </div>

        {/* Jump button */}
        <button
          type="button"
          aria-label="점프"
          onPointerDown={handleJumpDown}
          onPointerUp={handleJumpUp}
          onPointerLeave={handleJumpUp}
          onPointerCancel={handleJumpUp}
          className="game-btn flex-1 h-14 rounded-xl border border-cyan-400/80 bg-gradient-to-r from-cyan-600 to-blue-600 active:from-cyan-700 active:to-blue-700 text-white font-extrabold flex flex-col items-center justify-center shadow-lg shadow-cyan-900/30 active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-1.5 text-base tracking-wider uppercase font-black">
            <ArrowUp className="w-5 h-5 stroke-[3]" />
            <span>JUMP</span>
          </div>
          <span className="text-[10px] text-cyan-200/90 font-mono font-medium">공중 연료 획득 [Space]</span>
        </button>
      </div>
    </div>
  );
};
