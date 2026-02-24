/**
 * Conway's Game of Life - Guessing Game Logic
 */

class ConwayGuessingGame {
  constructor() {
    // Game state
    this.currentRound = 0;
    this.totalRounds = GAME_CONFIG.TOTAL_ROUNDS;
    this.correctGuesses = 0;
    this.rounds = [];
    this.currentRoundData = null;
    this.prechosenPatterns = [];
    this.patternsLoaded = false;

    // DOM elements
    this.gameContainer = document.getElementById('game-container');
    this.roundCounter = document.getElementById('round-counter');
    this.scoreText = document.getElementById('score-text');
    this.guessButtons = document.getElementById('guess-buttons');
    this.btnIntelligent = document.getElementById('btn-intelligent');
    this.btnRandom = document.getElementById('btn-random');
    this.probabilityDisplay = document.getElementById('probability-display');
    this.probabilityText = document.getElementById('probability-text');
    this.revealPanel = document.getElementById('reveal-panel');
    this.revealTitle = document.getElementById('reveal-title');
    this.revealStats = document.getElementById('reveal-stats');
    this.btnNextRound = document.getElementById('btn-next-round');
    this.finalScorePanel = document.getElementById('final-score-panel');
    this.finalScoreValue = document.getElementById('final-score-value');
    this.finalScoreMessage = document.getElementById('final-score-message');
    this.playAgainBtn = document.getElementById('play-again-btn');

    // Conway game instance
    this.game = new ConwayGame(this.gameContainer, {
      width: GAME_CONFIG.GRID_WIDTH,
      height: GAME_CONFIG.GRID_HEIGHT,
      cellSize: 6,
      updateInterval: GAME_CONFIG.PLAYBACK_SPEED,
      autoStart: false,
      cellColor: '#00ff00',
      detectStability: true
    });

    // Event listeners
    this.btnIntelligent.addEventListener('click', () => this.makeGuess('intelligent'));
    this.btnRandom.addEventListener('click', () => this.makeGuess('random'));
    this.btnNextRound.addEventListener('click', () => this.startRound());
    this.playAgainBtn.addEventListener('click', () => this.resetGame());

    // Initialize game - load patterns then start
    this.initialize();
  }

  initialize() {
    // Load patterns from inlined JavaScript
    this.loadPrechosenPatterns();
    this.generateRounds();
    this.startRound();
  }

  loadPrechosenPatterns() {
    // Use patterns from prechosen-patterns.js (loaded globally)
    if (typeof PRECHOSEN_PATTERNS !== 'undefined' && Array.isArray(PRECHOSEN_PATTERNS)) {
      this.prechosenPatterns = PRECHOSEN_PATTERNS;
      this.patternsLoaded = true;
      console.log(`Loaded ${this.prechosenPatterns.length} prechosen patterns`);
    } else {
      console.error('PRECHOSEN_PATTERNS not found or invalid');
      this.prechosenPatterns = [];
      this.patternsLoaded = false;
    }
  }

  /**
   * Calculate gamma function using Lanczos approximation
   * More accurate than Stirling for our range
   */
  gammaFunction(z) {
    // Lanczos coefficients for g=7
    const g = 7;
    const coef = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];

    if (z < 0.5) {
      // Use reflection formula: Γ(z) * Γ(1-z) = π / sin(πz)
      return Math.PI / (Math.sin(Math.PI * z) * this.gammaFunction(1 - z));
    }

    z -= 1;
    let x = coef[0];
    for (let i = 1; i < g + 2; i++) {
      x += coef[i] / (z + i);
    }

    const t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }

  /**
   * Calculate lower incomplete gamma function γ(s, x)
   * Using series expansion
   */
  lowerIncompleteGamma(s, x) {
    if (x <= 0) return 0;
    if (x > 1e5) return this.gammaFunction(s); // Approximation for large x

    // Series expansion
    let sum = 0;
    let term = 1 / s;
    sum += term;

    for (let n = 1; n < 100; n++) {
      term *= x / (s + n);
      sum += term;
      if (Math.abs(term) < 1e-10) break;
    }

    return Math.pow(x, s) * Math.exp(-x) * sum;
  }

  /**
   * Calculate survival probability: P(X >= generation)
   * For gamma distribution with given shape and scale
   */
  calculateSurvivalProbability(generation) {
    const k = GAME_CONFIG.GAMMA_SHAPE;
    const theta = GAME_CONFIG.GAMMA_SCALE;

    if (generation <= 0) return 1.0;

    // Standardize: x' = generation / theta
    const x = generation / theta;

    // CDF = γ(k, x) / Γ(k)
    const gamma_k = this.gammaFunction(k);
    const lower_incomplete = this.lowerIncompleteGamma(k, x);
    const cdf = lower_incomplete / gamma_k;

    // Survival function = 1 - CDF
    const survival = 1 - cdf;

    return Math.max(0, Math.min(1, survival)); // Clamp to [0, 1]
  }

  /**
   * Update probability display with current generation
   */
  updateProbabilityDisplay(generation) {
    const probability = this.calculateSurvivalProbability(generation);
    const percentage = (probability * 100).toFixed(1);

    this.probabilityText.textContent = `Gen ${generation}: ${percentage}% of random worlds reach this far`;

    // Color based on probability
    if (probability > 0.5) {
      this.probabilityText.style.color = '#00ff00';
    } else if (probability > 0.2) {
      this.probabilityText.style.color = '#ffbb00';
    } else {
      this.probabilityText.style.color = '#ff6600';
    }
  }

  generateRounds() {
    // Pre-generate all rounds
    this.rounds = [];
    for (let i = 0; i < this.totalRounds; i++) {
      const isPrechosen = Math.random() < GAME_CONFIG.PRECHOSEN_PROBABILITY;
      this.rounds.push({
        type: isPrechosen ? 'intelligent' : 'random',
        isPrechosen: isPrechosen
      });
    }
  }

  startRound() {
    if (this.currentRound >= this.totalRounds) {
      this.showFinalScore();
      return;
    }

    this.currentRound++;
    this.currentRoundData = this.rounds[this.currentRound - 1];

    // Update UI
    this.roundCounter.textContent = `Round ${this.currentRound}/${this.totalRounds}`;
    this.revealPanel.classList.remove('show');
    this.btnNextRound.style.display = 'none';
    this.btnIntelligent.disabled = false;
    this.btnRandom.disabled = false;
    this.guessButtons.style.display = 'flex';
    this.probabilityDisplay.style.display = 'none';

    // Generate initial state
    if (this.currentRoundData.isPrechosen) {
      // Select random pattern from loaded prechosen patterns
      if (this.prechosenPatterns.length > 0) {
        const randomIndex = Math.floor(Math.random() * this.prechosenPatterns.length);
        const selectedPattern = this.prechosenPatterns[randomIndex];
        this.currentRoundData.patternId = selectedPattern.id;
        this.game.setGrid(selectedPattern.initialGrid);
      } else {
        // Fallback to empty grid if no patterns loaded
        this.game.clear();
      }
    } else {
      // Random initial state
      this.game.randomize(GAME_CONFIG.RANDOM_DENSITY);
    }

    this.game.stop();
    this.game.render();
  }

  makeGuess(guess) {
    // Record guess
    this.currentRoundData.guess = guess;

    // Disable buttons
    this.btnIntelligent.disabled = true;
    this.btnRandom.disabled = true;

    // Start auto-playback with stability detection
    this.runSimulation();
  }

  runSimulation() {
    let generation = 0;
    let checkInterval;

    // Show probability display
    this.probabilityDisplay.style.display = 'block';
    this.updateProbabilityDisplay(0);

    this.game.start();

    checkInterval = setInterval(() => {
      generation = this.game.generation;

      // Update probability display
      this.updateProbabilityDisplay(generation);

      // Check if stable
      if (this.game.isStable) {
        this.game.stop();
        clearInterval(checkInterval);
        this.revealResult(true, generation);
        return;
      }

      // Check if max generations reached
      if (generation >= GAME_CONFIG.MAX_GENERATIONS) {
        this.game.stop();
        clearInterval(checkInterval);
        this.revealResult(false, generation);
        return;
      }
    }, 100);
  }

  revealResult(stabilized, generation) {
    const isCorrect = this.currentRoundData.guess === this.currentRoundData.type;

    if (isCorrect) {
      this.correctGuesses++;
    }

    // Update score
    this.scoreText.textContent = `Score: ${this.correctGuesses}/${this.currentRound}`;

    // Build reveal message
    const actualType = this.currentRoundData.type === 'intelligent' ? 'Intelligent Design' : 'Random';
    const resultText = isCorrect ? '✓ Correct!' : '✗ Incorrect';

    this.revealTitle.textContent = resultText;
    this.revealTitle.className = 'reveal-title ' + (isCorrect ? 'correct' : 'incorrect');

    // Build stats
    let statsHTML = `<div><strong>Actual:</strong> ${actualType}</div>`;

    if (stabilized) {
      const periodText = this.game.period === 1 ? 'Still Life' : `Oscillator (Period ${this.game.period})`;
      statsHTML += `<div><strong>Stability:</strong> ${periodText}</div>`;
      statsHTML += `<div><strong>Generations to Stability:</strong> ${this.game.stableGeneration}</div>`;
    } else {
      statsHTML += `<div><strong>Stability:</strong> Did not stabilize</div>`;
      statsHTML += `<div style="color: #ff6600;">This world may not stabilize.</div>`;
    }

    statsHTML += `<div><strong>Total Generations:</strong> ${generation}</div>`;

    this.revealStats.innerHTML = statsHTML;
    this.revealPanel.classList.add('show');

    // Show next round button
    this.btnNextRound.style.display = 'inline-block';
  }

  showFinalScore() {
    // Hide game UI
    this.guessButtons.style.display = 'none';
    this.revealPanel.classList.remove('show');

    // Calculate stats
    const percentage = Math.round((this.correctGuesses / this.totalRounds) * 100);
    const prechosenCount = this.rounds.filter(r => r.isPrechosen).length;
    const randomCount = this.totalRounds - prechosenCount;

    // Display final score
    this.finalScoreValue.textContent = `${this.correctGuesses}/${this.totalRounds} (${percentage}%)`;

    // Generate message based on performance
    let message = '';
    if (percentage === 100) {
      message = '🎉 Perfect score! You have mastered pattern recognition!';
    } else if (percentage >= 80) {
      message = '🌟 Excellent work! You have a keen eye for design.';
    } else if (percentage >= 60) {
      message = '👍 Good job! You\'re getting the hang of it.';
    } else if (percentage >= 40) {
      message = '🤔 Not bad, but there\'s room for improvement.';
    } else {
      message = '💭 Keep practicing! Pattern recognition takes time.';
    }

    message += `<br><br>There were <strong>${prechosenCount}</strong> intelligently designed and <strong>${randomCount}</strong> random patterns.`;

    this.finalScoreMessage.innerHTML = message;
    this.finalScorePanel.classList.add('show');
  }

  resetGame() {
    // Reset state
    this.currentRound = 0;
    this.correctGuesses = 0;
    this.rounds = [];
    this.currentRoundData = null;

    // Hide final score
    this.finalScorePanel.classList.remove('show');

    // Reset score display
    this.scoreText.textContent = 'Score: 0/0';

    // Reinitialize
    this.initialize();
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ConwayGuessingGame();
});
