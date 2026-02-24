/**
 * Configuration for Conway's Game of Life Guessing Game
 */

const GAME_CONFIG = {
  // Probability that a round will be a "prechosen" pattern (0.0 to 1.0)
  // 0.5 = 50% chance of prechosen, 50% chance of random
  PRECHOSEN_PROBABILITY: 0.5,

  // Maximum generations to run before giving up on stability
  MAX_GENERATIONS: 10000,

  // Grid dimensions
  GRID_WIDTH: 50,
  GRID_HEIGHT: 50,

  // Playback speed (milliseconds per generation)
  PLAYBACK_SPEED: 10,

  // Total number of rounds per game
  TOTAL_ROUNDS: 10,

  // Delay before moving to next round after reveal (milliseconds)
  NEXT_ROUND_DELAY: 2500,

  // Initial density for random patterns (0.0 to 1.0)
  RANDOM_DENSITY: 0.3,

  // Gamma distribution parameters for generation probability
  // Based on empirical data: likelihood that random world reaches generation N
  GAMMA_SHAPE: 1.3,    // k (shape parameter)
  GAMMA_SCALE: 620,    // θ (scale parameter)

  // Path to JSON file containing prechosen patterns
  // File should be in the format exported from simulation analysis
  PRECHOSEN_PATTERNS_FILE: 'conway-stable-min4000gen-2026-02-24T19-49-54.json'
};

// Export for use in modules or direct script inclusion
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GAME_CONFIG;
}
