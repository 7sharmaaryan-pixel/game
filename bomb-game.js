(function(){
  const LEVELS = [
    {
      name: "LEVEL 1 // WARM-UP",
      desc: "Easy memes to get you started. Cut the correct wire for each one.",
      task: "Defuse 5 wires correctly. You have 3 lives — 3 wrong cuts and the device detonates.",
      nextName: "LEVEL 2 // PRESSURE RISING",
      nextDesc: "7 questions, 4 lives. Less time to think per wire.",
      timeLimit: 110,
      qCount: 5,
      maxStrikes: 3,
      memes: [
        { memeUrl: "meme1.jpeg", caption: "Guess the correct caption ?", choices: ["GHEE KHATAM", " BELIVE ME HE IS NOT JORDAN BERETT", "LINGESAN", "BHAI MEWING KIYA KAR "], answer: 0 },
        { memeUrl: "meme2.jpeg", caption: "Pick the correct caption.", choices: [" INDIA KA CHRIS BROWN ", " BELIVE ME HE IS NOT BRAD PITT", " MONEY FOLLOWS MY BROTHER ", "KOTESHWARAI SHIVA KOTESHWARAI"], answer: 3 },
        { memeUrl: "meme3.jpeg", caption: "Guess the correct one?", choices: ["SON", "FALCON", "A HANDSOME MAN", "SAM WIL-SON"], answer: 3 },
        { memeUrl: "meme4.jpeg", caption: "Who's calling ", choices: ["SAM PORK ", "JHON PORK", "WILL PORK ", "MIKE PORK"], answer: 1 },
        { memeUrl: "meme5.jpeg", caption: " Guess the correct caption ", choices: [" HUNTER EYES ", "HATT BC ", "AAJ LEGS DAY NAHI LAGAUNGA ", "RANDOM GYM FREAK"], answer: 1 },
        { memeUrl: "meme6.jpeg", caption: " Guess the correct caption", choices: [" SALLU BHAI ", "SAWAL WAHI HAI ", " MIL JAYEGA KYA ", " BHALU "], answer: 2},
        { memeUrl: "meme7.jpeg", caption: "Guess his name.", choices: ["KID FROM DIARY OF A WIMPY KID ", "CHUD HOMEBOY", "RECESSED MENDIBLE LTN", " SYBAU NEEGY"], answer: 3 },
        { memeUrl: "meme8.jpeg", caption: "Guess the caption.", choices: ["RONALDO'S WIFE ", "SUIIIIIII", "MY MOM IS KINDA HOMELESS", "TRY NOT TO LAUGH CHALLANGE "], answer: 2},
        { memeUrl: "meme9.jpeg", caption: "Guess his name ", choices: ["DIN DIN DIN DUN ", "BOBRITO BANDITO ", "TRULIMIRO TRULICINA", "TRIPPI TROPPI"], answer: 3 },
        { memeUrl: "meme10.jpeg", caption: "Guess his name?", choices: ["MATTEO", "FRIGO CAMILIO", "BONECA AMBALAMBU", "BOBRITO BANDITO"], answer: 0 }
      ]
    },
    {
      name: "LEVEL 2 // GUESS THE ANIME CHARACTER ",
      desc: "The clock is tighter now. One wrong cut costs you real time.",
      task: "Defuse 7 wires correctly. You have 4 lives — 4 wrong cuts and the device detonates.",
      nextName: "LEVEL 3 // GUESS THE ARTIST",
      nextDesc: "9 questions (from a pool of 18), 5 lives. Pick the correct artist for each photo — no room for mistakes.",
      timeLimit: 120,
      qCount: 7,
      maxStrikes: 4,
      memes: [
        { memeUrl: "ANIME1.jpeg", caption: " guess the correct option .", choices: ["CANUTE", "THORFIN", "THORKELL", "ASKELADD"], answer: 1 },
        { memeUrl: "ANIME2.jpeg", caption: " guess the correct option", choices: [" KEMPACHI ", " AIZEN ", "GRIMMJOW", "SHUNSUI"], answer: 3 },
        { memeUrl: "ANIME3.jpeg", caption: " guess the correct option", choices: ["NANAMI ", " HIROMI", "GOJO", "TOJI"], answer: 1 },
        { memeUrl: "ANIME4.jpeg", caption: " guess the correct option", choices: ["JONATHAN", "JOSEPH", "JOTARO", "JOSUKE"], answer: 1},
        { memeUrl: "ANIME5.jpeg", caption: " guess the correct option ", choices: [" DOFLAMIGO ", "LAW ", "MIHAWK ", " LUCCI"], answer: 0 },
        { memeUrl: "ANIME6.jpeg", caption: "guess the correct option", choices: ["MELLO", "LIGHT YAGAMI ", "L", "NEAR"], answer: 0 },
        { memeUrl: "ANIME7.jpeg", caption: "guess the correct option", choices: ["DRAGON", "MICKEY", "BAJI", "SHUJI"], answer: 2 },
        { memeUrl: "ANIME8.jpeg", caption: "guess the correct option", choices: [" YUKI", "MAKI", "MEI MEI ", "MAI"], answer: 2},
        { memeUrl: "ANIME9.jpeg", caption: " guess the correct option ", choices: ["RIKO", "MAKI", "KASUMI", "NOBARA"], answer: 1 },
        { memeUrl: "ANIME10.jpeg", caption: " guess the correct option", choices: ["SASORI", "DEIDARA", "ITACHI", "MADARA"], answer: 0 }
      ]
    },
    {
      name: "LEVEL 3 // GUESS THE ARTIST",
      desc: "Last stretch, agent. Pick the correct artist for each photo — the toughest run, most wires, most lives.",
      task: "Defuse 9 wires correctly, drawn at random from a pool of 18. You have 5 lives — 5 wrong cuts and the device detonates.",
      nextName: "",
      nextDesc: "",
      timeLimit: 120,
      qCount: 9,
      maxStrikes: 5,
      memes: [
    { memeUrl: "artist1.jpeg", caption: "Guess the artist.", choices: ["Divine", "Seedhe Maut", "Raftaar", "Krsna"], answer: 1 },
    { memeUrl: "artist2.jpeg", caption: "Name this artist.", choices: ["Olivia Rodrigo", "Sabrina Carpenter", "Dua Lipa", "Ariana Grande"], answer: 1 },
    { memeUrl: "artist3.jpeg", caption: "Guess the artist.", choices: ["Billie Eilish", "Taylor Swift", "Adele", "Selena Gomez"], answer: 1 },
    { memeUrl: "artist4.jpeg", caption: "Name this artist.", choices: ["Frank Ocean", "Childish Gambino", "Tyler, The Creator", "Kendrick Lamar"], answer: 2 },
    { memeUrl: "artist5.jpeg", caption: "Guess the artist.", choices: ["Playboi Carti", "A$AP Rocky", "Travis Scott", "Lil Uzi Vert"], answer: 1 },
    { memeUrl: "artist6.jpeg", caption: "Name this artist.", choices: ["Raga", "Frappe Ash", "Nanku", "Yungsta"], answer: 2 },
    { memeUrl: "artist7.jpeg", caption: "Guess the artist.", choices: ["Chris Cornell", "Kurt Cobain", "Layne Staley", "Eddie Vedder"], answer: 1 },
    { memeUrl: "artist8.jpeg", caption: "Name this artist.", choices: ["David Bowie", "Robert Plant", "Freddie Mercury", "Elton John"], answer: 2 },
    { memeUrl: "artist9.jpeg", caption: "Guess the artist.", choices: ["Raga", "Chaar Diwari", "Karma", "Seedhe Maut"], answer: 1 },
    { memeUrl: "artist10.jpeg", caption: "Name this artist.", choices: ["Jimmy Page", "Jeff Beck", "Eric Clapton", "Jimi Hendrix"], answer: 3 },
    { memeUrl: "artist11.jpeg", caption: "Guess the artist.", choices: ["Whitney Houston", "Sade", "Toni Braxton", "Anita Baker"], answer: 1 },
    { memeUrl: "artist12.jpeg", caption: "Name this artist.", choices: ["Rakim", "Nas", "Jay-Z", "The Notorious B.I.G."], answer: 1 },
    { memeUrl: "artist13.jpeg", caption: "Guess the artist.", choices: ["Ice Cube", "2Pac", "Snoop Dogg", "The Notorious B.I.G."], answer: 1 },
    { memeUrl: "artist14.jpeg", caption: "Name this artist.", choices: ["AP Dhillon", "Amrit Maan", "Sidhu Moose Wala", "Karan Aujla"], answer: 2 },
    { memeUrl: "artist15.jpeg", caption: "Guess the artist.", choices: ["The Local Train", "Anuv Jain", "When Chai Met Toast", "Prateek Kuhad"], answer: 1 },
    { memeUrl: "artist16.jpeg", caption: "Name this artist.", choices: ["Raftaar", "Baadshah", "Divine", "Yo Yo Honey Singh"], answer: 1 },
    { memeUrl: "artist17.jpeg", caption: "Guess the artist.", choices: ["V", "J-Hope", "Jungkook", "Jimin"], answer: 2 },
    { memeUrl: "artist18.jpeg", caption: "Name this artist.", choices: ["Manmohan Waris", "Gurdas Maan", "Harbhajan Mann", "Surjit Khan"], answer: 1 }
     ]    
    }
  ];

  const WIRE_COLORS = [
    {name:"RED",   base:"#c23b32", label:"RED"},
    {name:"BLUE",  base:"#2e7fbd", label:"BLUE"},
    {name:"YELLOW",base:"#c9a63a", label:"YELLOW"},
    {name:"WHITE", base:"#c7cbcd", label:"WHITE"}
  ];

  const WRONG_PENALTY = 8;
  const PRELEVEL_DURATION = 5000; // 5 seconds
  const LOW_TIME_THRESHOLD = 10; // seconds — tick sound kicks in at/under this

  // Overall strike cap for the whole run = the final level's maxStrikes.
  // Strikes accumulate across all 3 levels and are never reset between them.
  const OVERALL_MAX_STRIKES = LEVELS[LEVELS.length - 1].maxStrikes;

  let currentLevel, pool, qi, score, strikes, timeLeft, timerId, playing, answered;

  const timerEl = document.getElementById('timer');
  const scoreEl = document.getElementById('score');
  const strikesEl = document.getElementById('strikes');
  const qIndexEl = document.getElementById('q-index');
  const memeImgEl = document.getElementById('meme-img');
  const memeCaptionEl = document.getElementById('meme-caption');
  const wiresEl = document.getElementById('wires');
  const startBtn = document.getElementById('start-btn');
  const retryBtn = document.getElementById('retry-btn');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlaySub = document.getElementById('overlay-sub');
  const overlayScore = document.getElementById('overlay-score');
  const phaseLabel = document.getElementById('phase-label');
  const bombEl = document.getElementById('bomb');

  const levelNameEl = document.getElementById('level-name');
  const levelDescEl = document.getElementById('level-desc');

  const levelOverlay = document.getElementById('level-overlay');
  const levelOverlayTitle = document.getElementById('level-overlay-title');
  const levelOverlaySub = document.getElementById('level-overlay-sub');
  const nextLevelNameEl = document.getElementById('next-level-name');
  const nextLevelDescEl = document.getElementById('next-level-desc');
  const continueBtn = document.getElementById('continue-btn');

  const preLevelOverlay = document.getElementById('prelevel-overlay');
  const prelevelNameEl = document.getElementById('prelevel-name');
  const prelevelDescEl = document.getElementById('prelevel-desc');

  // ===== MUSIC / SFX =====
  const bgMusic = document.getElementById('bg-music');
  const tickSound = document.getElementById('tick-sound');
  const wireCutSound = document.getElementById('wire-cut-sound');
  const wireWrongSound = document.getElementById('wire-wrong-sound');
  const explosionSound = document.getElementById('explosion-sound');
  const defuseWinSound = document.getElementById('defuse-win-sound');

  const musicToggleBtn = document.getElementById('music-toggle-btn');
  const volumeSlider = document.getElementById('volume-slider');
  const musicTrackLabel = document.getElementById('music-track-label');

  let musicMuted = false;
  let musicVolume = 0.5;
  let tickPlaying = false;

  function applyVolumes(){
    const v = musicMuted ? 0 : musicVolume;
    bgMusic.volume = v;
    tickSound.volume = musicMuted ? 0 : Math.min(1, musicVolume + 0.15);
    wireCutSound.volume = musicMuted ? 0 : musicVolume;
    wireWrongSound.volume = musicMuted ? 0 : musicVolume;
    explosionSound.volume = musicMuted ? 0 : Math.min(1, musicVolume + 0.3);
    defuseWinSound.volume = musicMuted ? 0 : Math.min(1, musicVolume + 0.2);
  }

  function playSfx(el){
    if(musicMuted) return;
    try{
      el.currentTime = 0;
      el.play().catch(()=>{});
    }catch(e){}
  }

  function startBgMusic(){
    applyVolumes();
    if(!musicMuted){
      bgMusic.play().catch(()=>{});
    }
  }

  function stopBgMusic(){
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }

  function startTick(){
    if(tickPlaying || musicMuted) return;
    tickPlaying = true;
    tickSound.currentTime = 0;
    tickSound.play().catch(()=>{});
  }

  function stopTick(){
    tickPlaying = false;
    tickSound.pause();
    tickSound.currentTime = 0;
  }

  musicToggleBtn.addEventListener('click', () => {
    musicMuted = !musicMuted;
    musicToggleBtn.classList.toggle('muted', musicMuted);
    musicToggleBtn.textContent = musicMuted ? '\u{1F507}' : '\u266B';
    musicTrackLabel.textContent = musicMuted ? 'MUSIC OFF' : 'MUSIC ON';
    applyVolumes();
    if(musicMuted){
      stopBgMusic();
      stopTick();
    } else if(playing){
      startBgMusic();
      if(timeLeft <= LOW_TIME_THRESHOLD) startTick();
    }
  });

  volumeSlider.addEventListener('input', () => {
    musicVolume = Number(volumeSlider.value) / 100;
    applyVolumes();
  });

  applyVolumes();

  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  // Draws `count` unique questions at random from `memes` (e.g. level 3 draws
  // 9 out of a pool of up to 18). Only repeats entries as a fallback if the
  // pool itself is smaller than `count`.
  function buildPool(memes, count){
    if(memes.length >= count){
      return shuffle(memes).slice(0, count);
    }
    let out = [];
    while(out.length < count){
      out = out.concat(shuffle(memes));
    }
    return out.slice(0, count);
  }

  function fmtTime(s){
    s = Math.max(0,s);
    const m = Math.floor(s/60).toString().padStart(2,'0');
    const r = Math.floor(s%60).toString().padStart(2,'0');
    return m+":"+r;
  }

  function renderStrikesLEDs(max){
    strikesEl.innerHTML = "";
    for(let i=0;i<max;i++){
      const led = document.createElement('div');
      led.className = 'strike-led';
      strikesEl.appendChild(led);
    }
  }

  function updateStrikesUI(){
    const leds = strikesEl.querySelectorAll('.strike-led');
    leds.forEach((led,i)=> led.classList.toggle('lit', i < strikes));
  }

  function makeWirePath(){
    const amp = 4 + Math.random()*4;
    const mid1x = 60, mid2x = 240;
    return `M0,13 C ${mid1x},${13-amp} ${mid2x},${13+amp} 300,13`;
  }

  function renderQuestion(){
    answered = false;
    const level = LEVELS[currentLevel];
    const item = pool[qi];

    qIndexEl.textContent = `QUESTION ${qi+1} / ${level.qCount}`;

    memeImgEl.src = item.memeUrl;
    memeImgEl.alt = item.caption || "QUESTION";
    memeCaptionEl.textContent = item.caption || "";

    const wireOrder = shuffle([0,1,2,3]);
    wiresEl.innerHTML = "";
    item.choices.forEach((choiceText, choiceIdx) => {
      const colorIdx = wireOrder[choiceIdx];
      const color = WIRE_COLORS[colorIdx];
      const row = document.createElement('button');
      row.className = 'wire-row';
      row.setAttribute('data-choice', choiceIdx);
      row.innerHTML = `
        <span class="wire-plug"></span>
        <span class="wire-svg-wrap">
          <svg viewBox="0 0 300 26" preserveAspectRatio="none">
            <path class="wire-path" d="${makeWirePath()}" stroke="${color.base}"></path>
          </svg>
          <span class="wire-label">${color.label} — ${choiceText}</span>
        </span>
      `;
      row.addEventListener('click', () => handleCut(row, choiceIdx, item.answer));
      wiresEl.appendChild(row);
    });
  }

  function handleCut(row, choiceIdx, correctIdx){
    if(!playing || answered) return;
    answered = true;
    document.querySelectorAll('.wire-row').forEach(r => r.disabled = true);

    if(choiceIdx === correctIdx){
      row.classList.add('cut','correct');
      row.querySelector('.wire-path').setAttribute('stroke', '#39ff8c');
      score += 10;
      scoreEl.textContent = String(score).padStart(3,'0');
      spawnSparks(row, '#39ff8c');
      playSfx(wireCutSound);
      setTimeout(nextQuestion, 650);
    } else {
      row.classList.add('cut','wrong');
      row.querySelector('.wire-path').setAttribute('stroke', '#ff3b30');
      strikes++;
      updateStrikesUI();
      timeLeft = Math.max(0, timeLeft - WRONG_PENALTY);
      spawnSparks(row, '#ff3b30');
      playSfx(wireWrongSound);
      bombEl.classList.add('screen-shake');
      setTimeout(()=>bombEl.classList.remove('screen-shake'), 350);
      if(strikes >= OVERALL_MAX_STRIKES){
        setTimeout(()=>endGame(false, "Too many wrong cuts."), 500);
      } else {
        setTimeout(nextQuestion, 750);
      }
    }
  }

  function spawnSparks(row, color){
    const wrap = row.querySelector('.wire-svg-wrap');
    for(let i=0;i<8;i++){
      const s = document.createElement('span');
      s.className = 'spark';
      s.style.left = (30 + Math.random()*240)+'px';
      s.style.background = color;
      s.style.boxShadow = `0 0 6px ${color}`;
      wrap.appendChild(s);
      const dx = (Math.random()-0.5)*40;
      const dy = (Math.random()-0.5)*40 - 10;
      s.animate([
        {transform:'translate(-50%,-50%) translate(0,0)', opacity:1},
        {transform:`translate(-50%,-50%) translate(${dx}px,${dy}px)`, opacity:0}
      ], {duration:500, easing:'ease-out'});
      setTimeout(()=>s.remove(), 520);
    }
  }

  function nextQuestion(){
    qi++;
    const level = LEVELS[currentLevel];
    if(qi >= level.qCount){
      if(!playing) return;
      clearInterval(timerId);
      stopTick();
      if(currentLevel >= LEVELS.length - 1){
        endGame(true);
      } else {
        showLevelOverlay();
      }
      return;
    }
    renderQuestion();
  }

  function showLevelOverlay(){
    const finished = LEVELS[currentLevel];
    const next = LEVELS[currentLevel + 1];

    document.getElementById('level-overlay-tag').textContent = "ROUND CLEAR";
    levelOverlayTitle.textContent = finished.name + " COMPLETE";
    levelOverlaySub.textContent = "Nice work. Here's what's coming up.";
    nextLevelNameEl.textContent = next.name;
    nextLevelDescEl.textContent = next.nextDesc || next.desc;

    phaseLabel.textContent = "STANDBY";
    levelOverlay.classList.add('show');
  }

  // 5-second briefing overlay shown before a level begins, auto-continues
  function showPreLevelOverlay(levelIdx, onDone){
    const level = LEVELS[levelIdx];
    prelevelNameEl.textContent = level.name;
    prelevelDescEl.textContent = level.task || level.desc;

    phaseLabel.textContent = "BRIEFING";
    preLevelOverlay.classList.add('show');

    setTimeout(() => {
      preLevelOverlay.classList.remove('show');
      onDone();
    }, PRELEVEL_DURATION);
  }

  function startLevel(levelIdx){
    currentLevel = levelIdx;
    const level = LEVELS[levelIdx];

    pool = buildPool(level.memes, level.qCount);
    qi = 0;
    timeLeft = level.timeLimit;
    // strikes are NOT reset here — they persist across the whole run

    levelNameEl.textContent = level.name;
    levelDescEl.textContent = level.desc;

    timerEl.textContent = fmtTime(timeLeft);
    timerEl.classList.remove('low');
    phaseLabel.textContent = "ARMED";
    stopTick();

    clearInterval(timerId);
    timerId = setInterval(tick, 1000);

    renderQuestion();
  }

  function tick(){
    timeLeft--;
    timerEl.textContent = fmtTime(timeLeft);
    const low = timeLeft <= LOW_TIME_THRESHOLD;
    timerEl.classList.toggle('low', low);
    if(low && timeLeft > 0){
      startTick();
    } else {
      stopTick();
    }
    if(timeLeft <= 0){
      endGame(false, "Time expired.");
    }
  }

  function startGame(){
    score = 0;
    strikes = 0; // reset once, for the whole run — not per level
    playing = false;
    scoreEl.textContent = "000";
    renderStrikesLEDs(OVERALL_MAX_STRIKES);
    updateStrikesUI();
    overlay.classList.remove('show');
    levelOverlay.classList.remove('show');
    startBtn.textContent = "RESTART";
    stopTick();
    startBgMusic();
    showPreLevelOverlay(0, () => {
      playing = true;
      startLevel(0);
    });
  }

  function endGame(won, reasonText){
    playing = false;
    clearInterval(timerId);
    stopTick();
    stopBgMusic();
    document.querySelectorAll('.wire-row').forEach(r => r.disabled = true);
    phaseLabel.textContent = won ? "DEFUSED" : "DETONATED";
    overlay.classList.remove('boom','win');
    if(won){
      overlay.classList.add('win');
      overlayTitle.textContent = "DEFUSED";
      overlaySub.textContent = "All three levels cleared. Device neutralized, agent.";
      playSfx(defuseWinSound);
    } else {
      overlay.classList.add('boom');
      overlayTitle.textContent = "BOOM";
      overlaySub.textContent = reasonText || "The device has detonated.";
      playSfx(explosionSound);
    }
    overlayScore.textContent = "SCORE: " + String(score).padStart(3,'0');
    overlay.classList.add('show');

    // Report the run's score up to the launcher (leaderboard), whether opened
    // as a popup tab (window.opener) or embedded in an iframe (window.parent)
    try{
      const target = window.opener || (window.parent !== window ? window.parent : null);
      if(target){
        target.postMessage({ type: 'GAME_OVER', game: 'bomb', score: score }, '*');
      }
    } catch(e){}
  }

  startBtn.addEventListener('click', startGame);
  retryBtn.addEventListener('click', startGame);

  continueBtn.addEventListener('click', () => {
    levelOverlay.classList.remove('show');
    const nextIdx = currentLevel + 1;
    showPreLevelOverlay(nextIdx, () => {
      playing = true;
      startLevel(nextIdx);
    });
  });

  // initial idle state
  qIndexEl.textContent = `QUESTION  1 / ${LEVELS[0].qCount}`;
  memeCaptionEl.textContent = "Press ARM SEQUENCE to begin.";
  timerEl.textContent = fmtTime(LEVELS[0].timeLimit);
  levelNameEl.textContent = LEVELS[0].name;
  levelDescEl.textContent = LEVELS[0].desc;
  strikes = 0;
  renderStrikesLEDs(OVERALL_MAX_STRIKES);
  updateStrikesUI();
})();