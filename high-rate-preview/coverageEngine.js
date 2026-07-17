const SQ_FT_PER_ACRE = 43560;

function buildOrchard(input) {
  const blockSqFt = input.acres * SQ_FT_PER_ACRE;
  const blockWidth = input.rows * input.rowSpacing;
  const rowLength = blockSqFt / blockWidth;
  const treesPerRow = Math.max(1, Math.round(rowLength / input.treeSpacing));

  const trees = [];

  for (let row = 1; row <= input.rows; row++) {
    for (let tree = 1; tree <= treesPerRow; tree++) {
      trees.push({
        row,
        tree,
        x: (tree - 1) * input.treeSpacing,
        y: (row - 1) * input.rowSpacing,
        hasDispenser: false
      });
    }
  }

  return {
    trees,
    rows: input.rows,
    treesPerRow,
    rowLength,
    width: blockWidth,
    acres: input.acres
  };
}

function generateRepeatablePatterns(input, orchard) {
  const targetDispensers = Math.round(input.acres * input.targetRate);
  const patterns = [];

  for (let rowInterval = 1; rowInterval <= Math.min(12, input.rows); rowInterval++) {
    for (let treeInterval = 1; treeInterval <= Math.min(50, orchard.treesPerRow); treeInterval++) {
      const offsets = getOffsets(treeInterval);

      offsets.forEach(offset => {
        const placements = [];

        for (let row = 1; row <= input.rows; row++) {
          const placementRow = (row - 1) % rowInterval === 0;
          if (!placementRow) continue;

          const rowStartsOppositeEnd = row % 2 === 0;

          for (let tree = 1; tree <= orchard.treesPerRow; tree++) {
            let place = false;

            if (!rowStartsOppositeEnd) {
              place = (tree - 1) % treeInterval === 0;
            } else {
              const treeFromWalkingStart = orchard.treesPerRow - tree + 1;
              place = (treeFromWalkingStart - 1 + offset) % treeInterval === 0;
            }

            if (place) {
              placements.push({ row, tree });
            }
          }
        }

        const count = placements.length;
        const resultingRate = count / input.acres;
        const rateDiff = Math.abs(count - targetDispensers);
        const percentDiff = rateDiff / targetDispensers;

        if (percentDiff <= 0.10) {
          patterns.push({
            rowInterval,
            treeInterval,
            offset,
            placements,
            count,
            resultingRate,
            targetDispensers,
            score: 0
          });
        }
      });
    }
  }

  return patterns;
}

function getOffsets(treeInterval) {
  const half = Math.round(treeInterval / 2);

  return [...new Set([
    half,
    Math.floor(treeInterval / 2),
    Math.ceil(treeInterval / 2),
    0
  ])].filter(offset => offset >= 0 && offset < treeInterval);
}

function scorePattern(pattern, orchard, input) {
  const dispenserPoints = pattern.placements.map(p => {
    return {
      ...p,
      x: (p.tree - 1) * input.treeSpacing,
      y: (p.row - 1) * input.rowSpacing
    };
  });

  const coverageScore = scoreUniformity(dispenserPoints);
  const rateScore = scoreRate(pattern.count, pattern.targetDispensers);
  const repeatabilityScore = scoreRepeatability(pattern);
  const staggerScore = pattern.offset > 0 ? 150 : 0;

  pattern.score =
    coverageScore * 0.65 +
    rateScore * 0.2 +
    repeatabilityScore * 0.1 +
    staggerScore * 0.05;

  return pattern;
}

function scoreUniformity(points) {
  if (points.length < 2) return 0;

  const nearestDistances = points.map((point, index) => {
    let nearest = Infinity;

    points.forEach((other, otherIndex) => {
      if (index === otherIndex) return;

      const distance = getDistance(point, other);
      if (distance < nearest) nearest = distance;
    });

    return nearest;
  });

  const average =
    nearestDistances.reduce((sum, d) => sum + d, 0) / nearestDistances.length;

  const variance =
    nearestDistances.reduce((sum, d) => sum + Math.pow(d - average, 2), 0) /
    nearestDistances.length;

  const standardDeviation = Math.sqrt(variance);

  return Math.max(0, 1000 - standardDeviation * 20);
}

function scoreRate(count, target) {
  const percentDifference = Math.abs(count - target) / target;
  return Math.max(0, 1000 - percentDifference * 2000);
}

function scoreRepeatability(pattern) {
  let score = 1000;

  score -= pattern.rowInterval * 20;
  score -= pattern.treeInterval * 5;

  if (pattern.offset > 0) score += 100;

  return score;
}

function getDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx * dx + dy * dy);
}

function getBestPatterns(input) {
  const orchard = buildOrchard(input);
  const patterns = generateRepeatablePatterns(input, orchard);

  const scored = patterns
    .map(pattern => scorePattern(pattern, orchard, input))
    .sort((a, b) => b.score - a.score);

  return {
    orchard,
    patterns: scored.slice(0, 3)
  };
}
