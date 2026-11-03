/**
 * 로드런 (Road Run) - Vanilla JavaScript Engine
 * GitHub Pages 및 브라우저에서 빌드 도구 없이 즉시 실행 가능한 순수 자바스크립트 코드
 */

(function () {
  'use strict';

  // Constants & Physics Settings
  const HIGH_SCORE_KEY = 'roadrun_high_score_v1';
  const INITIAL_TIME = 60.0;
  const INITIAL_HP = 100.0;

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
  const BASE_HP_DRAIN = 10.0; // 1.0x일 때 10초 만에 체력 소진

  // Game State Variables
  let gameState = 'START'; // 'START' | 'PLAYING' | 'GAMEOVER'
  let score = 0;
  let hp = INITIAL_HP;
  let timeLeft = INITIAL_TIME;
  let highScore = 0;
  let gameOverReason = { title: '', message: '', isClear: false };

  // Input States
  let isMovingLeft = false;
  let isMovingRight = false;
  let jumpRequested = false;

  // Car Physics State
  const car = {
    x: 60,
    y: GROUND_Y - CAR_HEIGHT,
    vy: 0,
    isGrounded: true,
    rotation: 0,
    wheelAngle: 0,
    exhaustTimer: 0,
    squashY: 1,
  };

  // Entities
  let fuels = [];
  let particles = [];
  let floatingTexts = [];
  let nextEntityId = 1;

  // Environment & Animation State
  let roadOffset = 0;
  let backgroundOffset = 0;
  let fuelSpawnTimer = 0;
  let lastTimestamp = null;
  let animationFrameId = null;

  // DOM Elements
  const screenStart = document.getElementById('screen-start');
  const screenPlaying = document.getElementById('screen-playing');
  const screenGameOver = document.getElementById('screen-gameover');
  const headerDefault = document.getElementById('header-default');
  const headerHud = document.getElementById('header-hud');
  const gameControls = document.getElementById('game-controls');

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;

  // HUD Elements
  const hudScore = document.getElementById('hud-score');
  const hudTime = document.getElementById('hud-time');
  const hudSpeedText = document.getElementById('hud-speed-text');
  const hudSpeedBadge = document.getElementById('hud-speed-badge');
  const hudSpeedIcon = document.getElementById('hud-speed-icon');
  const hudHpPercent = document.getElementById('hud-hp-percent');
  const hudHpBar = document.getElementById('hud-hp-bar');
  const hudDrainRate = document.getElementById('hud-drain-rate');
  const hudWarning = document.getElementById('hud-warning');
  const hudCriticalAlert = document.getElementById('hud-critical-alert');

  // Start Screen Elements
  const startHighScoreContainer = document.getElementById('start-highscore-container');
  const startHighScoreVal = document.getElementById('start-highscore-val');
  const btnStart = document.getElementById('btn-start');

  // Game Over Elements
  const goIconContainer = document.getElementById('go-icon-container');
  const goIconClear = document.getElementById('go-icon-clear');
  const goIconFail = document.getElementById('go-icon-fail');
  const goTitle = document.getElementById('go-title');
  const goMessage = document.getElementById('go-message');
  const goFinalScore = document.getElementById('go-final-score');
  const goNewRecord = document.getElementById('go-new-record');
  const goSurvivalTime = document.getElementById('go-survival-time');
  const goHighScoreVal = document.getElementById('go-highscore-val');
  const btnRestart = document.getElementById('btn-restart');
  const btnHome = document.getElementById('btn-home');

  // Control Buttons
  const btnMoveLeft = document.getElementById('btn-left');
  const btnMoveRight = document.getElementById('btn-right');
  const btnJump = document.getElementById('btn-jump');

  // Load High Score from localStorage
  function loadHighScore() {
    try {
      const saved = localStorage.getItem(HIGH_SCORE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) {
          highScore = parsed;
        }
      }
    } catch (e) {
      // Storage unavailable
    }
    updateHighScoreUI();
  }

  function saveHighScore(newScore) {
    if (newScore > highScore) {
      highScore = newScore;
      try {
        localStorage.setItem(HIGH_SCORE_KEY, highScore.toString());
      } catch (e) {
        // ignore
      }
    }
  }

  function updateHighScoreUI() {
    if (highScore > 0) {
      if (startHighScoreContainer) startHighScoreContainer.classList.remove('hidden');
      if (startHighScoreVal) startHighScoreVal.textContent = highScore;
    } else {
      if (startHighScoreContainer) startHighScoreContainer.classList.add('hidden');
    }
  }

  // Switch App Screen Views
  function setView(view) {
    gameState = view;

    if (screenStart) screenStart.classList.toggle('hidden', view !== 'START');
    if (screenPlaying) screenPlaying.classList.toggle('hidden', view !== 'PLAYING');
    if (screenGameOver) screenGameOver.classList.toggle('hidden', view !== 'GAMEOVER');

    if (headerDefault) headerDefault.classList.toggle('hidden', view === 'PLAYING');
    if (headerHud) headerHud.classList.toggle('hidden', view !== 'PLAYING');
    if (gameControls) gameControls.classList.toggle('hidden', view !== 'PLAYING');

    if (view === 'START') {
      updateHighScoreUI();
    }
  }

  // Trigger Jump Action
  function triggerJump() {
    if (gameState === 'PLAYING' && car.isGrounded) {
      car.vy = JUMP_FORCE;
      car.isGrounded = false;
      car.squashY = 1.25;

      // Add jump lift puff particles
      for (let i = 0; i < 5; i++) {
        particles.push({
          id: nextEntityId++,
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
  }

  // Start / Restart Game Session
  function startGame() {
    score = 0;
    hp = INITIAL_HP;
    timeLeft = INITIAL_TIME;
    isMovingLeft = false;
    isMovingRight = false;
    jumpRequested = false;

    car.x = 60;
    car.y = GROUND_Y - CAR_HEIGHT;
    car.vy = 0;
    car.isGrounded = true;
    car.rotation = 0;
    car.wheelAngle = 0;
    car.exhaustTimer = 0;
    car.squashY = 1;

    fuels = [];
    particles = [];
    floatingTexts = [];
    fuelSpawnTimer = 0.4;
    roadOffset = 0;
    backgroundOffset = 0;
    lastTimestamp = null;

    updateHUD();
    setView('PLAYING');

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  // Handle Game Over
  function triggerGameOver(isClear, title, message) {
    gameState = 'GAMEOVER';
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    const survivalTime = Math.max(0, INITIAL_TIME - timeLeft);
    const isNewRecord = score > 0 && score >= highScore;
    saveHighScore(score);

    // Setup Game Over View Data
    if (goTitle) goTitle.textContent = title;
    if (goMessage) goMessage.textContent = message;
    if (goFinalScore) goFinalScore.textContent = score;
    if (goSurvivalTime) goSurvivalTime.textContent = `${survivalTime.toFixed(1)}s / 60.0s`;
    if (goHighScoreVal) goHighScoreVal.textContent = `${highScore} 개`;

    if (goIconClear && goIconFail) {
      goIconClear.classList.toggle('hidden', !isClear);
      goIconFail.classList.toggle('hidden', isClear);
    }
    if (goIconContainer) {
      goIconContainer.className = isClear
        ? 'w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/30'
        : 'w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-950/30';
    }

    if (goNewRecord) {
      goNewRecord.classList.toggle('hidden', !isNewRecord);
    }

    setView('GAMEOVER');
  }

  // Update Top HUD
  function updateHUD() {
    const elapsed = Math.max(0, INITIAL_TIME - timeLeft);
    const speedMultiplier = 1.0 + (elapsed / INITIAL_TIME) * 2.0;
    const drainRate = (BASE_HP_DRAIN * speedMultiplier).toFixed(1);

    if (hudScore) hudScore.textContent = score;
    if (hudTime) {
      hudTime.textContent = `${Math.max(0, timeLeft).toFixed(1)}s`;
      hudTime.className = `text-base font-black font-mono tabular-nums leading-none ${
        timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-cyan-300'
      }`;
    }

    if (hudSpeedText) hudSpeedText.textContent = `${speedMultiplier.toFixed(1)}x`;
    if (hudSpeedBadge) {
      if (speedMultiplier >= 2.0) {
        hudSpeedBadge.className = 'flex items-center gap-1 px-2 py-1 rounded-lg border font-mono transition-colors bg-rose-500/20 border-rose-500/50 text-rose-400';
      } else if (speedMultiplier >= 1.5) {
        hudSpeedBadge.className = 'flex items-center gap-1 px-2 py-1 rounded-lg border font-mono transition-colors bg-orange-500/15 border-orange-500/40 text-orange-400';
      } else {
        hudSpeedBadge.className = 'flex items-center gap-1 px-2 py-1 rounded-lg border font-mono transition-colors bg-slate-800/80 border-slate-700/60 text-slate-300';
      }
    }

    if (hudDrainRate) hudDrainRate.textContent = `(-${drainRate}/s)`;
    if (hudHpPercent) {
      const roundedHp = Math.round(Math.max(0, Math.min(100, hp)));
      hudHpPercent.textContent = `${roundedHp}%`;
      hudHpPercent.className = `font-mono text-[11px] tabular-nums font-bold ${
        hp <= 25 ? 'text-red-400' : 'text-emerald-400'
      }`;
    }

    if (hudHpBar) {
      hudHpBar.style.width = `${Math.max(0, Math.min(100, hp))}%`;
      if (hp > 50) {
        hudHpBar.className = 'h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-100 ease-out';
      } else if (hp > 25) {
        hudHpBar.className = 'h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-100 ease-out';
      } else {
        hudHpBar.className = 'h-full rounded-full bg-gradient-to-r from-rose-600 to-red-500 animate-pulse transition-all duration-100 ease-out';
      }
    }

    if (hudWarning) {
      hudWarning.classList.toggle('hidden', hp > 25);
    }
    if (hudCriticalAlert) {
      hudCriticalAlert.classList.toggle('hidden', hp > 15);
    }
  }

  // Main 60FPS Game Loop
  function gameLoop(timestamp) {
    if (gameState !== 'PLAYING') return;

    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
      animationFrameId = requestAnimationFrame(gameLoop);
      return;
    }

    const rawDt = (timestamp - lastTimestamp) / 1000;
    const dt = Math.min(rawDt, 0.05);
    lastTimestamp = timestamp;

    const elapsed = Math.max(0, INITIAL_TIME - timeLeft);
    const speedMultiplier = 1.0 + (elapsed / INITIAL_TIME) * 2.0;
    const currentRoadSpeed = BASE_ROAD_SPEED * speedMultiplier;
    const currentHpDrainRate = BASE_HP_DRAIN * speedMultiplier;
    const currentMoveSpeed = BASE_MOVE_SPEED * (1.0 + (speedMultiplier - 1.0) * 0.45);

    // 1. Time & HP Depletion
    timeLeft = Math.max(0, timeLeft - dt);
    hp = Math.max(0, hp - currentHpDrainRate * dt);
    updateHUD();

    if (timeLeft <= 0) {
      triggerGameOver(true, '60초 완주 성공!', '최대 3배의 초고속 질주와 가속된 체력 소모를 이겨내고 코스를 완주했습니다!');
      return;
    }

    if (hp <= 0) {
      triggerGameOver(false, '연료 소진 (게임 오버)', '최대 3배로 가속된 주행 속도와 체력 소모로 인해 연료가 바닥났습니다.');
      return;
    }

    // 2. Player Controls & Physics
    if (isMovingLeft) {
      car.x = Math.max(12, car.x - currentMoveSpeed * dt);
    }
    if (isMovingRight) {
      car.x = Math.min(CANVAS_WIDTH - CAR_WIDTH - 12, car.x + currentMoveSpeed * dt);
    }

    if (!car.isGrounded) {
      car.vy += GRAVITY * dt;
      car.y += car.vy * dt;
      car.rotation = Math.max(-0.2, Math.min(0.2, car.vy * 0.0006));

      if (car.y >= GROUND_Y - CAR_HEIGHT) {
        car.y = GROUND_Y - CAR_HEIGHT;
        car.vy = 0;
        car.isGrounded = true;
        car.rotation = 0;
        car.squashY = 0.8;

        for (let i = 0; i < 4; i++) {
          particles.push({
            id: nextEntityId++,
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
      car.squashY += (1 - car.squashY) * Math.min(1, dt * 15);
    }

    car.wheelAngle += dt * 18 * speedMultiplier;

    // Exhaust Particles
    car.exhaustTimer += dt;
    const exhaustInterval = Math.max(0.02, 0.06 / speedMultiplier);
    if (car.exhaustTimer > exhaustInterval) {
      car.exhaustTimer = 0;
      particles.push({
        id: nextEntityId++,
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

    // 3. Environment Scrolling
    roadOffset = (roadOffset + currentRoadSpeed * dt) % 40;
    backgroundOffset = (backgroundOffset + 30 * speedMultiplier * dt) % 360;

    // 4. Fuel Spawning
    fuelSpawnTimer += dt;
    if (fuelSpawnTimer >= 1.0) {
      fuelSpawnTimer -= 1.0;
      const type = Math.random() < 0.5 ? 'ground' : 'air';
      const baseY = type === 'ground' ? GROUND_Y - 22 : GROUND_Y - 82;

      fuels.push({
        id: nextEntityId++,
        x: CANVAS_WIDTH + 20,
        y: baseY,
        baseY: baseY,
        type: type,
        width: 22,
        height: 24,
        collected: false,
        bobOffset: Math.random() * Math.PI * 2,
      });
    }

    // 5. Update Fuels & Collision Check
    const carHitbox = {
      left: car.x + 4,
      right: car.x + CAR_WIDTH - 4,
      top: car.y + 4,
      bottom: car.y + CAR_HEIGHT,
    };

    for (let i = fuels.length - 1; i >= 0; i--) {
      const fuel = fuels[i];
      fuel.x -= currentRoadSpeed * dt;
      fuel.y = fuel.baseY + Math.sin(timestamp * 0.006 + fuel.bobOffset) * 3;

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
        score += 1;
        hp = Math.min(100, hp + 20);

        floatingTexts.push({
          id: nextEntityId++,
          text: '+1 FUEL',
          x: fuel.x + 8,
          y: fuel.y - 10,
          alpha: 1.0,
          color: '#fbbf24',
          vy: -45,
        });

        for (let p = 0; p < 12; p++) {
          const angle = (Math.PI * 2 * p) / 12 + Math.random() * 0.4;
          const spd = 70 + Math.random() * 60;
          particles.push({
            id: nextEntityId++,
            x: fuel.x + fuel.width / 2,
            y: fuel.y + fuel.height / 2,
            vx: Math.cos(angle) * spd - currentRoadSpeed * 0.3,
            vy: Math.sin(angle) * spd,
            color: p % 2 === 0 ? '#38bdf8' : '#fbbf24',
            size: 3 + Math.random() * 3,
            alpha: 1.0,
            life: 0,
            maxLife: 0.45,
          });
        }
      }

      if (fuel.x < -40 || fuel.collected) {
        fuels.splice(i, 1);
      }
    }

    // 6. Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
      }
    }

    // 7. Update Floating Texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.alpha -= dt * 1.5;
      if (ft.alpha <= 0) {
        floatingTexts.splice(i, 1);
      }
    }

    // 8. Render Canvas
    renderCanvas(timestamp, speedMultiplier, currentRoadSpeed);

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  // Render Canvas Scene
  function renderCanvas(timestamp, speedMultiplier, currentRoadSpeed) {
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // A. Sky Backdrop
    const skyGradient = ctx.createLinearGradient(0, 0, 0, ROAD_TOP);
    skyGradient.addColorStop(0, '#090d1a');
    skyGradient.addColorStop(0.6, '#151c38');
    skyGradient.addColorStop(1, '#2c1e4a');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, ROAD_TOP);

    // Stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const starSeeds = [30, 85, 140, 210, 275, 330, 50, 175, 290];
    for (let i = 0; i < starSeeds.length; i++) {
      const sx = (starSeeds[i] - backgroundOffset * 0.2 + CANVAS_WIDTH * 2) % CANVAS_WIDTH;
      const sy = 15 + (i * 17) % 65;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Mountain Silhouettes
    ctx.fillStyle = '#11162d';
    ctx.beginPath();
    ctx.moveTo(0, ROAD_TOP);
    const bgOff = backgroundOffset * 0.4;
    for (let x = 0; x <= CANVAS_WIDTH; x += 30) {
      const hillY = ROAD_TOP - 35 + Math.sin((x + bgOff) * 0.03) * 16 + Math.cos((x + bgOff) * 0.015) * 8;
      ctx.lineTo(x, hillY);
    }
    ctx.lineTo(CANVAS_WIDTH, ROAD_TOP);
    ctx.closePath();
    ctx.fill();

    // City Buildings
    ctx.fillStyle = '#1c1b3d';
    for (let bx = -40; bx < CANVAS_WIDTH + 60; bx += 50) {
      const screenBx = bx - ((backgroundOffset * 0.8) % 50);
      const bHeight = 25 + Math.sin(bx * 0.1) * 15;
      ctx.fillRect(screenBx, ROAD_TOP - bHeight, 35, bHeight);
      ctx.fillStyle = 'rgba(253, 224, 71, 0.25)';
      ctx.fillRect(screenBx + 6, ROAD_TOP - bHeight + 6, 4, 4);
      ctx.fillRect(screenBx + 18, ROAD_TOP - bHeight + 14, 4, 4);
      ctx.fillStyle = '#1c1b3d';
    }

    // High Speed Lines
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
    ctx.fillStyle = '#131722';
    ctx.fillRect(0, ROAD_TOP, CANVAS_WIDTH, CANVAS_HEIGHT - ROAD_TOP);

    // Hazard Stripes
    const curbHeight = 8;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, ROAD_TOP, CANVAS_WIDTH, curbHeight);
    const stripeWidth = 18;
    const curbOffset = roadOffset % (stripeWidth * 2);
    for (let x = -stripeWidth * 2; x < CANVAS_WIDTH + stripeWidth * 2; x += stripeWidth * 2) {
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(x - curbOffset, ROAD_TOP, stripeWidth, curbHeight);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x - curbOffset + stripeWidth, ROAD_TOP, stripeWidth, curbHeight);
    }

    // Yellow Line
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, ROAD_TOP + curbHeight, CANVAS_WIDTH, 2);

    // Road Dashes
    const dashY = ROAD_TOP + 28;
    const dashWidth = 32;
    const dashGap = 24;
    const dashPeriod = dashWidth + dashGap;
    const dashScroll = (roadOffset * 2.2) % dashPeriod;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let dx = -dashPeriod; dx < CANVAS_WIDTH + dashPeriod; dx += dashPeriod) {
      ctx.fillRect(dx - dashScroll, dashY, dashWidth, 4);
    }

    // Bottom Curb
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 10);
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 2);

    // C. Fuels
    for (let i = 0; i < fuels.length; i++) {
      const fuel = fuels[i];
      ctx.save();
      ctx.translate(fuel.x, fuel.y);

      if (fuel.type === 'ground') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(fuel.width / 2, fuel.height + 4, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.beginPath();
        ctx.ellipse(fuel.width / 2, fuel.height + 6, 7, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(fuel.width / 2 - 4, fuel.height);
        ctx.lineTo(fuel.width / 2 + 4, fuel.height);
        ctx.lineTo(fuel.width / 2, fuel.height + 5 + Math.sin(timestamp * 0.02) * 2);
        ctx.closePath();
        ctx.fill();
      }

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

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(2, 4, fuel.width - 4, fuel.height - 6, 4);
      } else {
        ctx.rect(2, 4, fuel.width - 4, fuel.height - 6);
      }
      ctx.fill();

      // Top Cap
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(fuel.width / 2 - 4, 0, 8, 4);

      // Energy Icon
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const cx = fuel.width / 2;
      ctx.moveTo(cx + 1, 7);
      ctx.lineTo(cx - 3, 13);
      ctx.lineTo(cx, 13);
      ctx.lineTo(cx - 1, 19);
      ctx.lineTo(cx + 4, 12);
      ctx.lineTo(cx + 1, 12);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = fuel.type === 'air' ? 'rgba(56, 189, 248, 0.6)' : 'rgba(251, 191, 36, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(1, 3, fuel.width - 2, fuel.height - 4);

      ctx.restore();
    }

    // D. Player Car
    ctx.save();
    ctx.translate(car.x + CAR_WIDTH / 2, car.y + CAR_HEIGHT);
    ctx.rotate(car.rotation);
    ctx.scale(1, car.squashY);
    ctx.translate(-(CAR_WIDTH / 2), -CAR_HEIGHT);

    // Headlight Beam
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

    // Car Shadow
    if (car.isGrounded) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(CAR_WIDTH / 2, CAR_HEIGHT + 1, CAR_WIDTH / 2 + 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Car Body Base
    const bodyGrad = ctx.createLinearGradient(0, 6, 0, CAR_HEIGHT);
    bodyGrad.addColorStop(0, '#ef4444');
    bodyGrad.addColorStop(0.5, '#dc2626');
    bodyGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = bodyGrad;

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

    // White Racing Stripe
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 11, CAR_WIDTH - 16, 2.5);

    // Windshield
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(17, 7);
    ctx.lineTo(32, 7);
    ctx.lineTo(42, 14);
    ctx.lineTo(18, 14);
    ctx.closePath();
    ctx.fill();

    // Windshield Glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(22, 8);
    ctx.lineTo(26, 8);
    ctx.lineTo(29, 13);
    ctx.lineTo(25, 13);
    ctx.closePath();
    ctx.fill();

    // Spoiler
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(1, 5, 8, 3);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(2, 8, 3, 4);

    // Headlight
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(CAR_WIDTH - 4, 15, 4, 4);

    // Taillight
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(0, 14, 3, 4);

    // Wheels
    function drawWheel(wx, wy) {
      const radius = 6.5;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(wx, wy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(wx, wy, radius - 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let a = 0; a < 4; a++) {
        const spokeAngle = car.wheelAngle + (a * Math.PI) / 2;
        ctx.moveTo(wx, wy);
        ctx.lineTo(wx + Math.cos(spokeAngle) * (radius - 1.5), wy + Math.sin(spokeAngle) * (radius - 1.5));
      }
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(wx, wy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    drawWheel(12, CAR_HEIGHT - 3);
    drawWheel(CAR_WIDTH - 12, CAR_HEIGHT - 3);

    ctx.restore();

    // E. Particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // F. Floating Texts
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < floatingTexts.length; i++) {
      const ft = floatingTexts[i];
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = ft.alpha;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1.0;

    // G. Low Fuel Pulsing Vignette Warning
    if (hp <= 25) {
      const pulse = 0.3 + 0.3 * Math.sin(timestamp * 0.008);
      ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
      ctx.lineWidth = 6;
      ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  // Bind User Events (Pointer & Keyboard)
  function setupEventListeners() {
    // Start & Restart buttons
    if (btnStart) btnStart.addEventListener('click', startGame);
    if (btnRestart) btnRestart.addEventListener('click', startGame);
    if (btnHome) btnHome.addEventListener('click', () => setView('START'));

    // Touch / Pointer controls (Left button)
    if (btnMoveLeft) {
      const startLeft = (e) => { e.preventDefault(); isMovingLeft = true; };
      const stopLeft = (e) => { e.preventDefault(); isMovingLeft = false; };
      btnMoveLeft.addEventListener('pointerdown', startLeft);
      btnMoveLeft.addEventListener('pointerup', stopLeft);
      btnMoveLeft.addEventListener('pointerleave', stopLeft);
      btnMoveLeft.addEventListener('pointercancel', stopLeft);
    }

    // Touch / Pointer controls (Right button)
    if (btnMoveRight) {
      const startRight = (e) => { e.preventDefault(); isMovingRight = true; };
      const stopRight = (e) => { e.preventDefault(); isMovingRight = false; };
      btnMoveRight.addEventListener('pointerdown', startRight);
      btnMoveRight.addEventListener('pointerup', stopRight);
      btnMoveRight.addEventListener('pointerleave', stopRight);
      btnMoveRight.addEventListener('pointercancel', stopRight);
    }

    // Touch / Pointer controls (Jump button)
    if (btnJump) {
      btnJump.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        triggerJump();
      });
    }

    // Global Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (gameState === 'PLAYING') {
        if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          isMovingLeft = true;
        } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          isMovingRight = true;
        } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          triggerJump();
        }
      } else if (gameState === 'START' || gameState === 'GAMEOVER') {
        if (e.code === 'Space' || e.code === 'Enter') {
          startGame();
        }
      }
    }, { passive: false });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        isMovingLeft = false;
      } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        isMovingRight = false;
      }
    });
  }

  // Initialize on DOM Ready
  function init() {
    loadHighScore();
    setupEventListeners();
    setView('START');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
