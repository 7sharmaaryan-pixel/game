(function(){
  const canvas = document.getElementById('range-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const stage = document.getElementById('stage');
  const crosshairEl = document.getElementById('crosshair');
  const hitMarkerEl = document.getElementById('hit-marker');
  const reloadBar = document.getElementById('reload-bar');
  const reloadFill = document.getElementById('reload-fill');
  const ammoSlotsEl = document.getElementById('ammo-slots');

  const hudScore = document.getElementById('hud-score');
  const hudTime = document.getElementById('hud-time');
  const hudCombo = document.getElementById('hud-combo');

  const startOverlay = document.getElementById('start-overlay');
  const gameoverOverlay = document.getElementById('gameover-overlay');
  const finalBlock = document.getElementById('final-block');
  const finalScoreEl = document.getElementById('final-score');
  const finalAccuracyEl = document.getElementById('final-accuracy');
  const finalComboEl = document.getElementById('final-combo');
  const finalHighscoreEl = document.getElementById('final-highscore');

  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const musicToggle = document.getElementById('music-toggle');

  /* ================= AUDIO ================= */
  const bgMusic = document.getElementById('bg-music');
  bgMusic.volume = 0.35;
  let musicEnabled = false;

  function fadeAudio(el, target, duration = 350){
    const start = el.volume;
    const t0 = performance.now();
    function step(now){
      const t = Math.min((now - t0) / duration, 1);
      el.volume = start + (target - start) * t;
      if(t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function playMusic(){
    if(!musicEnabled) return;
    bgMusic.currentTime = 0;
    bgMusic.volume = 0;
    bgMusic.play().catch(()=>{});
    fadeAudio(bgMusic, 0.35, 500);
  }
  function stopMusic(){
    fadeAudio(bgMusic, 0, 300);
    setTimeout(() => bgMusic.pause(), 320);
  }
  musicToggle.addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    musicToggle.textContent = musicEnabled ? '♪ ON' : '♪ OFF';
    musicToggle.classList.toggle('on', musicEnabled);
    if(musicEnabled && running) playMusic(); else stopMusic();
  });

  // tiny procedural gunshot / thud using WebAudio so the game has sound
  // even before a real music/sfx file is dropped in.
  let audioCtx = null;
  function ensureAudioCtx(){
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === 'suspended') audioCtx.resume();
  }
  function playShotSfx(){
    ensureAudioCtx();
    const noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate*0.08, audioCtx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i] = (Math.random()*2-1) * (1 - i/data.length);
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuf;
    const g = audioCtx.createGain();
    g.gain.value = 0.5;
    src.connect(g); g.connect(audioCtx.destination);
    src.start();
  }
  function playThudSfx(hit){
    ensureAudioCtx();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = hit ? 180 : 90;
    g.gain.value = 0.25;
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.18);
  }

  /* ================= CONFIG ================= */
  const ROUND_SECONDS = 60;
  const CLIP_SIZE = 6;
  const RELOAD_MS = 950;
  const FENCE_TOP = 400; // anything below this y is hidden behind the fence

  const LANE_X = [90, 265, 450, 635, 810];

  const ZOMBIE_TYPES = {
    shambler: { points: 10, riseMs: 550, holdMs: 950, sinkMs: 500, headR: 15, bodyW: 34, bodyH: 70, color:'#7a9b3a', headColor:'#8ea84a' },
    sprinter: { points: 20, riseMs: 260, holdMs: 480, sinkMs: 260, headR: 13, bodyW: 28, bodyH: 62, color:'#b0562e', headColor:'#c46a3d' },
    brute:    { points: 35, riseMs: 750, holdMs: 1200, sinkMs: 650, headR: 18, bodyW: 46, bodyH: 84, color:'#4f6b8a', headColor:'#5f7fa0', hp: 2 }
  };

  /* ================= STATE ================= */
  let running = false;
  let raf = null;
  let timeLeft = ROUND_SECONDS;
  let lastTick = 0;
  let ammo = CLIP_SIZE;
  let reloading = false;
  let score = 0;
  let shots = 0;
  let hits = 0;
  let combo = 0;
  let bestCombo = 0;
  let spawnCooldown = 900;
  let elapsedMs = 0;
  let particles = [];
  let mouseX = W/2, mouseY = H/2;

  // one slot state per lane; null = empty/available
  let lanes = LANE_X.map(() => null);

  function randType(){
    const r = Math.random();
    const progress = Math.min(elapsedMs / (ROUND_SECONDS*1000), 1);
    const bruteChance = 0.08 + progress*0.14;
    const sprinterChance = 0.22 + progress*0.18;
    if(r < bruteChance) return 'brute';
    if(r < bruteChance + sprinterChance) return 'sprinter';
    return 'shambler';
  }

  function trySpawn(){
    const freeLanes = lanes.map((l,i)=>l?null:i).filter(v=>v!==null);
    if(freeLanes.length === 0) return;
    const laneIdx = freeLanes[Math.floor(Math.random()*freeLanes.length)];
    const type = randType();
    const cfg = ZOMBIE_TYPES[type];
    lanes[laneIdx] = {
      type, x: LANE_X[laneIdx],
      state: 'rising', t: 0,
      hp: cfg.hp || 1,
      hitFlash: 0
    };
  }

  function updateHud(){
    hudScore.textContent = String(score).padStart(4,'0');
    hudTime.textContent = Math.max(0, Math.ceil(timeLeft));
    hudCombo.textContent = 'x' + comboMultiplier().toFixed(2);
  }

  function renderAmmo(){
    ammoSlotsEl.innerHTML = '';
    for(let i=0;i<CLIP_SIZE;i++){
      const pip = document.createElement('div');
      pip.className = 'ammo-pip' + (i < ammo ? '' : ' spent');
      ammoSlotsEl.appendChild(pip);
    }
  }

  function comboMultiplier(){
    return 1 + Math.min(combo, 8) * 0.15;
  }

  function spawnParticles(x,y,color,count){
    for(let i=0;i<count;i++){
      particles.push({
        x, y,
        vx:(Math.random()-0.5)*5,
        vy:(Math.random()-0.5)*5 - 1,
        life: 20 + Math.random()*14,
        color
      });
    }
  }

  function showHitMarker(x,y,text,good){
    hitMarkerEl.textContent = text;
    hitMarkerEl.style.left = x+'px';
    hitMarkerEl.style.top = y+'px';
    hitMarkerEl.style.color = good ? '#ffcf4d' : '#e6e6e6';
    hitMarkerEl.classList.remove('show');
    void hitMarkerEl.offsetWidth;
    hitMarkerEl.classList.add('show');
  }

  function fireFlash(){
    crosshairEl.classList.remove('fire');
    void crosshairEl.offsetWidth;
    crosshairEl.classList.add('fire');
  }

  function shake(){
    stage.style.transform = `translate(${(Math.random()-0.5)*4}px, ${(Math.random()-0.5)*4}px)`;
    setTimeout(()=> stage.style.transform = '', 70);
  }

  function zombieBox(z){
    const cfg = ZOMBIE_TYPES[z.type];
    // current visible y for the body center depends on state/progress
    let progress;
    if(z.state === 'rising') progress = z.t / cfg.riseMs;
    else if(z.state === 'hold') progress = 1;
    else if(z.state === 'sinking') progress = 1 - (z.t / cfg.sinkMs);
    else progress = 0;
    progress = Math.max(0, Math.min(1, progress));
    const hiddenY = FENCE_TOP + cfg.bodyH*0.6;
    const upY = FENCE_TOP - cfg.bodyH*0.62;
    const bodyCenterY = hiddenY + (upY - hiddenY) * progress;
    const headCenterY = bodyCenterY - cfg.bodyH/2 - cfg.headR*0.6;
    return { cfg, bodyCenterY, headCenterY, progress };
  }

  function hitTest(px, py){
    for(let i=0;i<lanes.length;i++){
      const z = lanes[i];
      if(!z || z.state === 'hidden') continue;
      const { cfg, bodyCenterY, headCenterY } = zombieBox(z);
      // head circle
      const dx = px - z.x, dy = py - headCenterY;
      if(Math.sqrt(dx*dx + dy*dy) <= cfg.headR + 2){
        return { laneIdx:i, z, cfg, headshot:true };
      }
      // body rect
      if(Math.abs(px - z.x) <= cfg.bodyW/2 && Math.abs(py - bodyCenterY) <= cfg.bodyH/2){
        return { laneIdx:i, z, cfg, headshot:false };
      }
    }
    return null;
  }

  function shoot(px, py){
    if(!running) return;
    if(reloading) return;
    if(ammo <= 0){
      playThudSfx(false);
      return;
    }
    ammo--; shots++;
    renderAmmo();
    fireFlash();
    shake();
    playShotSfx();

    const result = hitTest(px, py);
    if(result){
      const { laneIdx, z, cfg, headshot } = result;
      z.hp -= headshot ? 2 : 1; // headshots always drop even brutes
      if(z.hp <= 0){
        hits++;
        combo++;
        bestCombo = Math.max(bestCombo, combo);
        const base = cfg.points;
        const gained = Math.round(base * (headshot ? 2 : 1) * comboMultiplier());
        score += gained;
        spawnParticles(px, py, headshot ? '#ffcf4d' : cfg.color, headshot ? 22 : 14);
        showHitMarker(px, py, (headshot ? 'HEADSHOT +' : '+') + gained, true);
        playThudSfx(true);
        lanes[laneIdx] = null;
      } else {
        z.hitFlash = 8;
        spawnParticles(px, py, cfg.color, 6);
      }
    } else {
      combo = 0;
      showHitMarker(px, py, 'MISS', false);
    }
    updateHud();

    if(ammo === 0){
      startReload();
    }
  }

  function startReload(){
    if(reloading) return;
    reloading = true;
    reloadBar.classList.add('show');
    const t0 = performance.now();
    function step(now){
      const t = Math.min((now-t0)/RELOAD_MS, 1);
      reloadFill.style.width = (t*100)+'%';
      if(t < 1){
        requestAnimationFrame(step);
      } else {
        ammo = CLIP_SIZE;
        reloading = false;
        reloadBar.classList.remove('show');
        reloadFill.style.width = '0%';
        renderAmmo();
      }
    }
    requestAnimationFrame(step);
  }

  /* ================= DRAW ================= */
  function drawSky(){
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0, '#241a2e');
    grad.addColorStop(0.55, '#3a2438');
    grad.addColorStop(1, '#5c3d27');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);

    // distant bunting / string lights
    ctx.strokeStyle = 'rgba(255,207,77,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0,60);
    for(let x=0;x<=W;x+=90){
      ctx.quadraticCurveTo(x+45, 90, x+90, 60);
    }
    ctx.stroke();
  }

  function drawZombie(z){
    const cfg = ZOMBIE_TYPES[z.type];
    const { bodyCenterY, headCenterY } = zombieBox(z);
    const flash = z.hitFlash > 0;
    ctx.save();
    ctx.translate(z.x, 0);

    // body
    ctx.fillStyle = flash ? '#ffffff' : cfg.color;
    ctx.beginPath();
    ctx.roundRect(-cfg.bodyW/2, bodyCenterY - cfg.bodyH/2, cfg.bodyW, cfg.bodyH, 8);
    ctx.fill();

    // arms (simple raised stubs)
    ctx.fillRect(-cfg.bodyW/2 - 8, bodyCenterY - cfg.bodyH/2 + 6, 8, cfg.bodyH*0.4);
    ctx.fillRect(cfg.bodyW/2, bodyCenterY - cfg.bodyH/2 + 6, 8, cfg.bodyH*0.4);

    // head
    ctx.fillStyle = flash ? '#ffffff' : cfg.headColor;
    ctx.beginPath();
    ctx.arc(0, headCenterY, cfg.headR, 0, Math.PI*2);
    ctx.fill();

    // dead eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-cfg.headR*0.35, headCenterY-2, 2, 0, Math.PI*2);
    ctx.arc(cfg.headR*0.35, headCenterY-2, 2, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();

    if(z.hitFlash > 0) z.hitFlash--;
  }

  function drawFence(){
    const fenceH = H - FENCE_TOP + 12;
    const grad = ctx.createLinearGradient(0, FENCE_TOP-12, 0, H);
    grad.addColorStop(0, '#3a2818');
    grad.addColorStop(1, '#241610');
    ctx.fillStyle = grad;
    ctx.fillRect(0, FENCE_TOP-12, W, fenceH);

    // planks
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    for(let x=0; x<W; x+=44){
      ctx.beginPath();
      ctx.moveTo(x, FENCE_TOP-12);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    // top rail highlight
    ctx.fillStyle = '#6b4a2c';
    ctx.fillRect(0, FENCE_TOP-12, W, 8);
  }

  function drawParticles(){
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(p.life/30, 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x-2, p.y-2, 4, 4);
      ctx.globalAlpha = 1;
    });
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    drawSky();
    lanes.forEach(z => { if(z) drawZombie(z); });
    drawFence();
    drawParticles();
  }

  /* ================= UPDATE ================= */
  function update(dt){
    elapsedMs += dt;

    spawnCooldown -= dt;
    if(spawnCooldown <= 0){
      trySpawn();
      const progress = Math.min(elapsedMs/(ROUND_SECONDS*1000), 1);
      spawnCooldown = 700 - progress*350 + Math.random()*250;
    }

    lanes.forEach((z, i) => {
      if(!z) return;
      const cfg = ZOMBIE_TYPES[z.type];
      z.t += dt;
      if(z.state === 'rising' && z.t >= cfg.riseMs){ z.state='hold'; z.t = 0; }
      else if(z.state === 'hold' && z.t >= cfg.holdMs){ z.state='sinking'; z.t = 0; }
      else if(z.state === 'sinking' && z.t >= cfg.sinkMs){ lanes[i] = null; }
    });

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    particles = particles.filter(p => p.life > 0);
  }

  function loop(ts){
    if(!running) return;
    if(!lastTick) lastTick = ts;
    const dt = Math.min(ts - lastTick, 50);
    lastTick = ts;

    timeLeft -= dt/1000;
    if(timeLeft <= 0){
      timeLeft = 0;
      updateHud();
      endGame();
      return;
    }

    update(dt);
    draw();
    updateHud();
    raf = requestAnimationFrame(loop);
  }

  /* ================= LIFECYCLE ================= */
  function resetGame(){
    timeLeft = ROUND_SECONDS;
    ammo = CLIP_SIZE;
    reloading = false;
    score = 0; shots = 0; hits = 0; combo = 0; bestCombo = 0;
    elapsedMs = 0; spawnCooldown = 600;
    lanes = LANE_X.map(() => null);
    particles = [];
    lastTick = 0;
    reloadBar.classList.remove('show');
    reloadFill.style.width = '0%';
    renderAmmo();
    updateHud();
    draw();
  }

  function startGame(){
    resetGame();
    startOverlay.style.display = 'none';
    gameoverOverlay.style.display = 'none';
    running = true;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    playMusic();
  }

  function endGame(){
    running = false;
    cancelAnimationFrame(raf);
    stopMusic();

    const accuracy = shots > 0 ? Math.round((hits/shots)*100) : 0;
    const highKey = 'deadEyeAlleyHighScore';
    let high = 0;
    try{ high = parseInt(localStorage.getItem(highKey) || '0', 10); }catch(e){}
    if(score > high){
      high = score;
      try{ localStorage.setItem(highKey, String(high)); }catch(e){}
    }

    finalScoreEl.textContent = score;
    finalAccuracyEl.textContent = accuracy + '%';
    finalComboEl.textContent = 'x' + (1 + Math.min(bestCombo,8)*0.15).toFixed(2);
    finalHighscoreEl.textContent = high;

    finalBlock.classList.remove('show');
    gameoverOverlay.style.display = 'flex';
    setTimeout(()=> finalBlock.classList.add('show'), 200);

    try{
      window.parent.postMessage({ type:'GAME_OVER', game:'shooting-range', score, meta:{ accuracy, bestCombo } }, '*');
    }catch(e){}
  }

  startBtn.addEventListener('click', () => { ensureAudioCtx(); startGame(); });
  restartBtn.addEventListener('click', startGame);

  /* ================= INPUT ================= */
  function stageCoords(clientX, clientY){
    const rect = stage.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width * W;
    const y = (clientY - rect.top) / rect.height * H;
    return { x, y };
  }

  stage.addEventListener('mousemove', (e) => {
    const { x, y } = stageCoords(e.clientX, e.clientY);
    mouseX = x; mouseY = y;
    const rect = stage.getBoundingClientRect();
    crosshairEl.style.transform = `translate(${e.clientX - rect.left}px, ${e.clientY - rect.top}px)`;
  });

  stage.addEventListener('mousedown', (e) => {
    if(e.button !== 0) return;
    if(!running) return;
    const { x, y } = stageCoords(e.clientX, e.clientY);
    shoot(x, y);
  });

  window.addEventListener('keydown', (e) => {
    if(e.key === 'r' || e.key === 'R') startReload();
  });

  // touch support: tap to shoot at tap location
  stage.addEventListener('touchstart', (e) => {
    if(!running) return;
    const t = e.touches[0];
    const { x, y } = stageCoords(t.clientX, t.clientY);
    const rect = stage.getBoundingClientRect();
    crosshairEl.style.transform = `translate(${t.clientX - rect.left}px, ${t.clientY - rect.top}px)`;
    shoot(x, y);
    e.preventDefault();
  }, { passive:false });

  resetGame();
})();