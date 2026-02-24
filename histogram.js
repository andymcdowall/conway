/**
 * Conway's Game of Life - Histogram Visualization
 * Renders a histogram of generations-to-stability distribution
 */
class Histogram {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.config = {
      binSize: options.binSize || 10,
      maxBins: options.maxBins || 50,
      padding: options.padding || { top: 40, right: 20, bottom: 60, left: 60 },
      barColor: options.barColor || '#00ff00',
      barHoverColor: options.barHoverColor || '#00ffaa',
      backgroundColor: options.backgroundColor || '#1a1a1a',
      gridColor: options.gridColor || '#333',
      textColor: options.textColor || '#00ff00',
      axisColor: options.axisColor || '#00ff00'
    };

    this.data = [];
    this.bins = [];
    this.hoveredBin = null;

    // Mouse interaction
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseout', () => this.handleMouseOut());
  }

  setData(results) {
    // Extract generations to stability (only stable results)
    this.data = results
      .filter(r => r.isStable)
      .map(r => r.generationsToStability);

    if (this.data.length === 0) {
      this.bins = [];
      this.render();
      return;
    }

    this.createBins();
    this.render();
  }

  createBins() {
    if (this.data.length === 0) {
      this.bins = [];
      return;
    }

    const min = Math.min(...this.data);
    const max = Math.max(...this.data);
    const range = max - min;

    // Determine bin size automatically
    let binSize = this.config.binSize;
    let numBins = Math.ceil(range / binSize) + 1;

    // Adjust if too many bins
    if (numBins > this.config.maxBins) {
      binSize = Math.ceil(range / this.config.maxBins);
      numBins = Math.ceil(range / binSize) + 1;
    }

    // Initialize bins
    this.bins = [];
    for (let i = 0; i < numBins; i++) {
      const binStart = min + (i * binSize);
      const binEnd = binStart + binSize - 1;
      this.bins.push({
        start: binStart,
        end: binEnd,
        count: 0,
        label: i === numBins - 1 ? `${binStart}+` : `${binStart}-${binEnd}`
      });
    }

    // Fill bins
    this.data.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binSize), numBins - 1);
      this.bins[binIndex].count++;
    });
  }

  render() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const pad = this.config.padding;

    // Clear canvas
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);

    if (this.bins.length === 0) {
      this.renderEmptyState();
      return;
    }

    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;

    // Find max count for scaling
    const maxCount = Math.max(...this.bins.map(b => b.count));

    // Draw grid lines
    this.drawGrid(pad, chartWidth, chartHeight, maxCount);

    // Draw bars
    const barWidth = chartWidth / this.bins.length;
    const barPadding = Math.max(1, barWidth * 0.1);

    this.bins.forEach((bin, index) => {
      const barHeight = (bin.count / maxCount) * chartHeight;
      const x = pad.left + (index * barWidth);
      const y = pad.top + chartHeight - barHeight;

      // Determine color
      const isHovered = this.hoveredBin === index;
      this.ctx.fillStyle = isHovered ? this.config.barHoverColor : this.config.barColor;

      // Draw bar
      this.ctx.fillRect(
        x + barPadding,
        y,
        barWidth - (2 * barPadding),
        barHeight
      );

      // Store bar bounds for hover detection
      bin.bounds = {
        x: x + barPadding,
        y: y,
        width: barWidth - (2 * barPadding),
        height: barHeight
      };
    });

    // Draw axes
    this.drawAxes(pad, chartWidth, chartHeight);

    // Draw labels
    this.drawLabels(pad, chartWidth, chartHeight, maxCount);

    // Draw hover tooltip
    if (this.hoveredBin !== null) {
      this.drawTooltip(this.bins[this.hoveredBin]);
    }
  }

  drawGrid(pad, chartWidth, chartHeight, maxCount) {
    this.ctx.strokeStyle = this.config.gridColor;
    this.ctx.lineWidth = 1;

    // Horizontal grid lines (5 lines)
    const numLines = 5;
    for (let i = 0; i <= numLines; i++) {
      const y = pad.top + (chartHeight * i / numLines);
      this.ctx.beginPath();
      this.ctx.moveTo(pad.left, y);
      this.ctx.lineTo(pad.left + chartWidth, y);
      this.ctx.stroke();
    }
  }

  drawAxes(pad, chartWidth, chartHeight) {
    this.ctx.strokeStyle = this.config.axisColor;
    this.ctx.lineWidth = 2;

    // Y-axis
    this.ctx.beginPath();
    this.ctx.moveTo(pad.left, pad.top);
    this.ctx.lineTo(pad.left, pad.top + chartHeight);
    this.ctx.stroke();

    // X-axis
    this.ctx.beginPath();
    this.ctx.moveTo(pad.left, pad.top + chartHeight);
    this.ctx.lineTo(pad.left + chartWidth, pad.top + chartHeight);
    this.ctx.stroke();
  }

  drawLabels(pad, chartWidth, chartHeight, maxCount) {
    this.ctx.fillStyle = this.config.textColor;
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'center';

    // Title
    this.ctx.font = 'bold 14px monospace';
    this.ctx.fillText('Generations to Stability Distribution', this.canvas.width / 2, 20);
    this.ctx.font = '12px monospace';

    // X-axis label
    this.ctx.fillText('Generations to Stability', this.canvas.width / 2, this.canvas.height - 10);

    // Y-axis label (rotated)
    this.ctx.save();
    this.ctx.translate(15, this.canvas.height / 2);
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.fillText('Number of Patterns', 0, 0);
    this.ctx.restore();

    // Y-axis tick labels
    this.ctx.textAlign = 'right';
    const numTicks = 5;
    for (let i = 0; i <= numTicks; i++) {
      const value = Math.round((maxCount * (numTicks - i)) / numTicks);
      const y = pad.top + (chartHeight * i / numTicks);
      this.ctx.fillText(value.toString(), pad.left - 10, y + 4);
    }

    // X-axis tick labels (show subset to avoid crowding)
    this.ctx.textAlign = 'center';
    const labelStep = Math.max(1, Math.floor(this.bins.length / 10));
    this.bins.forEach((bin, index) => {
      if (index % labelStep === 0 || index === this.bins.length - 1) {
        const x = pad.left + ((index + 0.5) * chartWidth / this.bins.length);
        const y = pad.top + chartHeight + 20;
        this.ctx.fillText(bin.start.toString(), x, y);
      }
    });
  }

  drawTooltip(bin) {
    const tooltipText = `${bin.label} gen: ${bin.count} patterns`;
    const padding = 8;

    this.ctx.font = '12px monospace';
    const textWidth = this.ctx.measureText(tooltipText).width;

    // Position tooltip near cursor
    const tooltipX = Math.min(this.mouseX, this.canvas.width - textWidth - padding * 2 - 10);
    const tooltipY = this.mouseY - 30;

    // Draw background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    this.ctx.fillRect(tooltipX, tooltipY - 16, textWidth + padding * 2, 24);

    // Draw border
    this.ctx.strokeStyle = this.config.barHoverColor;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(tooltipX, tooltipY - 16, textWidth + padding * 2, 24);

    // Draw text
    this.ctx.fillStyle = this.config.barHoverColor;
    this.ctx.fillText(tooltipText, tooltipX + padding, tooltipY);
  }

  renderEmptyState() {
    this.ctx.fillStyle = this.config.textColor;
    this.ctx.font = '14px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('No data to display', this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.fillText('Run simulations to see results', this.canvas.width / 2, this.canvas.height / 2 + 20);
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    // Check if hovering over any bar
    let foundHover = false;
    for (let i = 0; i < this.bins.length; i++) {
      const bin = this.bins[i];
      if (bin.bounds &&
          this.mouseX >= bin.bounds.x &&
          this.mouseX <= bin.bounds.x + bin.bounds.width &&
          this.mouseY >= bin.bounds.y &&
          this.mouseY <= bin.bounds.y + bin.bounds.height) {
        this.hoveredBin = i;
        foundHover = true;
        break;
      }
    }

    if (!foundHover) {
      this.hoveredBin = null;
    }

    this.render();
  }

  handleMouseOut() {
    this.hoveredBin = null;
    this.render();
  }

  clear() {
    this.data = [];
    this.bins = [];
    this.render();
  }
}

// Export for use in modules or direct script inclusion
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Histogram;
}
