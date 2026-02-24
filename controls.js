/**
 * Conway's Game of Life - Optional UI Controls
 * Modular control panel that hooks into a ConwayGame instance
 */
class ConwayControls {
  constructor(game, container, options = {}) {
    this.game = game;
    this.container = container;

    this.config = {
      showPlayPause: options.showPlayPause !== false,
      showStep: options.showStep !== false,
      showReset: options.showReset !== false,
      showRandomize: options.showRandomize !== false,
      showSpeed: options.showSpeed !== false,
      showGeneration: options.showGeneration !== false,
      showStability: options.showStability !== false,
      minSpeed: options.minSpeed || 10,
      maxSpeed: options.maxSpeed || 1000,
      defaultSpeed: options.defaultSpeed || this.game.config.updateInterval
    };

    this.elements = {};
    this.updateIntervalId = null;

    this.createControls();
    this.attachEventListeners();
    this.startUpdateLoop();
  }

  createControls() {
    // Create control panel container
    this.controlPanel = document.createElement('div');
    this.controlPanel.className = 'conway-controls';

    // Play/Pause button
    if (this.config.showPlayPause) {
      this.elements.playPauseBtn = document.createElement('button');
      this.elements.playPauseBtn.className = 'conway-btn play-pause';
      this.elements.playPauseBtn.textContent = this.game.running ? 'Pause' : 'Play';
      this.controlPanel.appendChild(this.elements.playPauseBtn);
    }

    // Step button
    if (this.config.showStep) {
      this.elements.stepBtn = document.createElement('button');
      this.elements.stepBtn.className = 'conway-btn step';
      this.elements.stepBtn.textContent = 'Step';
      this.controlPanel.appendChild(this.elements.stepBtn);
    }

    // Reset button
    if (this.config.showReset) {
      this.elements.resetBtn = document.createElement('button');
      this.elements.resetBtn.className = 'conway-btn reset';
      this.elements.resetBtn.textContent = 'Reset';
      this.controlPanel.appendChild(this.elements.resetBtn);
    }

    // Randomize button
    if (this.config.showRandomize) {
      this.elements.randomizeBtn = document.createElement('button');
      this.elements.randomizeBtn.className = 'conway-btn randomize';
      this.elements.randomizeBtn.textContent = 'Randomize';
      this.controlPanel.appendChild(this.elements.randomizeBtn);
    }

    // Speed control
    if (this.config.showSpeed) {
      const speedContainer = document.createElement('div');
      speedContainer.className = 'conway-speed-control';

      const speedLabel = document.createElement('label');
      speedLabel.textContent = 'Speed: ';
      speedLabel.className = 'conway-label';

      this.elements.speedSlider = document.createElement('input');
      this.elements.speedSlider.type = 'range';
      this.elements.speedSlider.className = 'conway-slider';
      this.elements.speedSlider.min = this.config.minSpeed;
      this.elements.speedSlider.max = this.config.maxSpeed;
      this.elements.speedSlider.value = this.config.defaultSpeed;

      this.elements.speedValue = document.createElement('span');
      this.elements.speedValue.className = 'conway-speed-value';
      this.elements.speedValue.textContent = `${this.config.defaultSpeed}ms`;

      speedLabel.appendChild(this.elements.speedSlider);
      speedLabel.appendChild(this.elements.speedValue);
      speedContainer.appendChild(speedLabel);
      this.controlPanel.appendChild(speedContainer);
    }

    // Generation counter
    if (this.config.showGeneration) {
      this.elements.generationDisplay = document.createElement('div');
      this.elements.generationDisplay.className = 'conway-generation';
      this.elements.generationDisplay.textContent = `Generation: ${this.game.generation}`;
      this.controlPanel.appendChild(this.elements.generationDisplay);
    }

    // Stability indicator
    if (this.config.showStability) {
      this.elements.stabilityDisplay = document.createElement('div');
      this.elements.stabilityDisplay.className = 'conway-stability';
      this.elements.stabilityDisplay.textContent = 'Running';
      this.controlPanel.appendChild(this.elements.stabilityDisplay);
    }

    this.container.appendChild(this.controlPanel);
  }

  attachEventListeners() {
    // Play/Pause
    if (this.elements.playPauseBtn) {
      this.elements.playPauseBtn.addEventListener('click', () => {
        if (this.game.running) {
          this.game.stop();
        } else {
          this.game.start();
        }
        this.updatePlayPauseButton();
      });
    }

    // Step
    if (this.elements.stepBtn) {
      this.elements.stepBtn.addEventListener('click', () => {
        this.game.stop();
        this.game.step();
        this.updatePlayPauseButton();
      });
    }

    // Reset
    if (this.elements.resetBtn) {
      this.elements.resetBtn.addEventListener('click', () => {
        this.game.reset();
        this.updatePlayPauseButton();
      });
    }

    // Randomize
    if (this.elements.randomizeBtn) {
      this.elements.randomizeBtn.addEventListener('click', () => {
        this.game.randomize();
        this.updatePlayPauseButton();
      });
    }

    // Speed slider
    if (this.elements.speedSlider) {
      this.elements.speedSlider.addEventListener('input', (e) => {
        const speed = parseInt(e.target.value);
        this.game.setSpeed(speed);
        this.elements.speedValue.textContent = `${speed}ms`;
      });
    }
  }

  updatePlayPauseButton() {
    if (this.elements.playPauseBtn) {
      this.elements.playPauseBtn.textContent = this.game.running ? 'Pause' : 'Play';
    }
  }

  updateGenerationDisplay() {
    if (this.elements.generationDisplay) {
      this.elements.generationDisplay.textContent = `Generation: ${this.game.generation}`;
    }
  }

  updateStabilityDisplay() {
    if (this.elements.stabilityDisplay) {
      if (this.game.isStable) {
        if (this.game.period === 1) {
          this.elements.stabilityDisplay.textContent = `Stable (Still Life) - Gen ${this.game.stableGeneration}`;
          this.elements.stabilityDisplay.className = 'conway-stability stable';
        } else {
          this.elements.stabilityDisplay.textContent = `Stable (Period: ${this.game.period}) - Gen ${this.game.stableGeneration}`;
          this.elements.stabilityDisplay.className = 'conway-stability stable';
        }
      } else {
        this.elements.stabilityDisplay.textContent = 'Running';
        this.elements.stabilityDisplay.className = 'conway-stability';
      }
    }
  }

  startUpdateLoop() {
    // Update displays periodically
    this.updateIntervalId = setInterval(() => {
      this.updateGenerationDisplay();
      this.updateStabilityDisplay();
    }, 50);
  }

  destroy() {
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
    }
    if (this.controlPanel && this.controlPanel.parentNode) {
      this.controlPanel.parentNode.removeChild(this.controlPanel);
    }
  }
}

// Export for use in modules or direct script inclusion
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConwayControls;
}
