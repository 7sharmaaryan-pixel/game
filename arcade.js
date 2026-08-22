(function(){
  const STORAGE_NAME_KEY = 'arcade_player_name';
  const STORAGE_SCORES_KEY = 'arcade_scores'; // { typing: [], bomb: [], shooter: [] }
  const STORAGE_AUDIO_KEY = 'arcade_audio_muted';
  const MAX_ENTRIES_SHOWN = 8;

  const nameInput = document.getElementById('player-name-input');
  const homeScreen = document.getElementById('home-screen');
  const frameOverlay = document.getElementById('game-frame-overlay');
  const gameFrame = document.getElementById('game-frame');
  const exitBtn = document.getElementById('exit-arcade-btn');
  const toast = document.getElementById('toast');
  const lbTypingEl = document.getElementById('lb-typing');
  const lbBombEl = document.getElementById('lb-bomb');
  const lbShooterEl = document.getElementById('lb-shooter');
  const audioToggleBtn = document.getElementById('audio-toggle');
  const bgMusicEl = document.getElementById('bg-music');
  const launchSfxEl = document.getElementById('launch-sfx');

  const GAME_LABELS = { typing: 'TYPE LEAGUE', bomb: 'DEFUSE PROTOCOL', shooter: 'NEON INTERCEPTOR' };

  /* ---------------- name + scores ---------------- */

  function getPlayerName(){
    return localStorage.getItem(STORAGE_NAME_KEY) || '';
  }
  function setPlayerName(name){
    localStorage.setItem(STORAGE_NAME_KEY, name);
  }

  function getScores(){
    try{
      return JSON.parse(localStorage.getItem(STORAGE_SCORES_KEY)) || { typing: [], bomb: [], shooter: [] };
    }catch{
      return { typing: [], bomb: [], shooter: [] };
    }
  }
  function saveScores(scores){
    localStorage.setItem(STORAGE_SCORES_KEY, JSON.stringify(scores));
  }

  function addScore(game, name, score, meta){
    const scores = getScores();
    if(!scores[game]) scores[game] = [];
    scores[game].push({ name: name || 'Player', score, meta: meta || null, ts: Date.now() });
    saveScores(scores);
    renderLeaderboards();
  }

  function renderBoard(el, entries, emptyMsg){
    if(!el) return;
    if(!entries || entries.length === 0){
      el.innerHTML = `<div class="lb-empty">${emptyMsg}</div>`;
      return;
    }
    const sorted = [...entries].sort((a,b) => b.score - a.score).slice(0, MAX_ENTRIES_SHOWN);
    el.innerHTML = sorted.map((e, i) => `
      <div class="lb-row">
        <span class="lb-rank">#${i+1}</span>
        <span class="lb-name">${escapeHtml(e.name)}</span>
        <span class="lb-score">${e.score}</span>
      </div>
    `).join('');
  }

  function escapeHtml(s){
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function renderLeaderboards(){
    const scores = getScores();
    renderBoard(lbTypingEl, scores.typing, 'No racers yet. Be the first!');
    renderBoard(lbBombEl, scores.bomb, 'No agents yet. Be the first!');
    renderBoard(lbShooterEl, scores.shooter, 'No pilots yet. Be the first!');
  }

  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  /* ---------------- audio: real music file (bg-music) + synthesized click sfx ---------------- */

  const AudioManager = (function(){
    let ctx = null;       // used only for the tiny click sfx
    let sfxGain = null;
    let muted = localStorage.getItem(STORAGE_AUDIO_KEY) === '1';
    let unlocked = false;

    const MUSIC_VOLUME = 0.35; // tweak to taste (0.0 - 1.0)

    if(bgMusicEl){
      bgMusicEl.volume = MUSIC_VOLUME;
      bgMusicEl.muted = muted;
    }

    function ensureSfxContext(){
      if(ctx) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return;
      ctx = new Ctx();
      sfxGain = ctx.createGain();
      sfxGain.gain.value = muted ? 0 : 0.18;
      sfxGain.connect(ctx.destination);
    }

    function startMusic(){
      if(!bgMusicEl || muted) return;
      // play() returns a promise; browsers may reject until a user gesture has occurred
      const p = bgMusicEl.play();
      if(p && p.catch) p.catch(() => { /* ignored: will retry on next unlock gesture */ });
    }

    function stopMusic(){
      if(!bgMusicEl) return;
      bgMusicEl.pause();
    }

    function playClick(){
      ensureSfxContext();
      if(!ctx) return;
      if(ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(920, t);
      osc.frequency.exponentialRampToValueAtTime(340, t + 0.09);
      g.gain.setValueAtTime(0.7, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.11);
    }

    function playLaunch(){
      if(!launchSfxEl || muted) return;
      launchSfxEl.currentTime = 0; // restart if clicked rapidly
      const p = launchSfxEl.play();
      if(p && p.catch) p.catch(() => { /* ignored: needs a user gesture first */ });
    }

    function setMuted(val){
      muted = val;
      localStorage.setItem(STORAGE_AUDIO_KEY, muted ? '1' : '0');
      if(bgMusicEl) bgMusicEl.muted = muted;
      if(launchSfxEl) launchSfxEl.muted = muted;
      if(sfxGain) sfxGain.gain.value = muted ? 0 : 0.18;
      if(!muted) startMusic(); else stopMusic();
    }

    function toggleMuted(){
      setMuted(!muted);
      return muted;
    }

    function isMuted(){ return muted; }

    // Unlock + start music on first user gesture (autoplay policies require this)
    function unlockOnce(){
      if(unlocked) return;
      unlocked = true;
      ensureSfxContext();
      if(!muted) startMusic();
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
    }
    window.addEventListener('pointerdown', unlockOnce, { once: true });
    window.addEventListener('keydown', unlockOnce, { once: true });

    return { playClick, playLaunch, startMusic, stopMusic, toggleMuted, isMuted };
  })();

  function refreshAudioToggleUI(){
    if(!audioToggleBtn) return;
    const muted = AudioManager.isMuted();
    audioToggleBtn.classList.toggle('muted', muted);
    audioToggleBtn.textContent = muted ? '♪ MUSIC: OFF' : '♪ MUSIC: ON';
  }

  if(audioToggleBtn){
    refreshAudioToggleUI();
    audioToggleBtn.addEventListener('click', () => {
      AudioManager.toggleMuted();
      refreshAudioToggleUI();
      AudioManager.playClick();
    });
  }

  /* ---------------- game launching ---------------- */

  function launchGame(src){
    AudioManager.stopMusic();
    gameFrame.src = src;
    frameOverlay.classList.add('show');
  }

  function returnToArcade(){
    frameOverlay.classList.remove('show');
    gameFrame.src = 'about:blank';
    AudioManager.startMusic();
  }

  document.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      AudioManager.playLaunch();
      launchGame(btn.getAttribute('data-src'));
    });
  });

  exitBtn.addEventListener('click', () => {
    AudioManager.playClick();
    returnToArcade();
  });

  // Listen for GAME_OVER messages posted from any embedded game
  window.addEventListener('message', (event) => {
    const data = event.data;
    if(!data || data.type !== 'GAME_OVER') return;
    const game = data.game;
    const score = Number(data.score) || 0;
    const name = getPlayerName() || 'Player';
    addScore(game, name, score, data.meta);
    showToast(`${GAME_LABELS[game] || game} — score ${score} added to the leaderboard`);
  });

  nameInput.value = getPlayerName();
  nameInput.addEventListener('change', () => setPlayerName(nameInput.value.trim()));
  nameInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') nameInput.blur(); });

  renderLeaderboards();
})();