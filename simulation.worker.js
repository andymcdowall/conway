/**
 * Conway's Game of Life - Web Worker
 * Runs simulations entirely off the main thread.
 * Self-contained: no DOM, no external dependencies.
 */

// --- Minimal Conway simulation logic ---

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
  // Fast string hash using a sampled representation
  let h = 0;
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      // djb2-style hash
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
  const history = []; // array of [hash, generation]
  let isStable = false;
  let period = 0;
  let stableGeneration = 0;
  let generation = 0;

  while (generation < maxGenerations) {
    // Period-1 check (still life)
    if (prevGrid && gridsEqual(grid, prevGrid)) {
      isStable = true;
      period = 1;
      stableGeneration = generation;
      break;
    }

    // Period 2+ check via hash history
    const h = hashGrid(grid);
    const idx = history.findIndex(entry => entry[0] === h);
    if (idx !== -1) {
      isStable = true;
      period = history.length - idx;
      stableGeneration = generation;
      break;
    }

    // Maintain circular history buffer
    history.push([h, generation]);
    if (history.length > maxHistorySize) history.shift();

    prevGrid = grid.map(row => [...row]);
    grid = step(grid, W, H);
    generation++;
  }

  return {
    id,
    initialGrid,
    generationsToStability: isStable ? stableGeneration : null,
    period,
    isStable,
    reachedMaxGenerations: !isStable,
    gridSize: { width: W, height: H }
  };
}

// --- Worker message handler ---

let cancelled = false;

self.onmessage = function(e) {
  const { type, config } = e.data;

  if (type === 'start') {
    cancelled = false;
    const { numSimulations, progressInterval } = config;
    const results = [];

    for (let i = 0; i < numSimulations; i++) {
      if (cancelled) break;

      const result = runSimulation(i, config);
      results.push(result);

      // Send progress update periodically
      if ((i + 1) % progressInterval === 0 || i === numSimulations - 1) {
        self.postMessage({ type: 'progress', completed: i + 1, total: numSimulations, results });
      }
    }

    if (!cancelled) {
      self.postMessage({ type: 'complete', results });
    }
  }

  if (type === 'cancel') {
    cancelled = true;
  }
};
