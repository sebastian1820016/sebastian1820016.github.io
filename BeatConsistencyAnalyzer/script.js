console.log("Beat Consistency Analyzer script loaded.");

// Basic structure to be filled in later
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startScreen = document.getElementById('start-screen');
    const playingScreen = document.getElementById('playing-screen');
    const resultsScreen = document.getElementById('results-screen');

    // Controls
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmValue = document.getElementById('bpm-value');
    const hitButtons = document.getElementById('hit-buttons');

    // Displays
    const hitCounter = document.getElementById('hit-counter');
    const totalHitsDisplay = document.getElementById('total-hits-display');
    const resultsSummary = document.querySelector('.results-summary');
    const histogramChartCtx = document.getElementById('histogram-chart').getContext('2d');

    // Game State
    let state = 'START'; // START, PLAYING, RESULTS
    let bpm = 120;
    let totalHits = 32;
    let hitTimestamps = [];
    let metronomeInterval;
    let chart;
    // Audio Context for metronome beep
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // --- Debugging ---
    const DEBUG = false; // Set to true to enable debug logging
    const debugLogElement = document.getElementById('debug-log');
    const debugLogContainer = document.getElementById('debug-log-container');
    const copyLogBtn = document.getElementById('copy-log-btn');

    if (DEBUG) {
        debugLogContainer.style.display = 'block';
    } else {
        debugLogContainer.style.display = 'none';
    }

    function logDebug(message) {
        if (DEBUG) {
            console.log(message);
            if (debugLogElement) {
                const p = document.createElement('p');
                p.textContent = message;
                debugLogElement.appendChild(p);
                debugLogElement.scrollTop = debugLogElement.scrollHeight; // Auto-scroll
            }
        }
    }

    // Copy log to clipboard
    if (copyLogBtn) {
        copyLogBtn.addEventListener('click', () => {
            const logText = debugLogElement.innerText;
            navigator.clipboard.writeText(logText).then(() => {
                alert('Debug log copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy log: ', err);
                alert('Failed to copy log.');
            });
        });
    }

    logDebug("Script loaded. Debugging enabled.");

    // --- UI Event Listeners ---

    // BPM Slider
    bpmSlider.addEventListener('input', (e) => {
        bpm = parseInt(e.target.value, 10);
        bpmValue.textContent = bpm;
        logDebug(`BPM changed to: ${bpm}`);
    });

    // Hit Count Buttons
    hitButtons.addEventListener('click', (e) => {
        if (e.target.classList.contains('hit-option')) {
            hitButtons.querySelectorAll('.hit-option').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            totalHits = parseInt(e.target.dataset.hits, 10);
            totalHitsDisplay.textContent = totalHits;
            logDebug(`Total Hits changed to: ${totalHits}`);
        }
    });

    // --- State Management ---
    function switchScreen(screenName) {
        logDebug(`Switching screen to: ${screenName}`);
        
        // Hide all screens first
        startScreen.style.display = 'none';
        playingScreen.style.display = 'none';
        resultsScreen.style.display = 'none';

        // Show the target screen
        if (screenName === 'START') {
            state = 'START';
            startScreen.style.display = 'flex';
            logDebug("State: START");
        } else if (screenName === 'PLAYING') {
            state = 'PLAYING';
            playingScreen.style.display = 'flex';
            startGame();
            logDebug("State: PLAYING");
        } else if (screenName === 'RESULTS') {
            state = 'RESULTS';
            resultsScreen.style.display = 'flex';
            logDebug(`State: RESULTS`);
        }
    }

    // --- Game Logic ---
    function playBeep() {
        if (!audioCtx) return;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A4
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.05);
        oscillator.stop(audioCtx.currentTime + 0.05);
        logDebug("Beep played.");
    }

    function startGame() {
        logDebug(`Starting game with BPM: ${bpm}, Hits: ${totalHits}`);
        hitTimestamps = [];
        hitCounter.textContent = 0;
        
        // Start metronome
        const interval = 60000 / bpm;
        if (metronomeInterval) clearInterval(metronomeInterval);
        metronomeInterval = setInterval(playBeep, interval);
        logDebug(`Metronome started with interval: ${interval}ms`);
    }

    function stopGame() {
        logDebug("Stopping game.");
        clearInterval(metronomeInterval);
        switchScreen('RESULTS'); // 画面を先に切り替える
        analyzeAndShowResults(); // その後、分析と描画を行う
    }

    function analyzeAndShowResults() {
        logDebug("Analyzing results...");
        if (hitTimestamps.length < 2) {
            resultsSummary.textContent = "Not enough data for analysis.";
            logDebug("Not enough data for analysis.");
            return;
        }

        // Calculate intervals
        const intervals = [];
        for (let i = 1; i < hitTimestamps.length; i++) {
            intervals.push(hitTimestamps[i] - hitTimestamps[i - 1]);
        }
        logDebug(`Calculated intervals: ${intervals.length} items`);

        // Basic stats
        const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const stdDevMs = Math.sqrt(intervals.map(x => Math.pow(x - meanInterval, 2)).reduce((a, b) => a + b, 0) / intervals.length);
        logDebug(`Mean Interval: ${meanInterval.toFixed(2)}ms, Std Dev (ms): ${stdDevMs.toFixed(2)}ms`);

        // Percentage deviations
        const percentageDeviations = intervals.map(interval => ((interval - meanInterval) / meanInterval) * 100);
        const stdDevPercent = Math.sqrt(percentageDeviations.map(x => Math.pow(x, 2)).reduce((a, b) => a + b, 0) / percentageDeviations.length);
        logDebug(`Std Dev (%): ${stdDevPercent.toFixed(2)}%`);

        // Update summary text
        resultsSummary.textContent = `Stability (Std Dev): ${stdDevPercent.toFixed(2)}% (${stdDevMs.toFixed(2)}ms)`;
        logDebug("Results summary updated.");

        // Create histogram data
        const binEdges = [-11, -9, -7, -5, -3, -1, 1, 3, 5, 7, 9, 11]; // Corresponds to np.arange(-11, 11.01, 2)
        const labels = binEdges.slice(0, -1).map((lower, i) => `${lower}% to ${binEdges[i+1]}%`);
        const histogramData = new Array(binEdges.length - 1).fill(0);

        percentageDeviations.forEach(dev => {
            let binIndex = -1;
            for (let i = 0; i < binEdges.length - 1; i++) {
                if (dev >= binEdges[i] && dev < binEdges[i+1]) {
                    binIndex = i;
                    break;
                }
            }

            // Handle values outside the defined range [-11, 11)
            if (binIndex === -1) {
                if (dev < binEdges[0]) {
                    // Value is less than the first bin edge, assign to the first bin
                    binIndex = 0;
                } else if (dev >= binEdges[binEdges.length - 1]) {
                    // Value is greater than or equal to the last bin edge, assign to the last bin
                    binIndex = binEdges.length - 2; // Last valid bin index
                }
            }

            if (binIndex !== -1) {
                histogramData[binIndex]++;
            }
        });
        logDebug(`Histogram data created: ${histogramData}`);

        // Draw chart
        if (chart) {
            chart.destroy();
            logDebug("Previous chart destroyed.");
        }
        try {
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
            logDebug("Chart drawn.");
        } catch (error) {
            logDebug(`Error drawing chart: ${error.message}`);
        }
    }

    function recordHit() {
        const timestamp = performance.now();
        hitTimestamps.push(timestamp);
        hitCounter.textContent = hitTimestamps.length;
        logDebug(`Hit recorded: ${hitTimestamps.length}/${totalHits} at ${timestamp.toFixed(2)}ms`);

        if (hitTimestamps.length >= totalHits) {
            logDebug("Total hits reached. Stopping game.");
            stopGame();
        }
    }

    // --- Global Event Listeners ---
    window.addEventListener('keydown', (e) => {
        logDebug(`Keydown event: ${e.key}, State: ${state}`);
        if (state === 'RESULTS') {
            if (e.key === 'Enter') {
                switchScreen('START');
            }
            return; // Ignore other keys on results screen
        }

        // Common logic for START and PLAYING
        const excludedKeys = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock', 'Tab'];
        if (excludedKeys.includes(e.key)) {
            logDebug(`Excluded key pressed: ${e.key}`);
            return;
        }

        if (state === 'START') {
            switchScreen('PLAYING');
        } else if (state === 'PLAYING') {
            recordHit();
        }
    });
});