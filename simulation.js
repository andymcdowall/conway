/**
 * Conway's Game of Life - Batch Simulation Runner
 * Uses a Web Worker (created via Blob URL) to keep the UI responsive.
 * Works with both file:// and http:// origins.
 */

const WORKER_CODE = `
function createGrid(width, height, density) {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => Math.random() < density ? 1 : 0)
  );
}

function countNeighbors(grid, x, y, width, height) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = (x + dx + width) % width;
      const ny = (y + dy + height) % height;
      count += grid[ny][nx];
    }
  }
  return count;
}

function step(grid, width, height) {
  const next = Array.from({ length: height }, () => new Array(width).fill(0));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = countNeighbors(grid, x, y, width, height);
      const alive = grid[y][x] === 1;
      if (alive && (n === 2 || n === 3)) next[y][x] = 1;
      else if (!alive && n === 3) next[y][x] = 1;
    }
  }
  return next;
}

function hashGrid(grid) {
  let h = 0;
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      h = (h * 31 + grid[y][x]) | 0;
    }
  }
  return h;
}

function gridsEqual(a, b) {
  for (let y = 0; y < a.length; y++) {
    for (let x = 0; x < a[y].length; x++) {
      if (a[y][x] !== b[y][x]) return false;
    }
  }
  return true;
}

function runSimulation(id, config) {
  const { gridWidth: W, gridHeight: H, maxGenerations, density, maxHistorySize } = config;
  let grid = createGrid(W, H, density);
  const initialGrid = grid.map(row => [...row]);
  let prevGrid = null;
  const history = [];
  let isStable = false;
  let period = 0;
  let stableGeneration = 0;
  let generation = 0;

  while (generation < maxGenerations) {
    if (prevGrid && gridsEqual(grid, prevGrid)) {
      isStable = true; period = 1; stableGeneration = generation; break;
    }
    const h = hashGrid(grid);
    const idx = history.findIndex(entry => entry[0] === h);
    if (idx !== -1) {
      isStable = true; period = history.length - idx; stableGeneration = generation; break;
    }
    history.push([h, generation]);
    if (history.length > maxHistorySize) history.shift();
    prevGrid = grid.map(row => [...row]);
    grid = step(grid, W, H);
    generation++;
  }

  return {
    id, initialGrid,
    generationsToStability: isStable ? stableGeneration : null,
    period, isStable,
    reachedMaxGenerations: !isStable,
    gridSize: { width: W, height: H }
  };
}

let cancelled = false;
self.onmessage = function(e) {
  const { type, config } = e.data;
  if (type === 'start') {
    cancelled = false;
    const { numSimulations, progressInterval } = config;
    const results = [];
    for (let i = 0; i < numSimulations; i++) {
      if (cancelled) break;
      results.push(runSimulation(i, config));
      if ((i + 1) % progressInterval === 0 || i === numSimulations - 1) {
        self.postMessage({ type: 'progress', completed: i + 1, total: numSimulations, results });
      }
    }
    if (!cancelled) self.postMessage({ type: 'complete', results });
  }
  if (type === 'cancel') { cancelled = true; }
};
`;

class SimulationRunner {
  constructor(options = {}) {
    this.config = {
      numSimulations: options.numSimulations || 1000,
      gridWidth: options.gridWidth || 50,
      gridHeight: options.gridHeight || 50,
      maxGenerations: options.maxGenerations || 1000,
      density: options.density || 0.3,
      maxHistorySize: options.maxHistorySize || 20,
      progressInterval: options.progressInterval || 50,
      onProgress: options.onProgress || null, // callback(completed, total)
      onComplete: options.onComplete || null  // callback(allResults)
    };

    this.results = [];
    this.running = false;
    this.worker = null;
  }

  runAll() {
    this.results = [];
    this.running = true;

    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    this.worker = new Worker(workerUrl);
    URL.revokeObjectURL(workerUrl);

    this.worker.onmessage = (e) => {
      const { type, completed, total, results } = e.data;

      if (type === 'progress') {
        this.results = results;
        if (this.config.onProgress) {
          this.config.onProgress(completed, total);
        }
      }

      if (type === 'complete') {
        this.results = results;
        this.running = false;
        this.worker.terminate();
        this.worker = null;
        if (this.config.onComplete) {
          this.config.onComplete(this.results);
        }
      }
    };

    this.worker.onerror = (err) => {
      console.error('Simulation worker error:', err);
      this.running = false;
    };

    this.worker.postMessage({
      type: 'start',
      config: {
        numSimulations: this.config.numSimulations,
        gridWidth: this.config.gridWidth,
        gridHeight: this.config.gridHeight,
        maxGenerations: this.config.maxGenerations,
        density: this.config.density,
        maxHistorySize: this.config.maxHistorySize,
        progressInterval: this.config.progressInterval
      }
    });
  }

  cancel() {
    if (this.worker) {
      this.worker.postMessage({ type: 'cancel' });
      // Give worker a moment to stop cleanly, then terminate
      setTimeout(() => {
        if (this.worker) {
          this.worker.terminate();
          this.worker = null;
        }
      }, 100);
    }
    this.running = false;
  }

  getResults() {
    return this.results;
  }

  getStatistics() {
    const stableResults = this.results.filter(r => r.isStable);
    const generations = stableResults.map(r => r.generationsToStability);

    if (generations.length === 0) {
      return {
        total: this.results.length,
        stable: 0,
        unstable: this.results.length,
        min: null,
        max: null,
        mean: null,
        median: null
      };
    }

    generations.sort((a, b) => a - b);

    const sum = generations.reduce((acc, val) => acc + val, 0);
    const mean = sum / generations.length;
    const median = generations[Math.floor(generations.length / 2)];

    return {
      total: this.results.length,
      stable: stableResults.length,
      unstable: this.results.length - stableResults.length,
      min: generations[0],
      max: generations[generations.length - 1],
      mean: Math.round(mean * 100) / 100,
      median: median
    };
  }

  getFilteredResults(minGenerations) {
    return this.results.filter(r =>
      r.isStable && r.generationsToStability >= minGenerations
    );
  }

  getUnstableResults() {
    return this.results.filter(r => !r.isStable);
  }

  exportToJSON(filterType = 'stable', minGenerations = 0) {
    const stats = this.getStatistics();
    let filtered;
    let filterInfo;

    if (filterType === 'unstable') {
      filtered = this.getUnstableResults();
      filterInfo = {
        type: 'unstable',
        matchingPatterns: filtered.length
      };
    } else {
      filtered = this.getFilteredResults(minGenerations);
      filterInfo = {
        type: 'stable',
        minGenerations: minGenerations,
        matchingPatterns: filtered.length
      };
    }

    const exportData = {
      metadata: {
        totalSimulations: this.results.length,
        timestamp: new Date().toISOString(),
        config: {
          gridWidth: this.config.gridWidth,
          gridHeight: this.config.gridHeight,
          maxGenerations: this.config.maxGenerations,
          density: this.config.density
        },
        statistics: stats,
        filter: filterInfo
      },
      simulations: filtered.map(r => ({
        id: r.id,
        initialGrid: r.initialGrid,
        generationsToStability: r.generationsToStability,
        period: r.period,
        isStable: r.isStable,
        gridSize: r.gridSize
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }
}

// Export for use in modules or direct script inclusion
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SimulationRunner;
}
