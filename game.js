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

    // DOM elements
    this.gameContainer = document.getElementById('game-container');
    this.roundCounter = document.getElementById('round-counter');
    this.scoreText = document.getElementById('score-text');
    this.guessButtons = document.getElementById('guess-buttons');
    this.btnIntelligent = document.getElementById('btn-intelligent');
    this.btnRandom = document.getElementById('btn-random');
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

    // Initialize game
    this.generateRounds();
    this.startRound();
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

    // Generate initial state
    if (this.currentRoundData.isPrechosen) {
      // For now, use empty grid as placeholder for "intelligent design"
      this.game.clear();
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

    this.game.start();

    checkInterval = setInterval(() => {
      generation = this.game.generation;

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

    // Generate new rounds and start
    this.generateRounds();
    this.startRound();
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ConwayGuessingGame();
});
