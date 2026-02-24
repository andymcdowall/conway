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
  TOTAL_ROUNDS: 5,

  // Delay before moving to next round after reveal (milliseconds)
  NEXT_ROUND_DELAY: 2500,

  // Initial density for random patterns (0.0 to 1.0)
  RANDOM_DENSITY: 0.3,

  // Prechosen patterns (array of 2D grids)
  // For now, using empty grids as placeholders
  // Later, replace with actual interesting patterns
  PRECHOSEN_PATTERNS: [
    // Empty pattern (all cells dead) - placeholder
    null
  ]
};

// Export for use in modules or direct script inclusion
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GAME_CONFIG;
}
