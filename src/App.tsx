import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameOverReason } from './types';
import { HUD } from './components/HUD';
import { GameCanvas } from './components/GameCanvas';
import { GameControls } from './components/GameControls';
import { StartScreen } from './components/StartScreen';
import { GameOverScreen } from './components/GameOverScreen';

const HIGH_SCORE_KEY = 'roadrun_high_score_v1';
const INITIAL_TIME = 60.0;
const INITIAL_HP = 100.0;

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState<number>(0);
  const [hp, setHp] = useState<number>(INITIAL_HP);
  const [timeLeft, setTimeLeft] = useState<number>(INITIAL_TIME);
  const [highScore, setHighScore] = useState<number>(0);
  const [gameOverReason, setGameOverReason] = useState<GameOverReason | null>(null);

  // Input states
  const [isMovingLeft, setIsMovingLeft] = useState<boolean>(false);
  const [isMovingRight, setIsMovingRight] = useState<boolean>(false);
  const [jumpTriggerCount, setJumpTriggerCount] = useState<number>(0);

  // Track movement states with refs for immediate keyboard sync
  const isMovingLeftRef = useRef(false);
  const isMovingRightRef = useRef(false);

  // Load high score from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HIGH_SCORE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) {
          setHighScore(parsed);
        }
      }
    } catch {
      // Storage unavailable or disabled
    }
  }, []);

  // Update high score helper
  const checkAndUpdateHighScore = useCallback((finalScore: number) => {
    setHighScore((prev) => {
      if (finalScore > prev) {
        try {
          localStorage.setItem(HIGH_SCORE_KEY, finalScore.toString());
        } catch {
          // ignore
        }
        return finalScore;
      }
      return prev;
    });
  }, []);

  // Start new run
  const handleStartGame = useCallback(() => {
    setScore(0);
    setHp(INITIAL_HP);
    setTimeLeft(INITIAL_TIME);
    setGameOverReason(null);
    setIsMovingLeft(false);
    setIsMovingRight(false);
    isMovingLeftRef.current = false;
    isMovingRightRef.current = false;
    setGameState('PLAYING');
  }, []);

  // Trigger jump
  const handleJump = useCallback(() => {
    if (gameState === 'PLAYING') {
      setJumpTriggerCount((c) => c + 1);
    }
  }, [gameState]);

  // Movement handlers
  const handleMoveLeftStart = useCallback(() => {
    isMovingLeftRef.current = true;
    setIsMovingLeft(true);
  }, []);

  const handleMoveLeftEnd = useCallback(() => {
    isMovingLeftRef.current = false;
    setIsMovingLeft(false);
  }, []);

  const handleMoveRightStart = useCallback(() => {
    isMovingRightRef.current = true;
    setIsMovingRight(true);
  }, []);

  const handleMoveRightEnd = useCallback(() => {
    isMovingRightRef.current = false;
    setIsMovingRight(false);
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent page scrolling on Space and Arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (gameState === 'PLAYING') {
        if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          if (!isMovingLeftRef.current) {
            isMovingLeftRef.current = true;
            setIsMovingLeft(true);
          }
        } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          if (!isMovingRightRef.current) {
            isMovingRightRef.current = true;
            setIsMovingRight(true);
          }
        } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          handleJump();
        }
      } else if (gameState === 'START' || gameState === 'GAMEOVER') {
        if (e.code === 'Space' || e.code === 'Enter') {
          handleStartGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        isMovingLeftRef.current = false;
        setIsMovingLeft(false);
      } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        isMovingRightRef.current = false;
        setIsMovingRight(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, handleJump, handleStartGame]);

  // Handle Game Over
  const handleGameOver = useCallback((reason: GameOverReason) => {
    setGameOverReason(reason);
    setGameState('GAMEOVER');
    setIsMovingLeft(false);
    setIsMovingRight(false);
    isMovingLeftRef.current = false;
    isMovingRightRef.current = false;

    // Save high score if qualified
    setScore((currentScore) => {
      checkAndUpdateHighScore(currentScore);
      return currentScore;
    });
  }, [checkAndUpdateHighScore]);

  const survivalTime = Math.max(0, INITIAL_TIME - timeLeft);

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-0 sm:p-4 text-slate-100">
      {/* Game Cabinet / Screen Container (strictly 360px optimized, max 420px on desktop) */}
      <main className="w-full max-w-[420px] min-w-[320px] h-[100dvh] sm:h-[640px] bg-slate-900 sm:rounded-3xl border-0 sm:border sm:border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden relative">
        {/* TOP: HUD (Always active during game) */}
        {gameState === 'PLAYING' ? (
          <HUD hp={hp} score={score} timeLeft={timeLeft} />
        ) : (
          <header className="w-full bg-slate-900/95 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-slate-200 tracking-wide">ROAD RUN · 로드런</span>
            <span className="font-mono text-[11px] text-amber-400">60s Survival</span>
          </header>
        )}

        {/* MIDDLE: Screen State Swapper */}
        <section className="flex-1 flex flex-col items-center justify-center overflow-hidden relative">
          {gameState === 'START' && (
            <StartScreen onStart={handleStartGame} highScore={highScore} />
          )}

          {gameState === 'PLAYING' && (
            <div className="w-full flex-1 flex flex-col items-center justify-center">
              <GameCanvas
                score={score}
                hp={hp}
                timeLeft={timeLeft}
                isMovingLeft={isMovingLeft}
                isMovingRight={isMovingRight}
                onUpdateScore={setScore}
                onUpdateHp={setHp}
                onUpdateTimeLeft={setTimeLeft}
                onGameOver={handleGameOver}
                jumpTriggerCount={jumpTriggerCount}
              />
            </div>
          )}

          {gameState === 'GAMEOVER' && (
            <GameOverScreen
              score={score}
              highScore={highScore}
              survivalTime={survivalTime}
              reason={gameOverReason}
              onRestart={handleStartGame}
              onGoHome={() => setGameState('START')}
            />
          )}
        </section>

        {/* BOTTOM: Controls (Always accessible in PLAYING mode) */}
        {gameState === 'PLAYING' && (
          <GameControls
            onMoveLeftStart={handleMoveLeftStart}
            onMoveLeftEnd={handleMoveLeftEnd}
            onMoveRightStart={handleMoveRightStart}
            onMoveRightEnd={handleMoveRightEnd}
            onJump={handleJump}
            isMovingLeft={isMovingLeft}
            isMovingRight={isMovingRight}
          />
        )}
      </main>
    </div>
  );
}
