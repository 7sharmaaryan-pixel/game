const leonImg = document.getElementById('leonImg');
const mrxImg = document.getElementById('mrxImg');
const msg = document.getElementById('message');
const bossHpBar = document.getElementById('bossHp');
const playerHpBar = document.getElementById('playerHp');
const bHpText = document.getElementById('bHpText');
const pHpText = document.getElementById('pHpText');

// ---- SOUND EFFECTS -------------------------------------------------------
// Drop generated .mp3 files into an "sfx" folder next to this file, named
// exactly as below. MP3 is the format to export from DeepSeek/any AI sound
// generator - it's the most widely supported audio format for the browser's
// <audio>/Audio() API. If a file is missing, the game just stays silent for
// that cue instead of throwing an error, so you can add them one at a time.
const SFX_FILES = {
  punch:       'sfx/punch.mpeg',
  kick:        'sfx/kick.mpeg',
  mrxPunch:    'sfx/mrx_punch.mpeg',
  mrxKick:     'sfx/mrx_kick.mpeg',
  hit:         'sfx/hit.mpeg',
  block:       'sfx/block.mpeg',
  dodge:       'sfx/dodge.mpeg',
  footstep:    'sfx/footstep.mpeg',
  bossHitMiss: 'sfx/whiff.mpeg',
  victory:     'sfx/victory.mpeg',
  defeat:      'sfx/defeat.mpeg'
};
// Looping tracks: the horror-tinged combat music bed, and a tense heartbeat
// that kicks in whenever either fighter is close to death.
const LOOP_FILES = {
  battleMusic: {src:'sfx/battle_music.mpeg', volume:0.35},
  heartbeat:   {src:'sfx/heartbeat.mpeg', volume:0.55}
};
const sfxCache = {};
function playSfx(name){
  const src = SFX_FILES[name];
  if(!src) return;
  try{
    let base = sfxCache[name];
    if(!base){
      base = new Audio(src);
      base.volume = 0.7;
      sfxCache[name] = base;
    }
    const node = base.cloneNode();
    node.volume = base.volume;
    node.play().catch(()=>{ /* file not added yet / autoplay blocked - ignore */ });
  }catch(e){ /* ignore, sfx are optional */ }
}

const loopCache = {};
function playLoop(name){
  const cfg = LOOP_FILES[name];
  if(!cfg) return;
  try{
    let el = loopCache[name];
    if(!el){
      el = new Audio(cfg.src);
      el.loop = true;
      el.volume = cfg.volume;
      loopCache[name] = el;
    }
    if(el.paused) el.play().catch(()=>{ /* file not added yet / autoplay blocked - ignore */ });
  }catch(e){ /* ignore, sfx are optional */ }
}
function stopLoop(name){
  const el = loopCache[name];
  if(el){ el.pause(); el.currentTime = 0; }
}
// ---------------------------------------------------------------------------

let started=false, attacking=false, defending=false, dodging=false;
let playerHP=100, bossHP=1000, hits=0, misses=0, lastHit=0;
let bossState='idle';
let lastPlayerHitTime=Date.now();
let lastBossHitTime=Date.now();
const REGEN_DELAY=3500;   // Leon must go 3.5s without being hit before he starts healing
const REGEN_AMOUNT=2;     // HP restored per tick while regenerating
const REGEN_INTERVAL=500; // ms between regen ticks
const BOSS_REGEN_DELAY=5000;  // Mr. X must go 5s without being hit before he starts healing
const BOSS_REGEN_AMOUNT=20;   // HP restored per tick (scaled to his 1000 HP pool)
let lowHpWarned=false; // so the "near death" cue only fires once per dip

// Movement is confined to a single static screen now - no scrolling world,
// no elongated hallway. Bounds are computed from the current window width so
// both fighters always stay fully inside frame, on any screen size.
let WORLD_WIDTH = window.innerWidth;
const MOVE_SPEED = 7;
const BOSS_CHASE_SPEED = 2.4;
const CHAR_W_FRAC = 0.24; // matches .character{width:24%} in CSS
function leonMinX(){ return WORLD_WIDTH * 0.04; }
function leonMaxX(){ return WORLD_WIDTH * 0.60; }
function mrxMinX(){ return WORLD_WIDTH * 0.30; }
function mrxMaxX(){ return WORLD_WIDTH * (1 - CHAR_W_FRAC) - 20; }

// Start both fighters centered together on screen, side by side.
let leonX = WORLD_WIDTH * 0.28;
let mrxX  = WORLD_WIDTH * 0.48;

const keys = {left:false, right:false};
let lastFootstep = 0;

// Neither fighter is allowed to walk past the other - they can only close the
// gap down to a small no-cross buffer, or freely back away. This keeps Leon
// on the left side and Mr. X on the right side of the screen at all times.
// The buffer scales with character size so it always stays smaller than the
// hit-contact range above (otherwise punches could never actually land).
function noCrossGap(){ return WORLD_WIDTH * CHAR_W_FRAC * 0.05; }
function clampLeonNoCross(x){ return Math.min(x, mrxX - noCrossGap()); }
function clampMrxNoCross(x){ return Math.max(x, leonX + noCrossGap()); }

function startGame(){
  started=true;
  document.getElementById('start').classList.add('hidden');
  WORLD_WIDTH = window.innerWidth;
  leonX = WORLD_WIDTH * 0.28;
  mrxX  = WORLD_WIDTH * 0.48;
  document.getElementById('leon').style.left = leonX + 'px';
  document.getElementById('mrx').style.left = mrxX + 'px';
  playLoop('battleMusic');
  bossLoop();
  movementLoop();
}

function pose(el, file, duration=700){
  el.src=file;
  clearTimeout(el._poseTimer);
  el._poseTimer=setTimeout(()=>el.src=el===leonImg?'leon_idle.png':'mrx_idle.png',duration);
}

function flash(text){
  msg.textContent=text; msg.classList.add('show');
  clearTimeout(msg._t);
  msg._t=setTimeout(()=>msg.classList.remove('show'),300);
}

function updateBars(){
  bossHpBar.style.width=Math.max(0,bossHP/1000*100)+'%';
  playerHpBar.style.width=Math.max(0,playerHP)+'%';
  bHpText.textContent=Math.max(0,bossHP);
  pHpText.textContent=Math.max(0,playerHP);
}

function getBodyContact(){
  // Approximate the visible body hitboxes as a fraction of each character's
  // own box width, so this stays correct across any screen size.
  const charW = WORLD_WIDTH * CHAR_W_FRAC;
  const insetInner = charW * 0.059;
  const insetOuter = charW * 0.186;
  const leonLeft = leonX + insetInner;
  const leonRight = leonX + insetOuter;
  const mrxLeft = mrxX + insetInner;
  const mrxRight = mrxX + insetOuter;
  return {
    touching: leonRight >= mrxLeft && leonLeft <= mrxRight,
    gap: Math.max(mrxLeft - leonRight, leonLeft - mrxRight, 0)
  };
}

function damageBoss(amount){
  const contact = getBodyContact();

  // Damage only if the attack actually reaches Mr. X's body.
  if(!contact.touching){
    misses++;
    flash('OUT OF RANGE');
    return;
  }

  bossHP=Math.max(0,bossHP-amount);
  lastBossHitTime=Date.now();
  hits++;
  updateBars();
  flash('-'+amount);
  if(bossHP<=0) finish(true);
}

function damagePlayer(amount){
  // Damage only if Mr. X's punch/kick overlaps Leon's body.
  if(dodging || defending) {
    if(defending) flash('BLOCK');
    return;
  }

  const contact = getBodyContact();
  if(!contact.touching) return;

  playerHP=Math.max(0,playerHP-amount);
  lastPlayerHitTime=Date.now();
  updateBars();
  flash('HIT!');
  playSfx('hit');
  if(playerHP<=0) finish(false);
}

// Both fighters slowly regenerate health once they've gone a few seconds
// without taking a hit - Leon recovers a bit faster than the boss.
function regenLoop(){
  if(started){
    if(playerHP>0 && playerHP<100 && Date.now()-lastPlayerHitTime>=REGEN_DELAY){
      playerHP=Math.min(100, playerHP+REGEN_AMOUNT);
      updateBars();
    }
    if(bossHP>0 && bossHP<1000 && Date.now()-lastBossHitTime>=BOSS_REGEN_DELAY){
      bossHP=Math.min(1000, bossHP+BOSS_REGEN_AMOUNT);
      updateBars();
    }

    // Near-death tension cue: a heartbeat loop kicks in once either fighter
    // drops below 20% HP, and drops back out once they're clear of it.
    const nearDeath = (playerHP>0 && playerHP<=20) || (bossHP>0 && bossHP<=200);
    if(nearDeath && !lowHpWarned){
      lowHpWarned=true;
      playLoop('heartbeat');
    } else if(!nearDeath && lowHpWarned){
      lowHpWarned=false;
      stopLoop('heartbeat');
    }
  }
  setTimeout(regenLoop, REGEN_INTERVAL);
}
regenLoop();

// "Correct hit" = boss is not defending/attacking and is within the fixed attack window.

function updateMovement(){
  if(!started || playerHP<=0 || bossHP<=0) return;

  // Leon moves freely within the frame. The no-cross rule is enforced further
  // down by pushing Mr. X backward instead of capping Leon here, so he can
  // press all the way up to Mr. X without getting stuck early.
  if(keys.left) leonX -= MOVE_SPEED;
  if(keys.right) leonX += MOVE_SPEED;

  if((keys.left||keys.right) && Date.now()-lastFootstep>300){
    playSfx('footstep');
    lastFootstep=Date.now();
  }

  leonX = Math.max(leonMinX(), Math.min(leonMaxX(), leonX));

  // Sometimes Mr. X chases Leon when they get too far apart.
  const distance = leonX - mrxX;
  if(Math.abs(distance) > 220 && Math.random() < 0.055){
    const direction = distance > 0 ? 1 : -1;
    mrxX += direction * BOSS_CHASE_SPEED;
  }

  mrxX = Math.max(mrxMinX(), Math.min(mrxMaxX(), mrxX));
  // Mr. X gets pushed back to keep the no-cross gap whenever Leon presses in on him.
  mrxX = clampMrxNoCross(mrxX);

  // If Mr. X is pinned against the edge of the screen and physically can't
  // retreat any further, THEN stop Leon there too - neither can cross the other.
  leonX = clampLeonNoCross(leonX);

  // Keep the fighters facing each other.
  // Leon always faces right; Mr. X's sprite is mirrored in CSS so he faces left.
  document.getElementById('leon').style.left = leonX + 'px';
  document.getElementById('mrx').style.left = mrxX + 'px';
}

function movementLoop(){
  updateMovement();
  requestAnimationFrame(movementLoop);
}

function punch(){
  if(!started || attacking || defending || dodging || bossHP<=0) return;
  attacking=true;
  pose(leonImg,'leon_punch.png',650);
  playSfx('punch');

  setTimeout(()=>{
    if(bossState==='vulnerable'){
      damageBoss(100);
    } else {
      misses++;
      flash('BLOCKED / MISSED');
      playSfx('bossHitMiss');
    }
  },360);

  setTimeout(()=>attacking=false,650);
}

function kick(){
  if(!started || attacking || defending || dodging || bossHP<=0) return;
  attacking=true;
  pose(leonImg,'leon_kick.png',700);
  playSfx('kick');
  setTimeout(()=>{
    if(bossState==='vulnerable') damageBoss(140);
    else { misses++; flash('BLOCKED / MISSED'); playSfx('bossHitMiss'); }
  },390);
  setTimeout(()=>attacking=false,700);
}

function defend(){
  if(!started || attacking || dodging) return;
  defending=true;
  pose(leonImg,'leon_defend.png',850);
  playSfx('block');
  setTimeout(()=>defending=false,850);
}

function dodge(){
  if(!started || attacking || defending) return;
  dodging=true;
  pose(leonImg,'leon_dodge.png',650);
  playSfx('dodge');
  setTimeout(()=>dodging=false,650);
}

document.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'){ keys.left=true; e.preventDefault(); }
  if(e.key==='ArrowRight'){ keys.right=true; e.preventDefault(); }

  if(e.repeat) return;
  if(e.key.toLowerCase()==='j') punch();
  if(e.key.toLowerCase()==='k') kick();
  if(e.key.toLowerCase()==='l') defend();
  if(e.code==='Space'){e.preventDefault(); dodge();}
});

document.addEventListener('keyup',e=>{
  if(e.key==='ArrowLeft') keys.left=false;
  if(e.key==='ArrowRight') keys.right=false;
});

function bossLoop(){
  if(!started || bossHP<=0 || playerHP<=0) return;

  // A slower cycle keeps the fight alive for about a minute even if
  // the player mostly waits. The boss still attacks, so standing still
  // gradually costs health when he is actually close enough to hit.
  bossState='vulnerable';
  mrxImg.src='mrx_idle.png';

  setTimeout(()=>{
    if(!started || bossHP<=0 || playerHP<=0) return;

    bossState='attacking';
    // Mr. X may close the gap briefly before striking.
    if(Math.abs(leonX-mrxX)>150){
      const dir = leonX > mrxX ? 1 : -1;
      mrxX += dir * 80;
      mrxX = Math.max(mrxMinX(), Math.min(mrxMaxX(), mrxX));
      mrxX = clampMrxNoCross(mrxX);
      document.getElementById('mrx').style.left = mrxX + 'px';
    }

    pose(mrxImg, Math.random() < 0.5 ? 'mrx_punch.png' : 'mrx_kick.png', 950);
    playSfx(mrxImg.src.includes('punch') ? 'mrxPunch' : 'mrxKick');

    setTimeout(()=>{
      if(!started || bossHP<=0 || playerHP<=0) return;
      if(!dodging) damagePlayer(10);
    },350);

    setTimeout(()=>{
      if(!started || bossHP<=0 || playerHP<=0) return;
      bossState='vulnerable';
      bossLoop();
    },2200);
  },1700);
}

function finish(win){
  started=false;
  stopLoop('battleMusic');
  stopLoop('heartbeat');
  document.getElementById('end').classList.remove('hidden');
  document.getElementById('endTitle').textContent = win
    ? 'CITY SILENCED. YOU SURVIVED.'
    : 'THE CITY KEEPS YOUR SCREAM.';
  playSfx(win?'victory':'defeat');
  document.getElementById('endText').innerHTML = win
    ? `The Warden crumples into the dark and the hallway finally goes quiet. Somewhere above, the fan keeps turning like nothing happened.<br><br>Hits: ${hits}<br>Misses: ${misses}<br>Final HP: ${playerHP}`
    : `Your legs give out on the cold floorboards. The Warden looms over you as the lights die out one by one - just another shape swallowed by the rumble.<br><br>Hits: ${hits}<br>Misses: ${misses}`;
}