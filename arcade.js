(function(){
  const STORAGE_NAME_KEY = 'arcade_player_name';
  const STORAGE_SCORES_KEY = 'arcade_scores'; // { typing: [{name,score,meta,ts}], bomb: [...] }
  const MAX_ENTRIES_SHOWN = 8;

  const nameInput = document.getElementById('player-name-input');
  const homeScreen = document.getElementById('home-screen');
  const frameOverlay = document.getElementById('game-frame-overlay');
  const gameFrame = document.getElementById('game-frame');
  const exitBtn = document.getElementById('exit-arcade-btn');
  const toast = document.getElementById('toast');
  const lbTypingEl = document.getElementById('lb-typing');
  const lbBombEl = document.getElementById('lb-bomb');

  const GAME_LABELS = { typing: 'TYPE LEAGUE', bomb: 'DEFUSE PROTOCOL' };

  function getPlayerName(){
    return localStorage.getItem(STORAGE_NAME_KEY) || '';
  }
  function setPlayerName(name){
    localStorage.setItem(STORAGE_NAME_KEY, name);
  }

  function getScores(){
    try{
      return JSON.parse(localStorage.getItem(STORAGE_SCORES_KEY)) || { typing: [], bomb: [] };
    }catch{
      return { typing: [], bomb: [] };
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
  }

  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function launchGame(src){
    gameFrame.src = src;
    frameOverlay.classList.add('show');
  }

  function returnToArcade(){
    frameOverlay.classList.remove('show');
    gameFrame.src = 'about:blank';
  }

  document.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      launchGame(btn.getAttribute('data-src'));
    });
  });

  exitBtn.addEventListener('click', returnToArcade);

  // Listen for GAME_OVER messages posted from either embedded game
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