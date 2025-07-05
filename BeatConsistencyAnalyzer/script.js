console.log("Beat Consistency Analyzer script loaded.");

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startScreen = document.getElementById('start-screen');
    const playingScreen = document.getElementById('playing-screen');
    const resultsScreen = document.getElementById('results-screen');
    const historyScreen = document.getElementById('history-screen');

    // Controls & Buttons
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmValue = document.getElementById('bpm-value');
    const hitButtons = document.getElementById('hit-buttons');
    const startGameBtn = document.getElementById('start-game-btn');
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const saveResultBtn = document.getElementById('save-result-btn');
    const backToTitleBtn = document.getElementById('back-to-title-btn');
    const historyBackBtn = document.getElementById('history-back-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // Displays
    const hitCounter = document.getElementById('hit-counter');
    const totalHitsDisplay = document.getElementById('total-hits-display');
    const resultsSummary = document.querySelector('.results-summary');
    const histogramChartCtx = document.getElementById('histogram-chart').getContext('2d');
    const commentInput = document.getElementById('comment-input');
    const historyTableBody = document.getElementById('history-table-body');

    // Game & State
    let state = 'START';
    let bpm = 120;
    let totalHits = 32;
    let hitTimestamps = [];
    let lastResult = {};
    let metronomeInterval;
    let chart;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let sortState = { key: 'date', order: 'desc' };

    // --- Event Listeners ---
    bpmSlider.addEventListener('input', (e) => {
        bpm = parseInt(e.target.value, 10);
        bpmValue.textContent = bpm;
    });

    hitButtons.addEventListener('click', (e) => {
        if (e.target.classList.contains('hit-option')) {
            hitButtons.querySelectorAll('.hit-option').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            totalHits = parseInt(e.target.dataset.hits, 10);
            totalHitsDisplay.textContent = totalHits;
        }
    });

    startGameBtn.addEventListener('click', startGame);
    viewHistoryBtn.addEventListener('click', () => switchScreen('HISTORY'));
    saveResultBtn.addEventListener('click', saveResult);
    backToTitleBtn.addEventListener('click', () => switchScreen('START'));
    historyBackBtn.addEventListener('click', () => switchScreen('START'));
    clearHistoryBtn.addEventListener('click', clearAllHistory);
    document.querySelector('#history-table thead').addEventListener('click', handleSort);

    // --- State Management ---
    function switchScreen(screenName) {
        state = screenName;
        [startScreen, playingScreen, resultsScreen, historyScreen].forEach(s => s.style.display = 'none');
        document.getElementById(`${screenName.toLowerCase()}-screen`).style.display = 'flex';
        if (screenName === 'HISTORY') renderHistory();
    }

    // --- Game Logic ---
    function startGame() {
        hitTimestamps = [];
        hitCounter.textContent = 0;
        const interval = 60000 / bpm;
        if (metronomeInterval) clearInterval(metronomeInterval);
        metronomeInterval = setInterval(playBeep, interval);
        switchScreen('PLAYING');
    }

    function stopGame() {
        clearInterval(metronomeInterval);
        switchScreen('RESULTS');
        analyzeAndShowResults();
    }

    function playBeep() {
        if (!audioCtx) return;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.05);
        oscillator.stop(audioCtx.currentTime + 0.05);
    }

    function recordHit() {
        hitTimestamps.push(performance.now());
        hitCounter.textContent = hitTimestamps.length;
        if (hitTimestamps.length >= totalHits) stopGame();
    }

    function analyzeAndShowResults() {
        if (hitTimestamps.length < 2) {
            resultsSummary.textContent = "Not enough data.";
            lastResult = {};
            if(chart) chart.destroy();
            return;
        }
        const intervals = hitTimestamps.slice(1).map((t, i) => t - hitTimestamps[i]);
        const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const stdDevMs = Math.sqrt(intervals.map(x => Math.pow(x - meanInterval, 2)).reduce((a, b) => a + b, 0) / intervals.length);
        const percentageDeviations = intervals.map(interval => ((interval - meanInterval) / meanInterval) * 100);
        const stdDevPercent = Math.sqrt(percentageDeviations.map(x => Math.pow(x, 2)).reduce((a, b) => a + b, 0) / percentageDeviations.length);

        lastResult = {
            date: new Date().toISOString(),
            bpm: bpm, hits: totalHits,
            stdDevMs: stdDevMs.toFixed(2),
            stdDevPercent: stdDevPercent.toFixed(2),
            comment: ''
        };

        resultsSummary.textContent = `Stability (Std Dev): ${lastResult.stdDevPercent}% (${lastResult.stdDevMs}ms)`;
        drawHistogram(percentageDeviations);
        commentInput.value = '';
    }

    function drawHistogram(data) {
        const binEdges = [-11, -9, -7, -5, -3, -1, 1, 3, 5, 7, 9, 11];
        const labels = binEdges.slice(0, -1).map((l, i) => `${l}% to ${binEdges[i+1]}%`);
        const histogramData = new Array(binEdges.length - 1).fill(0);

        data.forEach(dev => {
            let binIndex = -1;
            for (let i = 0; i < binEdges.length - 1; i++) {
                if (dev >= binEdges[i] && dev < binEdges[i+1]) {
                    binIndex = i;
                    break;
                }
            }
            if (binIndex === -1) {
                if (dev < binEdges[0]) binIndex = 0;
                else if (dev >= binEdges[binEdges.length - 1]) binIndex = histogramData.length - 1;
            }
            if (binIndex !== -1) histogramData[binIndex]++;
        });

        if (chart) chart.destroy();
        chart = new Chart(histogramChartCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Deviation Frequency',
                    data: histogramData,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Frequency' }
                    },
                    x: {
                        title: { display: true, text: 'Deviation (%)' }
                    }
                }
            }
        });
    }

    // --- Local Storage & History Logic ---
    function getHistory() { return JSON.parse(localStorage.getItem('beatHistory')) || []; }

    function saveResult() {
        if (!lastResult.date) { alert("No result to save."); return; }
        lastResult.comment = commentInput.value;
        const history = getHistory();
        history.push(lastResult);
        localStorage.setItem('beatHistory', JSON.stringify(history));
        switchScreen('HISTORY');
    }

    function clearAllHistory() {
        if (confirm("Are you sure you want to delete all saved results?")) {
            localStorage.removeItem('beatHistory');
            renderHistory();
        }
    }

    function handleSort(e) {
        const newKey = e.target.closest('th').dataset.sort;
        if (!newKey) return;
        const order = (sortState.key === newKey && sortState.order === 'asc') ? 'desc' : 'asc';
        sortState = { key: newKey, order };
        renderHistory();
    }

    function renderHistory() {
        const history = getHistory();
        const { key, order } = sortState;
        history.sort((a, b) => {
            let valA = a[key], valB = b[key];
            if (key === 'date') { valA = new Date(valA); valB = new Date(valB); }
            else if (key !== 'comment') { valA = parseFloat(valA); valB = parseFloat(valB); }
            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
        });
        historyTableBody.innerHTML = history.map(item => `
            <tr>
                <td>${new Date(item.date).toLocaleString()}</td><td>${item.bpm}</td><td>${item.hits}</td>
                <td>${item.stdDevPercent}</td><td>${item.stdDevMs}</td><td>${item.comment || ''}</td>
            </tr>`).join('');
        document.querySelectorAll('#history-table th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === key) th.classList.add(order === 'asc' ? 'sort-asc' : 'sort-desc');
        });
    }

    // --- Global Input Handling ---
    function handleInteraction(e) {
        // Prevent default for touch events to avoid scrolling/zooming
        if (e.type === 'touchstart') {
            e.preventDefault();
        }

        // Ignore interactions on specific UI elements
        // For keydown, check if the target is an input (type text) or textarea
        if (e.type === 'keydown' && e.target.closest('input[type="text"], textarea')) {
            return;
        }
        // For mouse/touch, check if the target is a button, slider, or other control
        if ((e.type === 'mousedown' || e.type === 'touchstart') &&
            e.target.closest('button, input[type="range"], .hit-option, textarea, #comment-input, #history-table thead, #debug-log-container')) {
            return;
        }

        // State-specific logic
        if (state === 'START') {
            // In START state, any valid interaction starts the game
            startGame();
        } else if (state === 'PLAYING') {
            // In PLAYING state, any valid interaction records a hit
            recordHit();
        }
        // In RESULTS and HISTORY states, interactions are handled by specific buttons,
        // so general interactions should not trigger anything here.
    }

    // Attach the single, consolidated event listener
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction, { passive: false });
    window.addEventListener('mousedown', handleInteraction);
});
