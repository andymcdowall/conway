/**
 * Conway's Game of Life Simulator
 * A self-contained, reusable component for running Conway's Game of Life
 * No UI controls - pure game logic and rendering
 */
class ConwayGame {
  constructor(container, options = {}) {
    this.container = container;

    // Configuration
    this.config = {
      width: options.width || 100,
      height: options.height || 100,
      cellSize: options.cellSize || 5,
      updateInterval: options.updateInterval || 100, // ms
      initialPattern: options.initialPattern || null,
      autoStart: options.autoStart !== undefined ? options.autoStart : true,
      backgroundColor: options.backgroundColor || '#1a1a1a',
      cellColor: options.cellColor || '#00ff00',
      detectStability: options.detectStability !== false,
      stopWhenStable: options.stopWhenStable || false,
      maxHistorySize: options.maxHistorySize || 20,
      onStable: options.onStable || null
    };

    // State
    this.grid = null;
    this.initialGrid = null; // Store initial state for reset
    this.generation = 0;
    this.running = false;
    this.intervalId = null;

    // Stability detection
    this.isStable = false;
    this.period = 0; // 0 = not stable, 1 = still life, 2+ = oscillator
    this.stableGeneration = 0; // Generation when stability was first detected
    this.stateHistory = []; // Circular buffer of grid hashes
    this.previousGrid = null; // For quick period-1 detection

    // Setup
    this.setupCanvas();
    this.initialize();

    if (this.config.autoStart) {
      this.start();
    }
  }

  setupCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.width * this.config.cellSize;
    this.canvas.height = this.config.height * this.config.cellSize;
    this.canvas.style.border = '1px solid #333';
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);
  }

  initialize() {
    // Create 2D grid
    this.grid = Array(this.config.height).fill(null).map(() =>
      Array(this.config.width).fill(0)
    );

    if (this.config.initialPattern) {
      this.setPattern(this.config.initialPattern);
    } else {
      this.randomize();
    }

    // Save the initial state for reset
    this.initialGrid = this.grid.map(row => [...row]);

    this.generation = 0;
    this.render();
  }

  randomize(density = 0.3) {
    this.stop();
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        this.grid[y][x] = Math.random() < density ? 1 : 0;
      }
    }
    // Update initial state when randomizing
    this.initialGrid = this.grid.map(row => [...row]);
    this.generation = 0;
    this.clearStabilityTracking();
    this.render();
  }

  setPattern(pattern) {
    // pattern: array of {x, y} coordinates for alive cells
    // Clear grid first
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        this.grid[y][x] = 0;
      }
    }

    // Set pattern
    pattern.forEach(({x, y}) => {
      if (x >= 0 && x < this.config.width && y >= 0 && y < this.config.height) {
        this.grid[y][x] = 1;
      }
    });
  }

  hashGrid(grid = this.grid) {
    // Convert grid to string for comparison
    return grid.map(row => row.join('')).join('|');
  }

  gridsEqual(grid1, grid2) {
    // Direct comparison of two grids
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        if (grid1[y][x] !== grid2[y][x]) return false;
      }
    }
    return true;
  }

  checkStability() {
    if (!this.config.detectStability || this.isStable) return;

    // Tier 1: Check for still life (period-1)
    if (this.previousGrid && this.gridsEqual(this.grid, this.previousGrid)) {
      this.isStable = true;
      this.period = 1;
      this.stableGeneration = this.generation;
      if (this.config.onStable) {
        this.config.onStable(this.period);
      }
      if (this.config.stopWhenStable) {
        this.stop();
      }
      return;
    }

    // Tier 2: Check for oscillators (period 2+)
    const currentHash = this.hashGrid();
    const historyIndex = this.stateHistory.indexOf(currentHash);

    if (historyIndex !== -1) {
      // Found a repeat - calculate period
      this.isStable = true;
      this.period = this.stateHistory.length - historyIndex;
      this.stableGeneration = this.generation;
      if (this.config.onStable) {
        this.config.onStable(this.period);
      }
      if (this.config.stopWhenStable) {
        this.stop();
      }
      return;
    }

    // Add to history (circular buffer)
    this.stateHistory.push(currentHash);
    if (this.stateHistory.length > this.config.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  clearStabilityTracking() {
    this.isStable = false;
    this.period = 0;
    this.stableGeneration = 0;
    this.stateHistory = [];
    this.previousGrid = null;
  }

  countNeighbors(x, y) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = (x + dx + this.config.width) % this.config.width;
        const ny = (y + dy + this.config.height) % this.config.height;
        count += this.grid[ny][nx];
      }
    }
    return count;
  }

  step() {
    // Save current grid for period-1 detection
    this.previousGrid = this.grid.map(row => [...row]);

    const newGrid = Array(this.config.height).fill(null).map(() =>
      Array(this.config.width).fill(0)
    );

    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        const neighbors = this.countNeighbors(x, y);
        const alive = this.grid[y][x] === 1;

        // Conway's rules
        if (alive && (neighbors === 2 || neighbors === 3)) {
          newGrid[y][x] = 1; // Survive
        } else if (!alive && neighbors === 3) {
          newGrid[y][x] = 1; // Birth
        } else {
          newGrid[y][x] = 0; // Death or stay dead
        }
      }
    }

    this.grid = newGrid;
    this.generation++;
    this.render();

    // Check for stability after updating
    this.checkStability();
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw cells
    this.ctx.fillStyle = this.config.cellColor;
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        if (this.grid[y][x] === 1) {
          this.ctx.fillRect(
            x * this.config.cellSize,
            y * this.config.cellSize,
            this.config.cellSize - 1,
            this.config.cellSize - 1
          );
        }
      }
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.intervalId = setInterval(() => this.step(), this.config.updateInterval);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.stop();
    // Restore the initial grid state
    this.grid = this.initialGrid.map(row => [...row]);
    this.generation = 0;
    this.clearStabilityTracking();
    this.render();
  }

  setSpeed(intervalMs) {
    this.config.updateInterval = intervalMs;
    if (this.running) {
      this.stop();
      this.start();
    }
  }

  getState() {
    return {
      grid: this.grid.map(row => [...row]),
      generation: this.generation,
      running: this.running,
      isStable: this.isStable,
      period: this.period,
      stableGeneration: this.stableGeneration
    };
  }

  setState(state) {
    this.grid = state.grid.map(row => [...row]);
    this.generation = state.generation;
    this.render();
  }

  destroy() {
    this.stop();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

// Export for use in modules or direct script inclusion
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConwayGame;
}
