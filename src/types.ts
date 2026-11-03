export type GameState = 'START' | 'PLAYING' | 'GAMEOVER';

export type FuelType = 'ground' | 'air';

export interface Fuel {
  id: number;
  x: number;
  y: number;
  type: FuelType;
  width: number;
  height: number;
  collected: boolean;
  baseY: number;
  bobOffset: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  alpha: number;
  color: string;
  vy: number;
}

export interface GameOverReason {
  type: 'TIMEOUT' | 'EMPTY_FUEL';
  title: string;
  message: string;
}
