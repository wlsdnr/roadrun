import React, { useEffect, useRef, useCallback } from 'react';
import { Fuel, Particle, FloatingText, FuelType, GameOverReason } from '../types';

interface GameCanvasProps {
  score: number;
  hp: number;
  timeLeft: number;
  isMovingLeft: boolean;
  isMovingRight: boolean;
  onUpdateScore: (newScore: number) => void;
  onUpdateHp: (newHp: number) => void;
  onUpdateTimeLeft: (newTime: number) => void;
  onGameOver: (reason: GameOverReason) => void;
  jumpTriggerCount: number;
}

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 260;
const ROAD_TOP = 195;
const GROUND_Y = 222;
const CAR_WIDTH = 54;
const CAR_HEIGHT = 26;
const GRAVITY = 960;
const JUMP_FORCE = -400;
const BASE_MOVE_SPEED = 200;
const BASE_ROAD_SPEED = 200;
const BASE_HP_DRAIN = 10.0; // 10s base depletion at 1.0x

export const GameCanvas: React.FC<GameCanvasProps> = ({
  score,
  hp,
  timeLeft,
  isMovingLeft,
  isMovingRight,
  onUpdateScore,
  onUpdateHp,
  onUpdateTimeLeft,
  onGameOver,
  jumpTriggerCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Synchronized state refs for high-frequency game loop
  const scoreRef = useRef(score);
  const hpRef = useRef(hp);
  const timeLeftRef = useRef(timeLeft);
  const isMovingLeftRef = useRef(isMovingLeft);
  const isMovingRightRef = useRef(isMovingRight);
  const gameOverCalledRef = useRef(false);

  scoreRef.current = score;
  hpRef.current = hp;
  timeLeftRef.current = timeLeft;
  isMovingLeftRef.current = isMovingLeft;
  isMovingRightRef.current = isMovingRight;

  // Car physics state
  const carStateRef = useRef({
    x: 60,
    y: GROUND_Y - CAR_HEIGHT,
    vy: 0,
    isGrounded: true,
    rotation: 0,
    wheelAngle: 0,
    exhaustTimer: 0,
    squashY: 1,
  });

  // Entities
  const fuelsRef = useRef<Fuel[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const nextEntityIdRef = useRef(1);

  // Road & environment scrolling offsets
  const roadOffsetRef = useRef(0);
  const backgroundOffsetRef = useRef(0);
  const fuelSpawnTimerRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  // Handle Jump trigger
  const handleJump = useCallback(() => {
    const car = carStateRef.current;
    if (car.isGrounded) {
      car.vy = JUMP_FORCE;
      car.isGrounded = false;
      car.squashY = 1.25; // Stretch on leap

      // Add jump lift puff particles
      for (let i = 0; i < 5; i++) {
        particlesRef.current.push({
          id: nextEntityIdRef.current++,
          x: car.x + 8 + Math.random() * 20,
          y: GROUND_Y,
          vx: -50 - Math.random() * 40,
          vy: -20 - Math.random() * 20,
          color: 'rgba(200, 200, 220, 0.7)',
          size: 3 + Math.random() * 3,
          alpha: 0.8,
          life: 0,
          maxLife: 0.35,
        });
      }
    }
  }, []);

  // Watch jump trigger prop
  const prevJumpCountRef = useRef(jumpTriggerCount);
  useEffect(() => {
    if (jumpTriggerCount !== prevJumpCountRef.current) {
      prevJumpCountRef.current = jumpTriggerCount;
      handleJump();
    }
  }, [jumpTriggerCount, handleJump]);

  // Main Game Loop
  useEffect(() => {
    let animId: number;
    gameOverCalledRef.current = false;
    lastTimeRef.current = null;
    fuelSpawnTimerRef.current = 0.4; // Initial fuel comes quickly

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      // Delta time capped to avoid spiral of death on tab unfocus
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTimeRef.current = timestamp;

      // Elapsed time (0 to 60s)
      const elapsed = Math.max(0, 60.0 - timeLeftRef.current);

      // Dynamic Speed Multiplier: starts at 1.0x, reaches up to 3.0x at 60s
      const speedMultiplier = 1.0 + (elapsed / 60.0) * 2.0;
      const currentRoadSpeed = BASE_ROAD_SPEED * speedMultiplier;

      // Health depletion rate exactly matched with speed multiplier (10.0 * speedMultiplier)
      // At 1.0x: 10.0 HP/s | At 2.0x: 20.0 HP/s | At 3.0x: 30.0 HP/s
      const currentHpDrainRate = BASE_HP_DRAIN * speedMultiplier;

      // Player move speed scales moderately with road speed for snappy control
      const currentMoveSpeed = BASE_MOVE_SPEED * (1.0 + (speedMultiplier - 1.0) * 0.45);

      // 1. Check End Conditions
      if (!gameOverCalledRef.current) {
        // Decrease time
        const newTime = Math.max(0, timeLeftRef.current - dt);
        timeLeftRef.current = newTime;
        onUpdateTimeLeft(newTime);

        // Decrease HP with dynamic rate matching speed
        const newHp = Math.max(0, hpRef.current - currentHpDrainRate * dt);
        hpRef.current = newHp;
        onUpdateHp(newHp);

        if (newTime <= 0) {
          gameOverCalledRef.current = true;
          onGameOver({
            type: 'TIMEOUT',
            title: '60초 완주 성공!',
            message: '최대 3배의 초고속 질주와 가속된 체력 소모를 이겨내고 코스를 완주했습니다!',
          });
          return;
        }

        if (newHp <= 0) {
          gameOverCalledRef.current = true;
          onGameOver({
            type: 'EMPTY_FUEL',
            title: '연료 소진 (게임 오버)',
            message: '최대 3배로 가속된 주행 속도와 체력 소모로 인해 연료가 바닥났습니다.',
          });
          return;
        }
      }

      // 2. Physics & Player Update
      const car = carStateRef.current;

      // Horizontal movement
      if (isMovingLeftRef.current) {
        car.x = Math.max(12, car.x - currentMoveSpeed * dt);
      }
      if (isMovingRightRef.current) {
        car.x = Math.min(CANVAS_WIDTH - CAR_WIDTH - 12, car.x + currentMoveSpeed * dt);
      }

      // Vertical movement & jump
      if (!car.isGrounded) {
        car.vy += GRAVITY * dt;
        car.y += car.vy * dt;

        // Airborne pitch rotation
        car.rotation = Math.max(-0.2, Math.min(0.2, car.vy * 0.0006));

        // Ground hit detection
        if (car.y >= GROUND_Y - CAR_HEIGHT) {
          car.y = GROUND_Y - CAR_HEIGHT;
          car.vy = 0;
          car.isGrounded = true;
          car.rotation = 0;
          car.squashY = 0.8; // Squash on impact

          // Landing dust puff
          for (let i = 0; i < 4; i++) {
            particlesRef.current.push({
              id: nextEntityIdRef.current++,
              x: car.x + (i % 2 === 0 ? 10 : CAR_WIDTH - 10),
              y: GROUND_Y,
              vx: (i % 2 === 0 ? -1 : 1) * (30 + Math.random() * 30),
              vy: -10 - Math.random() * 15,
              color: 'rgba(180, 180, 190, 0.6)',
              size: 2.5 + Math.random() * 2,
              alpha: 0.7,
              life: 0,
              maxLife: 0.3,
            });
          }
        }
      } else {
        // Return squash to normal
        car.squashY += (1 - car.squashY) * Math.min(1, dt * 15);
      }

      // Wheel rotation accelerates with road speed
      car.wheelAngle += dt * 18 * speedMultiplier;

      // Exhaust spark particle generation (more frequent at high speed)
      car.exhaustTimer += dt;
      const exhaustInterval = Math.max(0.02, 0.06 / speedMultiplier);
      if (car.exhaustTimer > exhaustInterval) {
        car.exhaustTimer = 0;
        particlesRef.current.push({
          id: nextEntityIdRef.current++,
          x: car.x - 2,
          y: car.y + CAR_HEIGHT - 6 + (Math.random() * 4 - 2),
          vx: -currentRoadSpeed - Math.random() * 50,
          vy: Math.random() * 20 - 10,
          color: Math.random() > 0.5 ? '#f97316' : '#fbbf24',
          size: 2 + Math.random() * 2,
          alpha: 0.8,
          life: 0,
          maxLife: 0.25,
        });
      }

      // 3. Environment & Scrolling (Accelerates with speedMultiplier)
      roadOffsetRef.current = (roadOffsetRef.current + currentRoadSpeed * dt) % 40;
      backgroundOffsetRef.current = (backgroundOffsetRef.current + 30 * speedMultiplier * dt) % 360;

      // 4. Fuel Spawning: 1초에 1개씩 생성, 지상 50% / 공중 50%
      fuelSpawnTimerRef.current += dt;
      if (fuelSpawnTimerRef.current >= 1.0) {
        fuelSpawnTimerRef.current -= 1.0;

        const type: FuelType = Math.random() < 0.5 ? 'ground' : 'air';
        // Ground fuel rests right above road level; Air fuel requires jumping
        const baseY = type === 'ground' ? GROUND_Y - 22 : GROUND_Y - 82;

        fuelsRef.current.push({
          id: nextEntityIdRef.current++,
          x: CANVAS_WIDTH + 20,
          y: baseY,
          baseY,
          type,
          width: 22,
          height: 24,
          collected: false,
          bobOffset: Math.random() * Math.PI * 2,
        });
      }

      // 5. Update Fuels with Dynamic Current Road Speed & Collision Detection
      const carHitbox = {
        left: car.x + 4,
        right: car.x + CAR_WIDTH - 4,
        top: car.y + 4,
        bottom: car.y + CAR_HEIGHT,
      };

      for (let i = fuelsRef.current.length - 1; i >= 0; i--) {
        const fuel = fuelsRef.current[i];
        // Fuel moves left at dynamic currentRoadSpeed
        fuel.x -= currentRoadSpeed * dt;

        // Gentle floating bob
        fuel.y = fuel.baseY + Math.sin(timestamp * 0.006 + fuel.bobOffset) * 3;

        // Collision Check
        const fuelHitbox = {
          left: fuel.x,
          right: fuel.x + fuel.width,
          top: fuel.y,
          bottom: fuel.y + fuel.height,
        };

        const isColliding =
          !fuel.collected &&
          carHitbox.left < fuelHitbox.right &&
          carHitbox.right > fuelHitbox.left &&
          carHitbox.top < fuelHitbox.bottom &&
          carHitbox.bottom > fuelHitbox.top;

        if (isColliding) {
          fuel.collected = true;

          // Score +1
          const newScore = scoreRef.current + 1;
          scoreRef.current = newScore;
          onUpdateScore(newScore);

          // HP Recovery (+20 HP)
          const newHp = Math.min(100, hpRef.current + 20);
          hpRef.current = newHp;
          onUpdateHp(newHp);

          // Floating Text feedback (+1 FUEL / +20 HP)
          floatingTextsRef.current.push({
            id: nextEntityIdRef.current++,
            text: '+1 FUEL',
            x: fuel.x + 8,
            y: fuel.y - 10,
            alpha: 1.0,
            color: '#fbbf24',
            vy: -45,
          });

          // Energy Burst Sparkles
          for (let p = 0; p < 12; p++) {
            const angle = (Math.PI * 2 * p) / 12 + Math.random() * 0.4;
            const speed = 70 + Math.random() * 60;
            particlesRef.current.push({
              id: nextEntityIdRef.current++,
              x: fuel.x + fuel.width / 2,
              y: fuel.y + fuel.height / 2,
              vx: Math.cos(angle) * speed - currentRoadSpeed * 0.3,
              vy: Math.sin(angle) * speed,
              color: p % 2 === 0 ? '#38bdf8' : '#fbbf24',
              size: 3 + Math.random() * 3,
              alpha: 1.0,
              life: 0,
              maxLife: 0.45,
            });
          }
        }

        // Remove if off-screen or collected
        if (fuel.x < -40 || fuel.collected) {
          fuelsRef.current.splice(i, 1);
        }
      }

      // 6. Update Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }

      // 7. Update Floating Texts
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y += ft.vy * dt;
        ft.alpha -= dt * 1.5;

        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(i, 1);
        }
      }

      // ==========================================
      // 8. RENDER TO CANVAS
      // ==========================================
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // A. Sky Backdrop
      const skyGradient = ctx.createLinearGradient(0, 0, 0, ROAD_TOP);
      skyGradient.addColorStop(0, '#090d1a');
      skyGradient.addColorStop(0.6, '#151c38');
      skyGradient.addColorStop(1, '#2c1e4a');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, ROAD_TOP);

      // Distant stars / lights
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      const starSeeds = [30, 85, 140, 210, 275, 330, 50, 175, 290];
      for (let i = 0; i < starSeeds.length; i++) {
        const sx = (starSeeds[i] - backgroundOffsetRef.current * 0.2 + CANVAS_WIDTH * 2) % CANVAS_WIDTH;
        const sy = 15 + (i * 17) % 65;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Distant mountain silhouettes (parallax)
      ctx.fillStyle = '#11162d';
      ctx.beginPath();
      ctx.moveTo(0, ROAD_TOP);
      const bgOffset = backgroundOffsetRef.current * 0.4;
      for (let x = 0; x <= CANVAS_WIDTH; x += 30) {
        const hillY = ROAD_TOP - 35 + Math.sin((x + bgOffset) * 0.03) * 16 + Math.cos((x + bgOffset) * 0.015) * 8;
        ctx.lineTo(x, hillY);
      }
      ctx.lineTo(CANVAS_WIDTH, ROAD_TOP);
      ctx.closePath();
      ctx.fill();

      // Midground city / structures
      ctx.fillStyle = '#1c1b3d';
      for (let bx = -40; bx < CANVAS_WIDTH + 60; bx += 50) {
        const screenBx = bx - ((backgroundOffsetRef.current * 0.8) % 50);
        const bHeight = 25 + Math.sin(bx * 0.1) * 15;
        ctx.fillRect(screenBx, ROAD_TOP - bHeight, 35, bHeight);
        // Window dots
        ctx.fillStyle = 'rgba(253, 224, 71, 0.25)';
        ctx.fillRect(screenBx + 6, ROAD_TOP - bHeight + 6, 4, 4);
        ctx.fillRect(screenBx + 18, ROAD_TOP - bHeight + 14, 4, 4);
        ctx.fillStyle = '#1c1b3d';
      }

      // High-speed wind / speed lines
      if (speedMultiplier > 1.2) {
        const lineCount = speedMultiplier >= 2.0 ? 8 : 5;
        const speedIntensity = Math.min(1, (speedMultiplier - 1.2) / 1.5);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.18 * speedIntensity})`;
        ctx.lineWidth = speedMultiplier >= 2.2 ? 1.5 : 1;
        const speedSeeds = [35, 75, 115, 155, 195, 235, 275, 315];
        for (let i = 0; i < lineCount; i++) {
          const lineY = 30 + (i * 22) % 150;
          const lineOffset = (timestamp * 0.8 * speedMultiplier + speedSeeds[i] * 6) % (CANVAS_WIDTH + 140);
          ctx.beginPath();
          ctx.moveTo(CANVAS_WIDTH - lineOffset, lineY);
          ctx.lineTo(CANVAS_WIDTH - lineOffset + 60 + speedMultiplier * 25, lineY);
          ctx.stroke();
        }
      }

      // B. Roadway
      // Road Base
      ctx.fillStyle = '#131722';
      ctx.fillRect(0, ROAD_TOP, CANVAS_WIDTH, CANVAS_HEIGHT - ROAD_TOP);

      // Top Curb hazard stripes (Red & White)
      const curbHeight = 8;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, ROAD_TOP, CANVAS_WIDTH, curbHeight);
      const stripeWidth = 18;
      const curbOffset = roadOffsetRef.current % (stripeWidth * 2);
      for (let x = -stripeWidth * 2; x < CANVAS_WIDTH + stripeWidth * 2; x += stripeWidth * 2) {
        ctx.fillStyle = '#e11d48';
        ctx.fillRect(x - curbOffset, ROAD_TOP, stripeWidth, curbHeight);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(x - curbOffset + stripeWidth, ROAD_TOP, stripeWidth, curbHeight);
      }

      // Yellow boundary line
      ctx.fillStyle = '#eab308';
      ctx.fillRect(0, ROAD_TOP + curbHeight, CANVAS_WIDTH, 2);

      // Road Dashes (Middle Speed Lines)
      const dashY = ROAD_TOP + 28;
      const dashWidth = 32;
      const dashGap = 24;
      const dashPeriod = dashWidth + dashGap;
      const dashScroll = (roadOffsetRef.current * 2.2) % dashPeriod;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let dx = -dashPeriod; dx < CANVAS_WIDTH + dashPeriod; dx += dashPeriod) {
        ctx.fillRect(dx - dashScroll, dashY, dashWidth, 4);
      }

      // Bottom Curb
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 10);
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 2);

      // C. Render Fuels
      for (const fuel of fuelsRef.current) {
        ctx.save();
        ctx.translate(fuel.x, fuel.y);

        // Ground shadow if ground fuel
        if (fuel.type === 'ground') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.ellipse(fuel.width / 2, fuel.height + 4, 10, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Air Fuel Jet Thruster / Glow beneath
          ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.beginPath();
          ctx.ellipse(fuel.width / 2, fuel.height + 6, 7, 2, 0, 0, Math.PI * 2);
          ctx.fill();

          // Small upward hover thrust flame
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(fuel.width / 2 - 4, fuel.height);
          ctx.lineTo(fuel.width / 2 + 4, fuel.height);
          ctx.lineTo(fuel.width / 2, fuel.height + 5 + Math.sin(timestamp * 0.02) * 2);
          ctx.closePath();
          ctx.fill();
        }

        // Canister Body
        const canisterGrad = ctx.createLinearGradient(0, 0, fuel.width, 0);
        if (fuel.type === 'air') {
          canisterGrad.addColorStop(0, '#0284c7');
          canisterGrad.addColorStop(0.5, '#38bdf8');
          canisterGrad.addColorStop(1, '#0284c7');
        } else {
          canisterGrad.addColorStop(0, '#d97706');
          canisterGrad.addColorStop(0.5, '#fbbf24');
          canisterGrad.addColorStop(1, '#b45309');
        }
        ctx.fillStyle = canisterGrad;

        // Rounded canister shape
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(2, 4, fuel.width - 4, fuel.height - 6, 4);
        } else {
          ctx.rect(2, 4, fuel.width - 4, fuel.height - 6);
        }
        ctx.fill();

        // Metallic Handle/Cap on top
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(fuel.width / 2 - 4, 0, 8, 4);

        // Central Energy Icon (Fuel drop / Bolt)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        // Lightning bolt icon
        const cx = fuel.width / 2;
        ctx.moveTo(cx + 1, 7);
        ctx.lineTo(cx - 3, 13);
        ctx.lineTo(cx, 13);
        ctx.lineTo(cx - 1, 19);
        ctx.lineTo(cx + 4, 12);
        ctx.lineTo(cx + 1, 12);
        ctx.closePath();
        ctx.fill();

        // Outer glow
        ctx.strokeStyle = fuel.type === 'air' ? 'rgba(56, 189, 248, 0.6)' : 'rgba(251, 191, 36, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(1, 3, fuel.width - 2, fuel.height - 4);

        ctx.restore();
      }

      // D. Render Player Car
      ctx.save();
      ctx.translate(car.x + CAR_WIDTH / 2, car.y + CAR_HEIGHT);
      ctx.rotate(car.rotation);
      ctx.scale(1, car.squashY);
      ctx.translate(-(CAR_WIDTH / 2), -CAR_HEIGHT);

      // Car Headlight Beam (projecting onto asphalt)
      const lightGrad = ctx.createLinearGradient(CAR_WIDTH - 4, 16, CAR_WIDTH + 80, 24);
      lightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.5)');
      lightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.moveTo(CAR_WIDTH - 2, 14);
      ctx.lineTo(CAR_WIDTH + 80, 4);
      ctx.lineTo(CAR_WIDTH + 80, 26);
      ctx.lineTo(CAR_WIDTH - 2, 22);
      ctx.closePath();
      ctx.fill();

      // Car Shadow (only on ground or near ground)
      if (car.isGrounded) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(CAR_WIDTH / 2, CAR_HEIGHT + 1, CAR_WIDTH / 2 + 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Car Body Base (Sleek red sports racer)
      const bodyGrad = ctx.createLinearGradient(0, 6, 0, CAR_HEIGHT);
      bodyGrad.addColorStop(0, '#ef4444');
      bodyGrad.addColorStop(0.5, '#dc2626');
      bodyGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = bodyGrad;

      // Lower chassis
      ctx.beginPath();
      ctx.moveTo(4, CAR_HEIGHT - 6);
      ctx.lineTo(0, CAR_HEIGHT - 12);
      ctx.lineTo(6, 12);
      ctx.lineTo(16, 6);
      ctx.lineTo(34, 6);
      ctx.lineTo(46, 14);
      ctx.lineTo(CAR_WIDTH, 17);
      ctx.lineTo(CAR_WIDTH, CAR_HEIGHT - 6);
      ctx.closePath();
      ctx.fill();

      // Racing stripe (White center line)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(8, 11, CAR_WIDTH - 16, 2.5);

      // Cockpit / Windshield (dark glass)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(17, 7);
      ctx.lineTo(32, 7);
      ctx.lineTo(42, 14);
      ctx.lineTo(18, 14);
      ctx.closePath();
      ctx.fill();

      // Windshield glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.moveTo(22, 8);
      ctx.lineTo(26, 8);
      ctx.lineTo(29, 13);
      ctx.lineTo(25, 13);
      ctx.closePath();
      ctx.fill();

      // Rear Spoiler
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(1, 5, 8, 3);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(2, 8, 3, 4);

      // Front Headlight
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(CAR_WIDTH - 4, 15, 4, 4);

      // Rear Taillight
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(0, 14, 3, 4);

      // Wheels
      const drawWheel = (wx: number, wy: number) => {
        const radius = 6.5;
        // Rubber Tire
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(wx, wy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Silver Rim
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(wx, wy, radius - 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Rotating Spokes
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let a = 0; a < 4; a++) {
          const spokeAngle = car.wheelAngle + (a * Math.PI) / 2;
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + Math.cos(spokeAngle) * (radius - 1.5), wy + Math.sin(spokeAngle) * (radius - 1.5));
        }
        ctx.stroke();

        // Rim Cap
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(wx, wy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      };

      drawWheel(12, CAR_HEIGHT - 3);
      drawWheel(CAR_WIDTH - 12, CAR_HEIGHT - 3);

      ctx.restore();

      // E. Render Particles
      for (const p of particlesRef.current) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // F. Render Floating Texts
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      for (const ft of floatingTextsRef.current) {
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = ft.alpha;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.globalAlpha = 1.0;

      // G. Low Fuel Pulsing Vignette Warning on Canvas
      if (hpRef.current <= 25) {
        const pulse = 0.3 + 0.3 * Math.sin(timestamp * 0.008);
        ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
        ctx.lineWidth = 6;
        ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [onUpdateScore, onUpdateHp, onUpdateTimeLeft, onGameOver]);

  return (
    <div className="relative w-full aspect-[360/260] bg-slate-950 overflow-hidden flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full block image-rendering-pixelated"
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none',
        }}
      />
    </div>
  );
};
