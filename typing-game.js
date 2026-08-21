(function() {
            const bgVideo = document.getElementById('bgVideo');
            const raceAudio = document.getElementById('raceAudio');
            const raceEndedOverlay = document.getElementById('raceEndedOverlay');
            const START_VIDEO = 'startscreen.mp4';
            const MAIN_VIDEO = 'maingame.mp4';

            function switchVideo(src, enableAudio = false) {
                if (bgVideo.src !== src) {
                    bgVideo.src = src;
                    bgVideo.load();
                }
                bgVideo.muted = !enableAudio;
                bgVideo.volume = enableAudio ? 1.0 : 0.5;
                bgVideo.play().catch(() => {});
            }

            // ---- RANDOMIZED PARAGRAPHS ----
            const paragraphPool = [
                "the horizon stretches endlessly before you as the engine roars with every word you type",
                "speed and precision are the twin pillars of victory on this digital racetrack",
                "every keystroke is a step closer to the finish line of typing perfection",
                "the road ahead is long and winding but your fingers are ready for any challenge",
                "stay focused and let your typing flow like a finely tuned racing engine",
                "accuracy is the high octane fuel that keeps your race car moving forward at speed",
                "mistakes are just speed bumps on the road to greatness and glory",
                "the crowd roars with excitement as you type your way to victory and fame",
                "the finish line approaches with every word you masterfully complete",
                "your fingers dance across the keys like a champion behind the wheel",
                "the track demands precision and speed from every racer who dares to compete",
                "keep your eyes on the road and your hands ready for whatever comes next",
                "the engine purrs with satisfaction as you maintain perfect rhythm and flow",
                "every character you type brings you closer to the checkered flag of success",
                "the competition is fierce but your typing skills are sharper than ever before",
                "stay in your lane and let your accuracy speak for itself on this digital track",
                "the final lap is approaching and your fingers are ready for the sprint",
                "victory belongs to those who can maintain speed without sacrificing precision",
                "the road to glory is paved with perfectly typed words and flawless execution",
                "your journey to typing mastery continues with every race you complete"
            ];

            function shuffleArray(arr) {
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
                return arr;
            }

            function generateRandomText() {
                const shuffled = shuffleArray([...paragraphPool]);
                const selected = shuffled.slice(0, 15);
                let text = '';
                for (let i = 0; i < selected.length; i++) {
                    text += selected[i] + '. ';
                    if ((i + 1) % 3 === 0) text += '\n';
                }
                return text.trim();
            }

            const state = {
                playerName: '',
                fullText: '',
                typed: '',
                startTime: 0,
                endTime: 0,
                mistakes: 0,
                totalAttempts: 0,
                totalCorrect: 0,
                isRunning: false,
                isFinished: false,
                countdown: 3,
                raceDuration: 60,
                timerInterval: null,
                timeLeft: 60,
                audioStarted: false,
                currentEntry: null,
            };

            const typingDisplay = document.getElementById('typingDisplay');
            const typeInput = document.getElementById('type-input');
            const accuracySpan = document.getElementById('accuracyDisplay');
            const timerSpan = document.getElementById('timerDisplay');
            const endScreen = document.getElementById('endScreen');
            const raceUI = document.getElementById('raceUI');
            const countdownEl = document.getElementById('countdownDisplay');
            const nameModal = document.getElementById('nameModal');
            const playerNameInput = document.getElementById('playerNameInput');
            const startBtn = document.getElementById('startGameBtn');
            const playAgainBtn = document.getElementById('playAgainBtn');
            const leaderboardToggleBtn = document.getElementById('leaderboardToggleBtn');
            const leaderboardSection = document.getElementById('leaderboardSection');
            const finalWpm = document.getElementById('finalWpm');
            const finalAcc = document.getElementById('finalAcc');
            const finalWords = document.getElementById('finalWords');
            const finalRank = document.getElementById('finalRank');
            const racePanel = document.getElementById('racePanel');

            const STORAGE_KEY = 'forza_typing_leaderboard';
            const DISPLAY_WINDOW = 80;

            function getLeaderboard() {
                try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
            }

            function saveLeaderboard(entry) {
                const lb = getLeaderboard();
                lb.push(entry);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(lb));
                state.currentEntry = entry;
            }

            function computeRank(wpm, accuracy) {
                const lb = getLeaderboard();
                if (lb.length === 0) return 1;
                const sorted = [...lb].sort((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy);
                let rank = 1;
                for (let i = 0; i < sorted.length; i++) {
                    if (sorted[i].wpm > wpm || (sorted[i].wpm === wpm && sorted[i].accuracy > accuracy)) rank++;
                }
                return rank;
            }

            function renderLeaderboard(highlightName) {
                const lb = getLeaderboard();
                if (lb.length === 0) {
                    leaderboardSection.innerHTML =
                        '<div style="padding:0.6rem; color:rgba(255,255,255,0.5); font-family:Rajdhani;">No racers yet. Be the first!</div>';
                    return;
                }
                const sorted = [...lb].sort((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy);
                let html = '';
                sorted.forEach((entry, idx) => {
                    const isHighlight = highlightName && entry.name === highlightName &&
                                       entry.wpm === state.currentEntry?.wpm &&
                                       entry.accuracy === state.currentEntry?.accuracy &&
                                       entry.timestamp === state.currentEntry?.timestamp;
                    const cls = isHighlight ? 'lb-entry highlight' : 'lb-entry';
                    html += `<div class="${cls}">
                        <span class="rank">#${idx+1}</span>
                        <span class="name">${entry.name || 'Anonymous'}</span>
                        <span class="score">${entry.wpm} WPM · ${entry.accuracy}%</span>
                    </div>`;
                });
                leaderboardSection.innerHTML = html;
            }

            function refreshTextDisplay() {
                const text = state.fullText;
                const typed = state.typed;
                const typedLen = typed.length;

                let start = Math.max(0, typedLen - 20);
                let end = Math.min(text.length, start + DISPLAY_WINDOW);
                if (end < typedLen + 10 && end < text.length) end = Math.min(text.length, end + 30);

                let html = '';
                for (let i = start; i < end; i++) {
                    let ch = text[i];
                    let cls = 'pending';
                    if (i < typedLen) {
                        cls = (typed[i] === ch) ? 'correct' : 'incorrect';
                    }
                    if (ch === '\n') {
                        html += `<span class="${cls}">↵</span><br>`;
                    } else {
                        html += `<span class="${cls}">${ch}</span>`;
                    }
                }
                if (end < text.length) {
                    html += `<span style="color:rgba(255,255,255,0.2);"> ...</span>`;
                }
                typingDisplay.innerHTML = html;
                const activeSpan = typingDisplay.querySelector('.correct, .incorrect');
                if (activeSpan) activeSpan.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }

            function showRaceEndedPopup() {
                raceEndedOverlay.classList.add('show');
                setTimeout(() => raceEndedOverlay.classList.remove('show'), 3000);
            }

            function updateAccuracyDisplay() {
                let accuracy = state.totalAttempts === 0 ? 100 : Math.round((state.totalCorrect / state.totalAttempts) * 100);
                if (accuracy < 0) accuracy = 0;
                accuracySpan.textContent = accuracy + '%';
            }

            function startRace() {
                state.fullText = generateRandomText();
                state.typed = '';
                state.mistakes = 0;
                state.totalAttempts = 0;
                state.totalCorrect = 0;
                state.isRunning = false;
                state.isFinished = false;
                state.startTime = 0;
                state.endTime = 0;
                state.timeLeft = state.raceDuration;
                state.audioStarted = false;
                state.currentEntry = null;
                timerSpan.textContent = '1:00';
                timerSpan.classList.remove('timer-tremble');
                accuracySpan.textContent = '100%';
                endScreen.style.display = 'none';
                raceUI.style.display = 'block';
                typeInput.disabled = true;
                typeInput.value = '';
                leaderboardSection.style.display = 'none';
                raceEndedOverlay.classList.remove('show');

                raceAudio.pause();
                raceAudio.currentTime = 0;
                switchVideo(MAIN_VIDEO, false);

                let count = 3;
                countdownEl.style.display = 'block';
                countdownEl.textContent = '3';
                typeInput.disabled = true;

                raceAudio.currentTime = 0;
                raceAudio.volume = 1.0;
                const playPromise = raceAudio.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => { state.audioStarted = true; }).catch(() => {});
                }

                const countInterval = setInterval(() => {
                    count--;
                    if (count === 0) {
                        clearInterval(countInterval);
                        countdownEl.textContent = 'GO!';
                        setTimeout(() => {
                            countdownEl.style.display = 'none';
                            state.isRunning = true;
                            state.startTime = performance.now();
                            typeInput.disabled = false;
                            typeInput.focus();
                            refreshTextDisplay();
                            state.typed = '';
                            updateAccuracyDisplay();
                            if (state.timerInterval) clearInterval(state.timerInterval);
                            state.timerInterval = setInterval(() => {
                                state.timeLeft--;
                                const mins = Math.floor(state.timeLeft / 60);
                                const secs = state.timeLeft % 60;
                                timerSpan.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                                if (state.timeLeft <= 10) timerSpan.classList.add('timer-tremble');
                                else timerSpan.classList.remove('timer-tremble');
                                if (state.timeLeft <= 0) {
                                    clearInterval(state.timerInterval);
                                    if (state.isRunning) finishRace();
                                }
                            }, 1000);
                        }, 400);
                    } else {
                        countdownEl.textContent = count;
                    }
                }, 1000);
            }

            function handleTyping(e) {
                if (!state.isRunning || state.isFinished) return;
                const input = typeInput;
                const raw = input.value;
                const text = state.fullText;

                // Handle backspace
                if (raw.length < state.typed.length) {
                    state.typed = raw;
                    refreshTextDisplay();
                    return;
                }

                // Check if new character is correct
                const nextIndex = raw.length - 1;
                if (nextIndex >= 0 && raw[nextIndex] !== text[nextIndex]) {
                    // WRONG KEY PRESSED - Count it as a mistake!
                    state.totalAttempts++;
                    state.mistakes++;
                    triggerErrorEffects();
                    typeInput.value = state.typed; // revert the wrong character
                    updateAccuracyDisplay();
                    return;
                }

                // CORRECT KEY PRESSED
                if (nextIndex >= 0) {
                    state.totalAttempts++;
                    state.totalCorrect++;
                    state.typed = raw;
                    refreshTextDisplay();
                    updateAccuracyDisplay();
                }

                // Add more text if needed
                if (state.typed.length > state.fullText.length - 50) {
                    state.fullText += ' ' + generateRandomText();
                    refreshTextDisplay();
                }
            }

            function triggerErrorEffects() {
                racePanel.classList.remove('shake', 'flash-red');
                void racePanel.offsetWidth;
                racePanel.classList.add('shake', 'flash-red');
                setTimeout(() => racePanel.classList.remove('shake', 'flash-red'), 250);
                typeInput.style.transform = 'scale(0.98)';
                setTimeout(() => typeInput.style.transform = '', 120);
            }

            function finishRace() {
                if (state.isFinished) return;
                state.isFinished = true;
                state.isRunning = false;
                state.endTime = performance.now();
                typeInput.disabled = true;
                if (state.timerInterval) clearInterval(state.timerInterval);
                timerSpan.classList.remove('timer-tremble');

                showRaceEndedPopup();

                raceAudio.pause();
                raceAudio.currentTime = 0;

                const elapsed = (state.endTime - state.startTime) / 1000;
                const wordsTyped = state.totalCorrect / 5;
                const minutes = elapsed / 60;
                let wpm = minutes > 0 ? Math.round(wordsTyped / minutes) : 0;

                let accuracy = state.totalAttempts === 0 ? 100 : Math.round((state.totalCorrect / state.totalAttempts) * 100);
                if (accuracy < 0) accuracy = 0;

                const entry = {
                    name: state.playerName || 'Racer',
                    wpm: wpm,
                    accuracy: accuracy,
                    words: Math.round(wordsTyped),
                    timestamp: Date.now()
                };
                saveLeaderboard(entry);

                raceUI.style.display = 'none';
                endScreen.style.display = 'flex';
                finalWpm.textContent = wpm;
                finalAcc.textContent = accuracy + '%';
                finalWords.textContent = Math.round(wordsTyped);
                const rank = computeRank(wpm, accuracy);
                finalRank.textContent = '#' + rank;

                const titleEl = document.querySelector('.end-screen h2');
                titleEl.innerHTML = rank === 1 ? '🏆 RACE FINISHED' : '🏁 RACE FINISHED';

                renderLeaderboard(entry.name);
                leaderboardSection.style.display = 'block';
                switchVideo(START_VIDEO, true);

                // Report this run's score up to the arcade launcher (if embedded in one).
                // Composite score = WPM weighted by accuracy, so a fast-but-sloppy run
                // doesn't automatically beat a slower-but-precise one.
                const arcadeScore = Math.round(wpm * (accuracy / 100));
                try {
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({ type: 'GAME_OVER', game: 'typing', score: arcadeScore, meta: { wpm, accuracy } }, '*');
                    }
                } catch (e) {}
            }

            function initGame(name) {
                state.playerName = name.trim() || 'Racer';
                nameModal.style.display = 'none';
                startRace();
            }

            startBtn.addEventListener('click', () => {
                const name = playerNameInput.value.trim() || 'Racer';
                initGame(name);
            });
            playerNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') startBtn.click(); });

            playAgainBtn.addEventListener('click', () => {
                endScreen.style.display = 'none';
                raceUI.style.display = 'block';
                leaderboardSection.style.display = 'none';
                nameModal.style.display = 'flex';
                playerNameInput.value = state.playerName || '';
                playerNameInput.focus();
                typeInput.value = '';
                typingDisplay.innerHTML = '';
                accuracySpan.textContent = '100%';
                timerSpan.textContent = '1:00';
                if (state.timerInterval) clearInterval(state.timerInterval);
                state.isRunning = false;
                state.isFinished = false;
                typeInput.disabled = true;
                raceAudio.pause();
                raceAudio.currentTime = 0;
                switchVideo(START_VIDEO, true);
            });

            leaderboardToggleBtn.addEventListener('click', () => {
                if (leaderboardSection.style.display === 'none' || leaderboardSection.style.display === '') {
                    renderLeaderboard(state.currentEntry?.name);
                    leaderboardSection.style.display = 'block';
                    switchVideo(START_VIDEO, true);
                } else {
                    leaderboardSection.style.display = 'none';
                }
            });

            typeInput.addEventListener('input', handleTyping);

            switchVideo(START_VIDEO, true);
            leaderboardSection.style.display = 'none';
            playerNameInput.focus();

            document.addEventListener('click', function enableAudio() {
                if (bgVideo.muted) {
                    bgVideo.muted = false;
                    bgVideo.volume = 1.0;
                }
                document.removeEventListener('click', enableAudio);
            }, { once: true });
        })();