(function(){
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const shooterWrap = document.querySelector('.shooter-wrap');

  // Canvas now fills the whole viewport instead of a fixed 700x500 box.
  let W = window.innerWidth, H = window.innerHeight;
  function resizeCanvas(){
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
  }
  resizeCanvas();

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
  const playerMount = document.getElementById('player-mount');

  if('ontouchstart' in window){
    touchControls.classList.add('show');
  }

  /* ================= BACKGROUND MUSIC (real audio file) ================= */
  const bgMusic = document.getElementById('bg-music');
  bgMusic.volume = 0.45; // tweak to taste
  let musicEnabled = true; // user preference toggle; true = wants music on

  function fadeAudio(el, target, duration = 400){
    const start = el.volume;
    const startTime = performance.now();
    function step(now){
      const t = Math.min((now - startTime) / duration, 1);
      el.volume = start + (target - start) * t;
      if(t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function playMusic(){
    if(!musicEnabled) return;
    bgMusic.currentTime = 0;
    bgMusic.volume = 0;
    bgMusic.play().catch(err => console.warn('Playback blocked until user interaction:', err));
    fadeAudio(bgMusic, 0.45, 500);
  }

  function stopMusic(){
    fadeAudio(bgMusic, 0, 400);
    setTimeout(() => bgMusic.pause(), 420);
  }

  musicToggle.addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    if(musicEnabled){
      musicToggle.textContent = '♪ MUSIC: ON';
      musicToggle.classList.add('on');
      if(running) playMusic();
    } else {
      musicToggle.textContent = '♪ MUSIC: OFF';
      musicToggle.classList.remove('on');
      stopMusic();
    }
  });

  /* ================= SHIP SELECTION ================= */
  // The player's visible ship is now the detailed pixel-art battleship
  // (rendered as DOM markup layered over the canvas — see .player-mount in
  // space.css). Each picker option just retints that same art with a
  // hue-rotate filter so the three choices still look distinct.
  const SHIP_HUES = [-40, 0, 130]; // 0: Interceptor(greenish) 1: Falcon(cyan, native color) 2: Vanguard(pink)
  let selectedShip = 0;

  function applyShipTint(){
    playerMount.style.filter = 'hue-rotate(' + SHIP_HUES[selectedShip] + 'deg)';
  }
  applyShipTint();

  shipOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.ship-opt');
    if(!btn) return;
    selectedShip = parseInt(btn.dataset.ship, 10);
    [...shipOptions.querySelectorAll('.ship-opt')].forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    applyShipTint();
  });

  /* ================= LEVEL / SECTOR CONFIG ================= */
  // Sector backgrounds no longer swap the canvas background - the pinned
  // space.jpg image (set in space.css) stays in place for the whole run.
  // Sector data below only affects difficulty pacing and HUD text now.
  const LEVELS = [
    { threshold: 0,   name: 'SECTOR 1', sub: 'Scout drones inbound. Stay sharp.',      spawnInterval: 70,  bomberChance: 0,    shooterChance: 0.18 },
    { threshold: 150, name: 'SECTOR 2', sub: 'Enemy resistance is intensifying...',    spawnInterval: 54,  bomberChance: 0.14, shooterChance: 0.24 },
    { threshold: 350, name: 'SECTOR 3', sub: 'Heavy bombers detected. Good luck.',     spawnInterval: 42,  bomberChance: 0.22, shooterChance: 0.3  }
  ];
  let levelIndex = 0;
  let levelTransitionActive = false;

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
    enemies.forEach(removeEnemyMount);
    bullets = []; enemyBullets = []; enemies = []; particles = [];
    score = 0; frame = 0; spawnTimer = 0; difficultyTimer = 0;
    levelIndex = 0; levelTransitionActive = false;
    spawnInterval = LEVELS[0].spawnInterval;
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

  // Enemies are rendered as the pixel-art spaceship (see .enemy-mount in
  // space.css) instead of canvas triangles, recolored per type and flipped
  // to face the player. Each enemy object carries a reference to its DOM
  // mount (`el`), which is created here and removed wherever the enemy
  // leaves play (killed, off-screen, or collided with the player).
  function createEnemyMount(type){
    const mount = document.createElement('div');
    mount.className = 'enemy-mount type-' + type;
    mount.innerHTML =
      '<div class="enemy-ship">' +
        '<div class="body"></div>' +
        '<div class="cockpit"></div>' +
        '<div class="wing-left"></div>' +
        '<div class="wing-right"></div>' +
        '<div class="engine"><span></span><span></span><span></span></div>' +
        '<div class="flame"></div>' +
        '<div class="pixel p1"></div><div class="pixel p2"></div><div class="pixel p3"></div>' +
        '<div class="pixel p4"></div><div class="pixel p5"></div><div class="pixel p6"></div>' +
        '<div class="nose-light"></div>' +
      '</div>';
    shooterWrap.appendChild(mount);
    return mount;
  }

  function removeEnemyMount(e){
    if(e.el){ e.el.remove(); e.el = null; }
  }

  function spawnEnemy(){
    const cfg = LEVELS[levelIndex];
    const roll = Math.random();
    let type = 'drone';
    if(roll < cfg.bomberChance) type = 'bomber';
    else if(roll < cfg.bomberChance + cfg.shooterChance) type = 'shooter';

    // Enemy palette kept distinct from the player's cyan hull/engine glow
    // and cyan bullets: drones = red, shooters = purple, bombers = amber.
    let w=28,h=22,speed=1.4+Math.random()*1.1,hp=1,hue='#ff3355',dmg=18;
    if(type === 'shooter'){ speed = 1.1+Math.random()*0.6; hp = 2; hue = '#b347ff'; dmg = 20; }
    if(type === 'bomber'){ w=42; h=34; speed = 0.7+Math.random()*0.4; hp = 4; hue = '#ff9500'; dmg = 40; }

    enemies.push({
      x: Math.random()*(W-40)+20, y: -20, w, h, speed, type, hp, hue, dmg,
      fireTimer: Math.random()*90 + 40,
      el: createEnemyMount(type)
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
    stopMusic();
    playerMount.style.display = 'none';

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

    const survivors = [];
    for(const e of enemies){
      if(e.y <= H+20) survivors.push(e);
      else removeEnemyMount(e); // drifted off the bottom unkilled
    }
    enemies = survivors;

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
            removeEnemyMount(e);
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
        removeEnemyMount(e);
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

  // Keeps the DOM battleship glued to the player's canvas position, and
  // rescales it if the canvas is being displayed smaller than its native
  // 700x500 resolution (e.g. on a narrow phone screen).
  function syncShipPosition(){
    const canvasRect = canvas.getBoundingClientRect();
    const wrapRect = canvas.parentElement.getBoundingClientRect();
    const scale = canvasRect.width / W;

    const left = (canvasRect.left - wrapRect.left) + player.x * scale;
    const top = (canvasRect.top - wrapRect.top) + player.y * scale;

    playerMount.style.left = left + 'px';
    playerMount.style.top = top + 'px';
    playerMount.style.transform = 'scale(' + scale + ')';

    const flicker = player.invuln > 0 && Math.floor(frame/3) % 2 === 0;
    playerMount.classList.toggle('flicker', flicker);

    // Same trick, applied to every live enemy's DOM-mounted ship.
    for(const e of enemies){
      if(!e.el) continue;
      const eLeft = (canvasRect.left - wrapRect.left) + e.x * scale;
      const eTop = (canvasRect.top - wrapRect.top) + e.y * scale;
      e.el.style.left = eLeft + 'px';
      e.el.style.top = eTop + 'px';
      e.el.style.setProperty('--scale', scale);
      e.el.style.opacity = scale ? 1 : 0;
      e.el.style.transform = 'scale(' + scale + ')';
    }
  }

  function draw(){
    ctx.clearRect(0,0,W,H);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    stars.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fill();
    });

    syncShipPosition();

    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    bullets.forEach(b => ctx.fillRect(b.x-b.w/2, b.y-b.h/2, b.w, b.h));

    ctx.fillStyle = '#ff2ec4';
    ctx.shadowColor = '#ff2ec4';
    enemyBullets.forEach(b => ctx.fillRect(b.x-b.w/2, b.y-b.h/2, b.w, b.h));

    // Enemies are the real pixel-art DOM ships now (positioned in
    // syncShipPosition), so there's nothing left to paint for them here.

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
    playerMount.style.display = 'block';
    syncShipPosition();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    playMusic();
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

  window.addEventListener('resize', () => {
    resizeCanvas();
    player.x = Math.max(20, Math.min(W-20, player.x));
    if(!running) player.y = H - 50;
    initStars();
    if(running) syncShipPosition();
    else draw();
  });

  initStars();
  draw();
})();