(function(){
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const healthFill = document.getElementById('health-fill');
  const hudLevel = document.getElementById('hud-level');
  const hudScore = document.getElementById('hud-score');
  const startOverlay = document.getElementById('start-overlay');
  const levelOverlay = document.getElementById('level-overlay');
  const levelOverlayTitle = document.getElementById('level-overlay-title');
  const levelOverlaySub = document.getElementById('level-overlay-sub');
  const gameoverOverlay = document.getElementById('gameover-overlay');
  const youDiedTitle = document.getElementById('you-died-title');
  const finalBlock = document.getElementById('final-block');
  const finalScoreEl = document.getElementById('final-score');
  const finalLevelEl = document.getElementById('final-level');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const touchControls = document.getElementById('touch-controls');
  const musicToggle = document.getElementById('music-toggle');
  const damageFlash = document.getElementById('damage-flash');
  const shipOptions = document.getElementById('ship-options');

  if('ontouchstart' in window){
    touchControls.classList.add('show');
  }

  /* ================= SHIP DESIGNS ================= */
  // Each design is a draw function called with the canvas context already
  // translated to the player's position. Index matches data-ship on the
  // picker buttons.
  const SHIP_DESIGNS = [
    { // 0 - Interceptor (classic dart)
      color: '#39ff88',
      draw(c){
        c.beginPath();
        c.moveTo(0,-16);
        c.lineTo(14,14);
        c.lineTo(0,8);
        c.lineTo(-14,14);
        c.closePath();
        c.fill();
      }
    },
    { // 1 - Falcon (wide swept wings)
      color: '#00f0ff',
      draw(c){
        c.beginPath();
        c.moveTo(0,-18);
        c.lineTo(6,2);
        c.lineTo(20,16);
        c.lineTo(4,10);
        c.lineTo(0,16);
        c.lineTo(-4,10);
        c.lineTo(-20,16);
        c.lineTo(-6,2);
        c.closePath();
        c.fill();
      }
    },
    { // 2 - Vanguard (armored diamond hull)
      color: '#ff2ec4',
      draw(c){
        c.beginPath();
        c.moveTo(0,-17);
        c.lineTo(12,-2);
        c.lineTo(9,14);
        c.lineTo(0,9);
        c.lineTo(-9,14);
        c.lineTo(-12,-2);
        c.closePath();
        c.fill();
        c.beginPath();
        c.moveTo(0,-6);
        c.lineTo(5,2);
        c.lineTo(0,10);
        c.lineTo(-5,2);
        c.closePath();
        c.fillStyle = '#fff';
        c.globalAlpha = 0.85;
        c.fill();
        c.globalAlpha = 1;
      }
    }
  ];
  let selectedShip = 0;

  shipOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.ship-opt');
    if(!btn) return;
    selectedShip = parseInt(btn.dataset.ship, 10);
    [...shipOptions.querySelectorAll('.ship-opt')].forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });

  /* ================= LEVEL / SECTOR CONFIG ================= */
  const LEVELS = [
    { threshold: 0,   name: 'SECTOR 1', sub: 'Scout drones inbound. Stay sharp.',      bg: 'radial-gradient(ellipse at center, #0d0a18 0%, #05030a 70%)', spawnInterval: 70,  bomberChance: 0,    shooterChance: 0.18 },
    { threshold: 150, name: 'SECTOR 2', sub: 'Enemy resistance is intensifying...',    bg: 'radial-gradient(ellipse at center, #0a1428 0%, #05030a 70%)', spawnInterval: 54,  bomberChance: 0.14, shooterChance: 0.24 },
    { threshold: 350, name: 'SECTOR 3', sub: 'Heavy bombers detected. Good luck.',     bg: 'radial-gradient(ellipse at center, #240a14 0%, #05030a 70%)', spawnInterval: 42,  bomberChance: 0.22, shooterChance: 0.3  }
  ];
  let levelIndex = 0;
  let levelTransitionActive = false;

  /* ================= AUDIO (procedural, no external files) ================= */
  const MusicEngine = (function(){
    let ctxA = null, masterGain = null, timer = null, step = 0, on = false;
    const bass = [55, 55, 82.4, 65.4, 55, 55, 98, 73.4]; // A1-ish 8-bit bassline
    function ensureCtx(){
      if(!ctxA){
        ctxA = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctxA.createGain();
        masterGain.gain.value = 0.06;
        masterGain.connect(ctxA.destination);
      }
    }
    function playNote(freq, duration){
      const osc = ctxA.createOscillator();
      const g = ctxA.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      g.gain.value = 0.9;
      g.gain.exponentialRampToValueAtTime(0.001, ctxA.currentTime + duration);
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      osc.stop(ctxA.currentTime + duration);
    }
    function tick(){
      playNote(bass[step % bass.length], 0.18);
      if(step % 2 === 0) playNote(bass[step % bass.length] * 2, 0.09);
      step++;
    }
    return {
      toggle(){
        ensureCtx();
        if(ctxA.state === 'suspended') ctxA.resume();
        on = !on;
        if(on){
          tick();
          timer = setInterval(tick, 220);
        } else {
          clearInterval(timer);
        }
        return on;
      },
      isOn(){ return on; },
      stop(){
        on = false;
        clearInterval(timer);
      }
    };
  })();

  musicToggle.addEventListener('click', () => {
    const isOn = MusicEngine.toggle();
    musicToggle.textContent = isOn ? '♪ MUSIC: ON' : '♪ MUSIC: OFF';
    musicToggle.classList.toggle('on', isOn);
  });

  /* ================= GAME STATE ================= */
  let running = false;
  let raf = null;

  const player = {
    x: W/2, y: H - 50, w: 34, h: 26, speed: 5.2, cooldown: 0,
    hp: 100, maxHp: 100, invuln: 0
  };
  let bullets = [];
  let enemyBullets = [];
  let enemies = [];
  let particles = [];
  let stars = [];
  let score = 0;
  let frame = 0;
  let spawnTimer = 0;
  let spawnInterval = 70;
  let difficultyTimer = 0;

  const keys = { left: false, right: false, fire: false };

  function initStars(){
    stars = [];
    for(let i=0;i<80;i++){
      stars.push({
        x: Math.random()*W,
        y: Math.random()*H,
        r: Math.random()*1.6 + 0.3,
        speed: Math.random()*1.2 + 0.3
      });
    }
  }

  function resetGame(){
    player.x = W/2; player.y = H - 50; player.cooldown = 0;
    player.hp = player.maxHp; player.invuln = 0;
    bullets = []; enemyBullets = []; enemies = []; particles = [];
    score = 0; frame = 0; spawnTimer = 0; difficultyTimer = 0;
    levelIndex = 0; levelTransitionActive = false;
    spawnInterval = LEVELS[0].spawnInterval;
    canvas.style.background = LEVELS[0].bg;
    updateHud();
    initStars();
  }

  function updateHud(){
    hudScore.textContent = 'SCORE ' + score;
    hudLevel.textContent = LEVELS[levelIndex].name;
    updateHealthBar();
  }

  function updateHealthBar(){
    const pct = Math.max(player.hp, 0) / player.maxHp * 100;
    healthFill.style.width = pct + '%';
    healthFill.classList.remove('mid','low');
    if(pct <= 30) healthFill.classList.add('low');
    else if(pct <= 60) healthFill.classList.add('mid');
  }

  function checkLevelUp(){
    const next = levelIndex + 1;
    if(next < LEVELS.length && score >= LEVELS[next].threshold){
      levelIndex = next;
      spawnInterval = LEVELS[levelIndex].spawnInterval;
      canvas.style.background = LEVELS[levelIndex].bg;
      showLevelTransition();
    }
  }

  function showLevelTransition(){
    levelTransitionActive = true;
    levelOverlayTitle.textContent = LEVELS[levelIndex].name;
    levelOverlaySub.textContent = LEVELS[levelIndex].sub;
    levelOverlay.style.display = 'flex';
    updateHud();
    setTimeout(() => {
      levelOverlay.style.display = 'none';
      levelTransitionActive = false;
    }, 1500);
  }

  function spawnEnemy(){
    const cfg = LEVELS[levelIndex];
    const roll = Math.random();
    let type = 'drone';
    if(roll < cfg.bomberChance) type = 'bomber';
    else if(roll < cfg.bomberChance + cfg.shooterChance) type = 'shooter';

    let w=28,h=22,speed=1.4+Math.random()*1.1,hp=1,hue='#00f0ff',dmg=18;
    if(type === 'shooter'){ speed = 1.1+Math.random()*0.6; hp = 2; hue = '#ff2ec4'; dmg = 20; }
    if(type === 'bomber'){ w=42; h=34; speed = 0.7+Math.random()*0.4; hp = 4; hue = '#ff8a1a'; dmg = 40; }

    enemies.push({
      x: Math.random()*(W-40)+20, y: -20, w, h, speed, type, hp, hue, dmg,
      fireTimer: Math.random()*90 + 40
    });
  }

  function spawnParticles(x,y,color,count){
    for(let i=0;i<count;i++){
      particles.push({
        x, y,
        vx: (Math.random()-0.5)*4,
        vy: (Math.random()-0.5)*4,
        life: 22 + Math.random()*12,
        color
      });
    }
  }

  function rectsOverlap(a,b){
    return Math.abs(a.x-b.x) < (a.w+b.w)/2 && Math.abs(a.y-b.y) < (a.h+b.h)/2;
  }

  function triggerDamageFlash(){
    damageFlash.classList.remove('active');
    void damageFlash.offsetWidth; // restart animation
    damageFlash.classList.add('active');
  }

  function playerHit(amount){
    if(player.invuln > 0) return;
    player.hp -= amount;
    player.invuln = 45;
    updateHealthBar();
    triggerDamageFlash();
    spawnParticles(player.x, player.y, '#ff2ec4', 22);
    if(player.hp <= 0){
      player.hp = 0;
      updateHealthBar();
      endGame();
    }
  }

  function endGame(){
    running = false;
    cancelAnimationFrame(raf);
    MusicEngine.stop();
    musicToggle.textContent = '♪ MUSIC: OFF';
    musicToggle.classList.remove('on');

    finalScoreEl.textContent = 'SCORE ' + score;
    finalLevelEl.textContent = 'REACHED ' + LEVELS[levelIndex].name;
    finalBlock.classList.remove('show');
    youDiedTitle.style.animation = 'none';
    void youDiedTitle.offsetWidth;
    youDiedTitle.style.animation = '';
    gameoverOverlay.style.display = 'flex';

    setTimeout(() => finalBlock.classList.add('show'), 1400);

    try{
      window.parent.postMessage({ type: 'GAME_OVER', game: 'shooter', score, meta: { sector: levelIndex+1, ship: selectedShip } }, '*');
    }catch(e){}
  }

  function update(){
    frame++;
    if(levelTransitionActive) return; // pause action during sector banner

    for(const s of stars){
      s.y += s.speed;
      if(s.y > H){ s.y = 0; s.x = Math.random()*W; }
    }

    if(keys.left) player.x -= player.speed;
    if(keys.right) player.x += player.speed;
    player.x = Math.max(20, Math.min(W-20, player.x));

    if(player.cooldown > 0) player.cooldown--;
    if(player.invuln > 0) player.invuln--;
    if(keys.fire && player.cooldown === 0){
      bullets.push({ x: player.x, y: player.y - 18, w: 4, h: 12, speed: 8.5 });
      player.cooldown = 9;
    }

    difficultyTimer++;
    if(difficultyTimer % 300 === 0 && spawnInterval > 26){
      spawnInterval -= 3;
    }

    spawnTimer++;
    if(spawnTimer >= spawnInterval){
      spawnTimer = 0;
      spawnEnemy();
    }

    bullets.forEach(b => b.y -= b.speed);
    bullets = bullets.filter(b => b.y > -20);

    enemyBullets.forEach(b => b.y += b.speed);
    enemyBullets = enemyBullets.filter(b => b.y < H+20);

    enemies.forEach(e => {
      e.y += e.speed;
      if(e.type === 'shooter'){
        e.fireTimer--;
        if(e.fireTimer <= 0){
          enemyBullets.push({ x: e.x, y: e.y+12, w: 4, h: 10, speed: 4.2 });
          e.fireTimer = 90 + Math.random()*60;
        }
      }
    });

    enemies = enemies.filter(e => e.y <= H+20);

    for(let i = enemies.length-1; i>=0; i--){
      const e = enemies[i];
      for(let j = bullets.length-1; j>=0; j--){
        const b = bullets[j];
        if(rectsOverlap(e, {x:b.x,y:b.y,w:b.w,h:b.h})){
          e.hp -= 1;
          bullets.splice(j,1);
          if(e.hp <= 0){
            score += e.type === 'bomber' ? 40 : (e.type === 'shooter' ? 25 : 10);
            spawnParticles(e.x, e.y, e.hue, e.type === 'bomber' ? 26 : 16);
            enemies.splice(i,1);
            updateHud();
            checkLevelUp();
          }
          break;
        }
      }
    }

    for(let i = enemies.length-1; i>=0; i--){
      const e = enemies[i];
      if(rectsOverlap(e, player)){
        const dmg = e.dmg;
        enemies.splice(i,1);
        playerHit(dmg);
      }
    }

    for(let i = enemyBullets.length-1; i>=0; i--){
      const b = enemyBullets[i];
      if(rectsOverlap(player, {x:b.x,y:b.y,w:b.w,h:b.h})){
        enemyBullets.splice(i,1);
        playerHit(20);
      }
    }

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    particles = particles.filter(p => p.life > 0);
  }

  function draw(){
    ctx.clearRect(0,0,W,H);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    stars.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fill();
    });

    // player ship (flickers while invulnerable after a hit)
    const flicker = player.invuln > 0 && Math.floor(frame/3) % 2 === 0;
    if(!flicker){
      const ship = SHIP_DESIGNS[selectedShip];
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.shadowColor = ship.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = ship.color;
      ship.draw(ctx);
      ctx.restore();
    }

    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    bullets.forEach(b => ctx.fillRect(b.x-b.w/2, b.y-b.h/2, b.w, b.h));

    ctx.fillStyle = '#ff2ec4';
    ctx.shadowColor = '#ff2ec4';
    enemyBullets.forEach(b => ctx.fillRect(b.x-b.w/2, b.y-b.h/2, b.w, b.h));

    enemies.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.shadowColor = e.hue;
      ctx.shadowBlur = 12;
      ctx.fillStyle = e.hue;
      if(e.type === 'bomber'){
        ctx.beginPath();
        ctx.moveTo(0, 18);
        ctx.lineTo(20, -6);
        ctx.lineTo(10, -16);
        ctx.lineTo(-10, -16);
        ctx.lineTo(-20, -6);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(14, -12);
        ctx.lineTo(0, -4);
        ctx.lineTo(-14, -12);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });

    particles.forEach(p => {
      ctx.globalAlpha = Math.max(p.life/30, 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x-2, p.y-2, 4, 4);
      ctx.globalAlpha = 1;
    });

    ctx.shadowBlur = 0;
  }

  function loop(){
    if(!running) return;
    update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  function startGame(){
    resetGame();
    startOverlay.style.display = 'none';
    gameoverOverlay.style.display = 'none';
    levelOverlay.style.display = 'none';
    running = true;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);

  window.addEventListener('keydown', (e) => {
    if(['ArrowLeft','a','A'].includes(e.key)) keys.left = true;
    if(['ArrowRight','d','D'].includes(e.key)) keys.right = true;
    if(e.key === ' '){ keys.fire = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    if(['ArrowLeft','a','A'].includes(e.key)) keys.left = false;
    if(['ArrowRight','d','D'].includes(e.key)) keys.right = false;
    if(e.key === ' ') keys.fire = false;
  });

  function bindHold(el, onDown, onUp){
    el.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(); });
    el.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); });
    el.addEventListener('mousedown', onDown);
    el.addEventListener('mouseup', onUp);
    el.addEventListener('mouseleave', onUp);
  }
  bindHold(document.getElementById('touch-left'), () => keys.left = true, () => keys.left = false);
  bindHold(document.getElementById('touch-right'), () => keys.right = true, () => keys.right = false);
  bindHold(document.getElementById('touch-fire'), () => keys.fire = true, () => keys.fire = false);

  initStars();
  draw();
})();