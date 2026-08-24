(function(){
  /* ================= DOM REFS ================= */
  const titleScreen = document.getElementById('title-screen');
  const selectScreen = document.getElementById('select-screen');
  const fightScreen = document.getElementById('fight-screen');
  const toSelectBtn = document.getElementById('to-select-btn');
  const rosterEl = document.getElementById('roster');
  const pickedNameEl = document.getElementById('picked-name');
  const fightBtn = document.getElementById('fight-btn');

  const stage = document.getElementById('stage');
  const canvas = document.getElementById('arena-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const floatingLayer = document.getElementById('floating-layer');

  const hudP1Name = document.getElementById('p1-name');
  const hudP2Name = document.getElementById('p2-name');
  const p1HpFill = document.getElementById('p1-hp-fill');
  const p2HpFill = document.getElementById('p2-hp-fill');
  const p1StamFill = document.getElementById('p1-stam-fill');
  const p2StamFill = document.getElementById('p2-stam-fill');
  const p1Pips = document.getElementById('p1-pips');
  const p2Pips = document.getElementById('p2-pips');
  const roundTimerEl = document.getElementById('round-timer');
  const roundNumEl = document.getElementById('round-num');

  const roundBanner = document.getElementById('round-banner');
  const roundBannerText = document.getElementById('round-banner-text');
  const matchOverlay = document.getElementById('match-overlay');
  const matchTitle = document.getElementById('match-title');
  const matchSub = document.getElementById('match-sub');
  const rematchBtn = document.getElementById('rematch-btn');
  const changeFighterBtn = document.getElementById('change-fighter-btn');

  const GROUND_Y = 380;
  const ARENA_MIN_X = 60;
  const ARENA_MAX_X = W - 60;
  const MIN_SEPARATION = 46;
  const PARRY_WINDOW_MS = 220;
  const PARRY_PUNISH_STUN = 550;
  const ROUND_SECONDS = 60;
  const ROUNDS_TO_WIN = 2;

  /* ================= CHARACTER DATA ================= */

  /* ---- pixel-art avatar portraits ----
     Each grid is the LEFT half of a face/bust (mirrored at render time to
     make a symmetric 12-wide sprite), 14 rows top-to-bottom.
     Legend: . transparent | O outline/shadow | M main tone | L highlight
             P pale/void patch (skin, hollow face) | E glowing eye/rune */
  const PIXEL_GRIDS = {
    knight: [
      '....OM',
      '...OML',
      '..OMML',
      '.OMMML',
      '.OMMML',
      '.OMMML',
      '.OMMEL',
      '.OMMEL',
      '..OMML',
      '...OML',
      '...OML',
      'OMMMML',
      'OMMMML',
      'OMMMMO'
    ],
    wraith: [
      '.....M',
      '....OM',
      '...OML',
      '..OMML',
      '.OMMML',
      '.OMMML',
      '.OPPPL',
      '.OPEPL',
      '.OPPPL',
      '..OPPL',
      '...OPL',
      '....OM',
      '..OMML',
      '.OMMML'
    ],
    sorceress: [
      '.....O',
      '.....M',
      '....OM',
      '....ML',
      '...OML',
      'OMMMML',
      '..OPPL',
      '..OPEL',
      '..OPPL',
      '...OPL',
      '....OM',
      '.OMMML',
      'OMMMML',
      'OMMMMO'
    ],
    golem: [
      'O.MMM.',
      'OMMMMO',
      'OMMMML',
      'OMMOML',
      'OMEOML',
      'OMMOML',
      'OMOMML',
      'OMMMML',
      'OMMOML',
      'OMMMML',
      '.OMMML',
      'OMMMML',
      'OMMMML',
      'OMMMMO'
    ]
  };
  const EYE_GLOW = { knight:'#fff2c2', wraith:'#a8f2ff', sorceress:'#d4ff9a', golem:'#ff9166' };

  function lighten(hex, amt){
    hex = hex.replace('#','');
    const r = parseInt(hex.substring(0,2),16), g = parseInt(hex.substring(2,4),16), b = parseInt(hex.substring(4,6),16);
    const mix = v => Math.round(v + (255-v)*amt);
    return '#' + [mix(r),mix(g),mix(b)].map(v => v.toString(16).padStart(2,'0')).join('');
  }

  // Builds a small pixel-grid "portrait" for a fighter — chunky, crisp-edged
  // squares (genuinely pixelated) but shaded with outline/mid/highlight/glow
  // tones so it reads as a real face/bust rather than a flat icon.
  function buildAvatarSVG(id){
    const cfg = CHARACTERS[id];
    const grid = PIXEL_GRIDS[id];
    const palette = {
      O: cfg.dark,
      M: cfg.color,
      L: lighten(cfg.color, 0.45),
      P: lighten(cfg.color, 0.74),
      E: EYE_GLOW[id]
    };
    const rows = grid.length;
    const cols = grid[0].length * 2;
    let rects = '';
    grid.forEach((leftRow, r) => {
      const fullRow = leftRow + leftRow.split('').reverse().join('');
      for(let c=0;c<fullRow.length;c++){
        const ch = fullRow[c];
        if(ch === '.') continue;
        rects += `<rect x="${c}" y="${r}" width="1" height="1" fill="${palette[ch]}"/>`;
      }
    });
    return `<svg class="pixel-avatar" viewBox="0 0 ${cols} ${rows}" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet">${rects}</svg>`;
  }

  const CHARACTERS = {
    knight: {
      id:'knight', name:'Sir Vhalos', title:'Ashen knight — heavy', flavor:'A hollowed vow-keeper in siege plate. Slow, punishing, nearly unbreakable at range.',
      color:'#c9a227', dark:'#7a611a', maxHp:130, maxStamina:115, moveSpeed:2.0, jumpVel:-9.2,
      bodyW:40, bodyH:78, headR:13,
      light:{dmg:7, startup:130, active:90, recovery:190, staminaCost:6, range:70},
      heavy:{dmg:20, startup:330, active:110, recovery:430, staminaCost:18, range:78, knockback:24},
      special:{dmg:17, cooldown:5200, staminaCost:24, projectileSpeed:6.2, range:9999, name:'Judgment Beam'},
      blockReduction:0.85, blockDrainPerSec:22, regenPerSec:16,
      aiPreferredRange:64, aiAggression:0.5, powerStat:88, speedStat:32
    },
    wraith: {
      id:'wraith', name:'Isse, the Unburied', title:'Wraith duelist — fast', flavor:'Twin curved blades, no shield, no patience. Wins the exchange or loses everything.',
      color:'#5b7d8c', dark:'#3c5661', maxHp:92, maxStamina:135, moveSpeed:3.3, jumpVel:-10.2,
      bodyW:30, bodyH:66, headR:11,
      light:{dmg:5, startup:80, active:70, recovery:110, staminaCost:4, range:62},
      heavy:{dmg:15, startup:220, active:90, recovery:300, staminaCost:14, range:66, knockback:20},
      special:{dmg:13, cooldown:3600, staminaCost:20, projectileSpeed:8.5, range:9999, name:'Ash Sickle'},
      blockReduction:0.75, blockDrainPerSec:26, regenPerSec:20,
      aiPreferredRange:56, aiAggression:0.75, powerStat:45, speedStat:92
    },
    sorceress: {
      id:'sorceress', name:'Maro Vess', title:'Rot sorceress — ranged', flavor:'Keeps her distance and lets decay do the work. Frail up close, brutal from afar.',
      color:'#4a6b4f', dark:'#2f4632', maxHp:85, maxStamina:100, moveSpeed:2.3, jumpVel:-9.0,
      bodyW:30, bodyH:70, headR:12,
      light:{dmg:5, startup:150, active:90, recovery:200, staminaCost:6, range:58},
      heavy:{dmg:14, startup:300, active:100, recovery:380, staminaCost:16, range:62, knockback:18},
      special:{dmg:20, cooldown:3200, staminaCost:22, projectileSpeed:5.6, range:9999, name:'Rot Bolt'},
      blockReduction:0.7, blockDrainPerSec:24, regenPerSec:18,
      aiPreferredRange:260, aiAggression:0.35, powerStat:70, speedStat:55
    },
    golem: {
      id:'golem', name:'Bhorg, Chain-bound', title:'Golem bearer — bruiser', flavor:'Drags a broken effigy on a chain. Every hit lands like a collapsing wall.',
      color:'#8a2418', dark:'#5c1810', maxHp:155, maxStamina:140, moveSpeed:1.5, jumpVel:-8.4,
      bodyW:48, bodyH:84, headR:14,
      light:{dmg:9, startup:170, active:100, recovery:230, staminaCost:8, range:76},
      heavy:{dmg:27, startup:400, active:120, recovery:520, staminaCost:22, range:86, knockback:32},
      special:{dmg:19, cooldown:6000, staminaCost:26, projectileSpeed:5.0, range:9999, name:'Chain Sweep'},
      blockReduction:0.88, blockDrainPerSec:18, regenPerSec:14,
      aiPreferredRange:70, aiAggression:0.45, powerStat:96, speedStat:18
    }
  };
  const CHAR_ORDER = ['knight','wraith','sorceress','golem'];

  /* ================= AUDIO (procedural) ================= */
  let audioCtx = null;
  function ensureAudioCtx(){
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === 'suspended') audioCtx.resume();
  }
  function playClang(strength){
    ensureAudioCtx();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 220 + strength*80;
    g.gain.value = 0.22;
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.22);
  }
  function playWhoosh(){
    ensureAudioCtx();
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate*0.12, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i] = (Math.random()*2-1)*(1-i/data.length)*0.6;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const g = audioCtx.createGain();
    g.gain.value = 0.35;
    src.connect(g); g.connect(audioCtx.destination);
    src.start();
  }
  function playParryChime(){
    ensureAudioCtx();
    [660,880].forEach((f,i)=>{
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type='sine'; osc.frequency.value=f;
      g.gain.value=0.18;
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.3);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + i*0.04); osc.stop(audioCtx.currentTime+0.3);
    });
  }

  /* ================= CHARACTER SELECT ================= */
  let chosenId = null;

  CHAR_ORDER.forEach(id => {
    const cfg = CHARACTERS[id];
    const card = document.createElement('div');
    card.className = 'fighter-card ' + id;
    card.innerHTML = `
      <div class="sigil">${buildAvatarSVG(id)}</div>
      <p class="cname">${cfg.name}</p>
      <p class="cclass">${cfg.title}</p>
      <p class="cflavor">${cfg.flavor}</p>
      <div class="stat-label"><span>Power</span></div>
      <div class="stat-bar-mini"><div class="f" style="width:${cfg.powerStat}%"></div></div>
      <div class="stat-label"><span>Speed</span></div>
      <div class="stat-bar-mini"><div class="f" style="width:${cfg.speedStat}%"></div></div>
    `;
    card.addEventListener('click', () => {
      chosenId = id;
      [...rosterEl.children].forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      pickedNameEl.textContent = cfg.name;
      fightBtn.disabled = false;
    });
    rosterEl.appendChild(card);
  });

  toSelectBtn.addEventListener('click', () => {
    titleScreen.style.display = 'none';
    selectScreen.style.display = 'flex';
  });

  fightBtn.addEventListener('click', () => {
    ensureAudioCtx();
    const opponents = CHAR_ORDER.filter(id => id !== chosenId);
    const cpuId = opponents[Math.floor(Math.random()*opponents.length)];
    selectScreen.style.display = 'none';
    fightScreen.style.display = 'flex';
    beginMatch(chosenId, cpuId);
  });

  rematchBtn.addEventListener('click', () => {
    matchOverlay.style.display = 'none';
    beginMatch(match.p1.cfg.id, match.p2.cfg.id);
  });
  changeFighterBtn.addEventListener('click', () => {
    matchOverlay.style.display = 'none';
    fightScreen.style.display = 'none';
    selectScreen.style.display = 'flex';
    running = false;
    cancelAnimationFrame(raf);
  });

  /* ================= FIGHTER FACTORY ================= */
  function makeFighter(charId, x, facing, isCPU){
    const cfg = CHARACTERS[charId];
    return {
      cfg, isCPU,
      x, y: GROUND_Y, vy: 0, onGround: true,
      facing,
      hp: cfg.maxHp, stamina: cfg.maxStamina,
      state: 'idle', attackPhase: null, stateTimer: 0,
      comboCount: 0, comboTimer: 0,
      hitRegistered: false,
      blockStartedAt: 0,
      specialCooldown: 0,
      hitFlash: 0,
      queuedLight: false,
      roundsWon: 0,
      // input intent (shared shape for player + AI)
      input: { moveDir:0, jump:false, light:false, heavy:false, special:false, block:false }
    };
  }

  /* ================= MATCH STATE ================= */
  let match = null;
  let running = false;
  let raf = null;
  let lastTs = 0;
  let projectiles = [];
  let particles = [];
  let screenShake = 0;
  let aiDecisionTimer = 0;
  let roundOver = false;
  let matchOver = false;

  function beginMatch(p1Id, p2Id){
    match = {
      p1: makeFighter(p1Id, 260, 1, false),
      p2: makeFighter(p2Id, W-260, -1, true)
    };
    match.p1.roundsWon = 0; match.p2.roundsWon = 0;
    hudP1Name.textContent = match.p1.cfg.name;
    hudP2Name.textContent = match.p2.cfg.name;
    renderPips();
    startRound(1);
  }

  function resetFighterForRound(f, x, facing){
    f.x = x; f.y = GROUND_Y; f.vy = 0; f.onGround = true;
    f.facing = facing;
    f.hp = f.cfg.maxHp; f.stamina = f.cfg.maxStamina;
    f.state = 'idle'; f.attackPhase = null; f.stateTimer = 0;
    f.comboCount = 0; f.comboTimer = 0; f.hitRegistered = false;
    f.blockStartedAt = 0; f.specialCooldown = 0; f.hitFlash = 0;
    f.input = { moveDir:0, jump:false, light:false, heavy:false, special:false, block:false };
  }

  let currentRound = 1;
  let roundTimeLeft = ROUND_SECONDS;

  function startRound(n){
    currentRound = n;
    roundTimeLeft = ROUND_SECONDS;
    roundOver = false;
    matchOver = false;
    projectiles = []; particles = []; screenShake = 0;
    resetFighterForRound(match.p1, 260, 1);
    resetFighterForRound(match.p2, W-260, -1);
    roundNumEl.textContent = n;
    updateHudBars();
    showRoundBanner('ROUND ' + n);
    running = false;
    setTimeout(() => {
      running = true;
      lastTs = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    }, 1300);
  }

  function showRoundBanner(text){
    roundBannerText.textContent = text;
    roundBanner.style.display = 'flex';
    setTimeout(() => roundBanner.style.display = 'none', 1350);
  }

  function renderPips(){
    p1Pips.innerHTML = ''; p2Pips.innerHTML = '';
    for(let i=0;i<ROUNDS_TO_WIN;i++){
      const s1 = document.createElement('span'); if(i < match.p1.roundsWon) s1.classList.add('won'); p1Pips.appendChild(s1);
      const s2 = document.createElement('span'); if(i < match.p2.roundsWon) s2.classList.add('won'); p2Pips.appendChild(s2);
    }
  }

  /* ================= INPUT (PLAYER) ================= */
  const keys = {};
  const trackedKeys = ['a','d','w','j','k','l',' '];
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if(trackedKeys.includes(k)) e.preventDefault();
    keys[k] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  function readPlayerInput(f){
    f.input.moveDir = (keys['d']?1:0) - (keys['a']?1:0);
    f.input.jump = !!keys['w'];
    f.input.light = !!keys['j'];
    f.input.heavy = !!keys['k'];
    f.input.special = !!keys['l'];
    f.input.block = !!keys[' '];
  }

  /* ================= AI ================= */
  function decideAI(ai, opp, dt){
    aiDecisionTimer -= dt;
    const dist = Math.abs(ai.x - opp.x);
    const cfg = ai.cfg;

    // reactive block/parry chance if opponent is mid-attack and close enough
    const oppAttacking = (opp.state==='light'||opp.state==='heavy') && opp.attackPhase!=='recovery';
    if(oppAttacking && dist < cfg.light.range + 30 && ai.state!=='hitstun' && ai.state!=='guardBreak'){
      const reactChance = 0.5;
      if(Math.random() < reactChance*dt/16){
        ai.input.block = true;
      }
    }

    if(aiDecisionTimer > 0) return;
    aiDecisionTimer = 160 + Math.random()*140;

    ai.input.block = false;
    ai.input.light = false;
    ai.input.heavy = false;
    ai.input.special = false;
    ai.input.moveDir = 0;
    ai.input.jump = false;

    if(ai.state !== 'idle' && ai.state !== 'walk' && ai.state !== 'block') return;

    const preferred = cfg.aiPreferredRange;
    const lowHp = ai.hp < cfg.maxHp*0.3;
    const lowStam = ai.stamina < cfg.maxStamina*0.25;

    if(dist > preferred + 40){
      // too far: approach, or special if off cooldown and roughly in line
      if(ai.specialCooldown <= 0 && Math.random() < 0.4 + cfg.aiAggression*0.2){
        ai.input.special = true;
      } else {
        ai.input.moveDir = ai.x < opp.x ? 1 : -1;
      }
    } else if(dist < preferred - 30 && preferred > 120){
      // ranged char wants distance back
      ai.input.moveDir = ai.x < opp.x ? -1 : 1;
    } else {
      // in preferred band
      if(lowHp && !lowStam && Math.random() < 0.5){
        ai.input.block = true;
      } else if(lowStam){
        ai.input.moveDir = ai.x < opp.x ? -1 : 1;
      } else {
        const roll = Math.random();
        if(roll < cfg.aiAggression*0.5){
          ai.input.light = true;
        } else if(roll < cfg.aiAggression*0.7){
          ai.input.heavy = true;
        } else if(roll < cfg.aiAggression*0.85 && ai.specialCooldown<=0){
          ai.input.special = true;
        } else if(roll < 0.93){
          ai.input.moveDir = ai.x < opp.x ? 1 : -1;
        } else {
          ai.input.moveDir = ai.x < opp.x ? -1 : 1;
        }
      }
    }
  }

  /* ================= COMBAT HELPERS ================= */
  function spawnFloater(x, y, text, cls){
    const el = document.createElement('div');
    el.className = 'floater ' + (cls||'');
    el.textContent = text;
    el.style.left = (x/W*100)+'%';
    el.style.top = (y/H*100)+'%';
    floatingLayer.appendChild(el);
    setTimeout(()=> el.remove(), 850);
  }

  function spawnParticles(x,y,color,count){
    for(let i=0;i<count;i++){
      particles.push({
        x,y,
        vx:(Math.random()-0.5)*5, vy:(Math.random()-0.5)*5-1,
        life: 20+Math.random()*14, color
      });
    }
  }

  function screenPos(worldX, worldY){ return { x: worldX, y: worldY }; }

  function applyHit(attacker, defender, dmg, opts){
    opts = opts || {};
    const now = performance.now();
    const isParryable = true;

    if(defender.state === 'block'){
      const blockedFor = now - defender.blockStartedAt;
      if(blockedFor <= PARRY_WINDOW_MS && defender.stamina > 0){
        // PARRY
        attacker.state = 'hitstun';
        attacker.stateTimer = PARRY_PUNISH_STUN;
        attacker.hitFlash = 10;
        spawnFloater(defender.x, defender.y-100, 'PARRY!', 'parry');
        playParryChime();
        spawnParticles(defender.x + defender.facing*30, defender.y-60, '#bfe3ee', 16);
        return;
      }
      // normal block
      const reduced = Math.round(dmg * (1-defender.cfg.blockReduction));
      defender.hp -= reduced;
      defender.stamina -= dmg*0.6;
      defender.x += attacker.facing * 6;
      spawnFloater(defender.x, defender.y-90, reduced>0?('-'+reduced):'BLOCKED', 'dmg');
      playClang(0.5);
      spawnParticles(defender.x + defender.facing*26, defender.y-60, '#8a8578', 8);
      if(defender.stamina <= 0){
        defender.stamina = 0;
        defender.state = 'guardBreak';
        defender.stateTimer = 900;
        spawnFloater(defender.x, defender.y-110, 'GUARD BREAK', 'guardbreak');
      }
      updateHudBars();
      return;
    }

    // unblocked hit
    let finalDmg = dmg;
    if(opts.combo && attacker.comboCount > 0){
      finalDmg = Math.round(dmg * (1 + Math.min(attacker.comboCount,3)*0.12));
    }
    defender.hp = Math.max(0, defender.hp - finalDmg);
    defender.hitFlash = 10;
    defender.state = 'hitstun';
    defender.stateTimer = opts.heavy ? 380 : 220;
    const kb = opts.knockback || 14;
    defender.x += attacker.facing * kb;
    defender.x = Math.max(ARENA_MIN_X, Math.min(ARENA_MAX_X, defender.x));
    spawnFloater(defender.x, defender.y-90, '-'+finalDmg, 'dmg');
    if(attacker.comboCount >= 2){
      spawnFloater(defender.x, defender.y-120, (attacker.comboCount+1)+' HITS', 'combo');
    }
    playClang(1);
    screenShake = Math.min(screenShake+6, 14);
    spawnParticles(defender.x, defender.y-50, defender.cfg.color, opts.heavy?22:12);

    if(defender.hp <= 0){
      defender.state = 'ko';
      defender.stateTimer = 99999;
      endRound(attacker);
    }
  }

  /* ================= FIGHTER UPDATE ================= */
  function updateFighter(f, opp, dt){
    // timers
    if(f.specialCooldown > 0) f.specialCooldown -= dt;
    if(f.comboTimer > 0){ f.comboTimer -= dt; if(f.comboTimer<=0) f.comboCount = 0; }
    if(f.hitFlash > 0) f.hitFlash--;

    // facing (auto, unless mid-attack)
    if(f.state==='idle' || f.state==='walk' || f.state==='block'){
      f.facing = opp.x > f.x ? 1 : -1;
    }

    // gravity / jump
    if(!f.onGround){
      f.vy += 0.55;
      f.y += f.vy;
      if(f.y >= GROUND_Y){ f.y = GROUND_Y; f.vy = 0; f.onGround = true; }
    }

    switch(f.state){
      case 'idle':
      case 'walk': {
        f.state = 'idle';
        if(f.input.moveDir !== 0){
          const dir = f.input.moveDir;
          let nx = f.x + dir*f.cfg.moveSpeed*(dt/16.6);
          nx = Math.max(ARENA_MIN_X, Math.min(ARENA_MAX_X, nx));
          const dist = Math.abs(nx - opp.x);
          if(dist >= MIN_SEPARATION) f.x = nx;
          f.state = 'walk';
        }
        if(f.input.jump && f.onGround){
          f.vy = f.cfg.jumpVel;
          f.onGround = false;
        }
        if(f.input.block){
          f.state = 'block';
          f.blockStartedAt = performance.now();
        } else if(f.input.light && f.stamina >= f.cfg.light.staminaCost){
          f.stamina -= f.cfg.light.staminaCost;
          f.state = 'light'; f.attackPhase = 'startup'; f.stateTimer = f.cfg.light.startup; f.hitRegistered = false;
        } else if(f.input.heavy && f.stamina >= f.cfg.heavy.staminaCost){
          f.stamina -= f.cfg.heavy.staminaCost;
          f.state = 'heavy'; f.attackPhase = 'startup'; f.stateTimer = f.cfg.heavy.startup; f.hitRegistered = false;
        } else if(f.input.special && f.specialCooldown <= 0 && f.stamina >= f.cfg.special.staminaCost){
          f.stamina -= f.cfg.special.staminaCost;
          f.specialCooldown = f.cfg.special.cooldown;
          f.state = 'special'; f.attackPhase = 'startup'; f.stateTimer = f.cfg.special.startup || 220; f.hitRegistered = false;
        }
        if(f.stamina < f.cfg.maxStamina) f.stamina = Math.min(f.cfg.maxStamina, f.stamina + f.cfg.regenPerSec*(dt/1000));
        break;
      }

      case 'block': {
        if(!f.input.block){
          f.state = 'idle';
          break;
        }
        f.stamina -= f.cfg.blockDrainPerSec*(dt/1000)*0.4;
        if(f.stamina <= 0){
          f.stamina = 0;
          f.state = 'guardBreak';
          f.stateTimer = 900;
        }
        break;
      }

      case 'light':
      case 'heavy': {
        const cfg = f.state === 'light' ? f.cfg.light : f.cfg.heavy;
        f.stateTimer -= dt;
        if(f.attackPhase === 'startup' && f.stateTimer <= 0){
          f.attackPhase = 'active'; f.stateTimer = cfg.active;
          playWhoosh();
        } else if(f.attackPhase === 'active'){
          if(!f.hitRegistered){
            const dist = Math.abs(f.x - opp.x);
            if(dist <= cfg.range && opp.onGround){
              f.hitRegistered = true;
              applyHit(f, opp, cfg.dmg, { combo: f.state==='light', heavy: f.state==='heavy', knockback: cfg.knockback||14 });
              if(f.state==='light'){ f.comboCount++; f.comboTimer = 700; }
              else { f.comboCount = 0; }
            }
          }
          if(f.stateTimer <= 0){ f.attackPhase = 'recovery'; f.stateTimer = cfg.recovery; }
        } else if(f.attackPhase === 'recovery'){
          if(f.stateTimer <= 0){
            f.state = 'idle'; f.attackPhase = null;
          }
        }
        break;
      }

      case 'special': {
        f.stateTimer -= dt;
        if(f.attackPhase === 'startup' && f.stateTimer <= 0){
          f.attackPhase = 'active'; f.stateTimer = 60;
          projectiles.push({
            x: f.x + f.facing*40, y: f.y - f.cfg.bodyH*0.55,
            vx: f.facing*f.cfg.special.projectileSpeed, dmg: f.cfg.special.dmg,
            owner: f, color: f.cfg.color, r: 9
          });
        } else if(f.attackPhase === 'active' && f.stateTimer <= 0){
          f.attackPhase = 'recovery'; f.stateTimer = 260;
        } else if(f.attackPhase === 'recovery' && f.stateTimer <= 0){
          f.state = 'idle'; f.attackPhase = null;
        }
        break;
      }

      case 'hitstun':
      case 'guardBreak': {
        f.stateTimer -= dt;
        if(f.stateTimer <= 0){ f.state = 'idle'; }
        break;
      }

      case 'ko': break;
    }
  }

  function updateProjectiles(dt){
    for(let i=projectiles.length-1;i>=0;i--){
      const p = projectiles[i];
      p.x += p.vx*(dt/16.6);
      const target = p.owner === match.p1 ? match.p2 : match.p1;
      const dist = Math.abs(p.x - target.x);
      if(target.state !== 'ko' && dist < 26){
        applyHit(p.owner, target, p.dmg, { knockback: 20 });
        projectiles.splice(i,1);
        continue;
      }
      if(p.x < -20 || p.x > W+20) projectiles.splice(i,1);
    }
  }

  /* ================= ROUND / MATCH FLOW ================= */
  function endRound(winner){
    if(roundOver) return;
    roundOver = true;
    running = false;
    winner.roundsWon++;
    renderPips();
    setTimeout(() => {
      if(winner.roundsWon >= ROUNDS_TO_WIN){
        endMatch(winner);
      } else {
        startRound(currentRound+1);
      }
    }, 1400);
  }

  function endMatch(winner){
    matchOver = true;
    const isPlayer = winner === match.p1;
    matchTitle.textContent = isPlayer ? 'VICTORY' : 'DEFEAT';
    matchSub.textContent = isPlayer
      ? winner.cfg.name + ' stands over the ashes.'
      : winner.cfg.name + ' leaves you among the ashes.';
    matchOverlay.style.display = 'flex';
  }

  /* ================= RENDER ================= */
  function drawBackground(){
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0, '#150f1a');
    grad.addColorStop(0.6, '#1c1512');
    grad.addColorStop(1, '#0d0b0a');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);

    // distant castle silhouette
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y-20);
    for(let x=0;x<=W;x+=80){
      const towerH = 40 + (Math.sin(x*0.02)+1)*30;
      ctx.lineTo(x, GROUND_Y-20-towerH*0.4);
      ctx.lineTo(x+40, GROUND_Y-20-towerH);
    }
    ctx.lineTo(W, GROUND_Y-20);
    ctx.closePath();
    ctx.fill();

    // moon
    ctx.fillStyle = 'rgba(216,210,196,0.15)';
    ctx.beginPath(); ctx.arc(W-110, 70, 34, 0, Math.PI*2); ctx.fill();

    // ground
    const gGrad = ctx.createLinearGradient(0,GROUND_Y,0,H);
    gGrad.addColorStop(0,'#2a1f18'); gGrad.addColorStop(1,'#100b08');
    ctx.fillStyle = gGrad;
    ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    ctx.strokeStyle = 'rgba(201,162,39,0.15)';
    ctx.beginPath(); ctx.moveTo(0,GROUND_Y); ctx.lineTo(W,GROUND_Y); ctx.stroke();
  }

  // Draws the same pixel-grid portrait used on the character-select screen,
  // centered at (cx,cy), scaled to sizePx wide. Reused as the in-fight head
  // so each fighter's sprite matches their roster avatar.
  function drawPixelHead(cx, cy, sizePx, id, flash){
    const grid = PIXEL_GRIDS[id];
    const cfgLocal = CHARACTERS[id];
    const rows = grid.length, cols = grid[0].length*2;
    const cell = sizePx/cols;
    const totalH = cell*rows;
    const startX = cx - sizePx/2;
    const startY = cy - totalH/2;
    const palette = {
      O: cfgLocal.dark,
      M: cfgLocal.color,
      L: lighten(cfgLocal.color, 0.45),
      P: lighten(cfgLocal.color, 0.74),
      E: EYE_GLOW[id]
    };
    grid.forEach((leftRow, r) => {
      const fullRow = leftRow + leftRow.split('').reverse().join('');
      for(let c=0;c<fullRow.length;c++){
        const ch = fullRow[c];
        if(ch === '.') continue;
        ctx.fillStyle = flash ? '#ffffff' : palette[ch];
        ctx.fillRect(Math.round(startX + c*cell), Math.round(startY + r*cell), Math.ceil(cell)+1, Math.ceil(cell)+1);
      }
    });
  }

  function drawFighter(f){
    const cfg = f.cfg;
    const id = cfg.id;
    ctx.save();
    ctx.translate(f.x, f.y);
    const flash = f.hitFlash > 0;
    const bodyColor = flash ? '#ffffff' : cfg.color;
    const darkColor = flash ? '#ffffff' : cfg.dark;
    const lightColor = flash ? '#ffffff' : lighten(cfg.color, 0.4);
    const punit = Math.max(3, Math.round(cfg.bodyW/9)); // pixel-block scale — bigger fighters get chunkier blocks

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 6, cfg.bodyW*0.6, 8, 0, 0, Math.PI*2);
    ctx.fill();

    const bob = (f.state==='idle') ? Math.sin(performance.now()/260)*2 : 0;
    const lean = (f.state==='walk') ? f.facing*4 : 0;
    const bodyTop = -cfg.bodyH - (GROUND_Y - f.y);

    ctx.save();
    ctx.translate(Math.round(lean), Math.round(bob));

    // legs — blocky rectangles with a dark pixel-outline
    const legW = punit*2, legH = cfg.bodyH*0.42;
    const legY = Math.round(bodyTop + cfg.bodyH*0.55);
    [-1,1].forEach(side => {
      const lx = Math.round(side*cfg.bodyW*0.22 - legW/2);
      ctx.fillStyle = darkColor;
      ctx.fillRect(lx-2, legY-2, legW+4, legH+4);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(lx, legY, legW, legH);
    });

    // torso — blocky outline + fill + a lighter center pixel-stripe for depth
    const tW = cfg.bodyW, tH = cfg.bodyH*0.62;
    const tX = Math.round(-tW/2), tY = Math.round(bodyTop);
    ctx.fillStyle = darkColor;
    ctx.fillRect(tX-2, tY-2, tW+4, tH+4);
    ctx.fillStyle = bodyColor;
    ctx.fillRect(tX, tY, tW, tH);
    ctx.fillStyle = lightColor;
    ctx.fillRect(Math.round(-punit*0.6), tY, Math.round(punit*1.2), tH);

    // arm / weapon swing — dark outline stroke behind a main-color stroke
    let armSwing = 0.2;
    if((f.state==='light'||f.state==='heavy') && f.attackPhase==='active') armSwing = 1.1;
    else if((f.state==='light'||f.state==='heavy') && f.attackPhase==='startup') armSwing = -0.5;
    const armOriginX = f.facing*cfg.bodyW*0.4, armOriginY = bodyTop+cfg.bodyH*0.2;
    const armEndX = f.facing*(cfg.bodyW*0.4 + Math.cos(armSwing)*cfg.bodyW*1.1);
    const armEndY = armOriginY + Math.sin(armSwing)*18;
    ctx.lineCap = 'square';
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = punit*1.7;
    ctx.beginPath(); ctx.moveTo(armOriginX, armOriginY); ctx.lineTo(armEndX, armEndY); ctx.stroke();
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = punit*1.1;
    ctx.beginPath(); ctx.moveTo(armOriginX, armOriginY); ctx.lineTo(armEndX, armEndY); ctx.stroke();

    // weapon slash arc during active frame
    if((f.state==='light'||f.state==='heavy') && f.attackPhase==='active'){
      const range = f.state==='light' ? cfg.light.range : cfg.heavy.range;
      ctx.strokeStyle = 'rgba(216,210,196,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.facing*cfg.bodyW*0.4, bodyTop+cfg.bodyH*0.2, range*0.7, -0.6, 0.9);
      ctx.stroke();
    }

    // head — the same pixel-art portrait used on the select screen
    drawPixelHead(0, bodyTop - cfg.headR*0.6, cfg.headR*2.6, id, flash);

    // block stance indicator
    if(f.state==='block'){
      ctx.fillStyle = 'rgba(216,210,196,0.25)';
      ctx.fillRect(Math.round(f.facing*cfg.bodyW*0.35 - 7), Math.round(bodyTop), 14, Math.round(cfg.bodyH*0.6));
    }
    if(f.state==='guardBreak'){
      ctx.fillStyle = 'rgba(193,64,44,0.5)';
      ctx.beginPath();
      ctx.arc(0, bodyTop-cfg.headR, cfg.headR*1.6, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }

  function drawProjectiles(){
    projectiles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, GROUND_Y - 46);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0,0,p.r,0,Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  function drawParticles(){
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(p.life/30,0);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x-2, p.y-2, 4, 4);
      ctx.globalAlpha = 1;
    });
  }

  function draw(){
    ctx.save();
    if(screenShake > 0){
      ctx.translate((Math.random()-0.5)*screenShake, (Math.random()-0.5)*screenShake);
      screenShake *= 0.85;
      if(screenShake < 0.3) screenShake = 0;
    }
    drawBackground();
    const order = match.p1.x < match.p2.x ? [match.p1, match.p2] : [match.p2, match.p1];
    order.forEach(drawFighter);
    drawProjectiles();
    drawParticles();
    ctx.restore();
  }

  /* ================= HUD ================= */
  function updateHudBars(){
    const p1 = match.p1, p2 = match.p2;
    p1HpFill.style.width = Math.max(0,(p1.hp/p1.cfg.maxHp*100))+'%';
    p2HpFill.style.width = Math.max(0,(p2.hp/p2.cfg.maxHp*100))+'%';
    p1StamFill.style.width = Math.max(0,(p1.stamina/p1.cfg.maxStamina*100))+'%';
    p2StamFill.style.width = Math.max(0,(p2.stamina/p2.cfg.maxStamina*100))+'%';
  }

  /* ================= MAIN LOOP ================= */
  function update(dt){
    readPlayerInput(match.p1);
    decideAI(match.p2, match.p1, dt);

    updateFighter(match.p1, match.p2, dt);
    updateFighter(match.p2, match.p1, dt);
    updateProjectiles(dt);

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    particles = particles.filter(p => p.life > 0);

    updateHudBars();

    if(!roundOver){
      roundTimeLeft -= dt/1000;
      roundTimerEl.textContent = Math.max(0, Math.ceil(roundTimeLeft));
      if(roundTimeLeft <= 0){
        const winner = match.p1.hp === match.p2.hp ? null : (match.p1.hp > match.p2.hp ? match.p1 : match.p2);
        if(winner) endRound(winner);
        else { roundOver = true; running = false; setTimeout(()=>startRound(currentRound), 1200); }
      }
    }
  }

  function loop(ts){
    if(!running) return;
    if(!lastTs) lastTs = ts;
    const dt = Math.min(ts - lastTs, 40);
    lastTs = ts;
    update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  draw_placeholder();
  function draw_placeholder(){
    ctx.fillStyle = '#0d0b0a';
    ctx.fillRect(0,0,W,H);
  }
})();