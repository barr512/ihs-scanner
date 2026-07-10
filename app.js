const generateBtn = document.getElementById("generateBtn");
const summaryEl = document.getElementById("summary");
const optionsEl = document.getElementById("options");
const mapSection = document.getElementById("mapSection");
const mapEl = document.getElementById("map");
const instructionsEl = document.getElementById("instructions");
const selectedPlanText = document.getElementById("selectedPlanText");

const setupScreen = document.getElementById("setupScreen");
const resultsScreen = document.getElementById("resultsScreen");
const backBtn = document.getElementById("backBtn");
const topBackBtn = document.getElementById("topBackBtn");
const targetPests = document.getElementById("targetPests");
const productSelect = document.getElementById("productSelect");
const rateInput = document.getElementById("rate");
const productRateNote = document.getElementById("productRateNote");
const products = {
  "cmda-combo-meso-a": {
    name: "CIDETRAK CMDA COMBO MESO-A",
    min: 32,
    max: 36,
    defaultRate: 32,
    unit: "dispensers per acre",
    pestCategory: "cm"
  },
  "cmda-combo-pp": {
    name: "CIDETRAK CMDA COMBO PP",
    min: 200,
    max: 400,
    defaultRate: 280,
    unit: "dispensers per acre",
    pestCategory: "cm"
  },
  "cmda-ofm-meso": {
    name: "CIDETRAK CMDA + OFM MESO",
    min: 32,
    max: 38,
    defaultRate: 38,
    unit: "dispensers per acre",
    pestCategory: "cm-ofm"
  },
  "cm-ofm-combo-meso": {
    name: "CIDETRAK CM-OFM COMBO MESO",
    min: 32,
    max: 36,
    defaultRate: 32,
    unit: "dispensers per acre",
    pestCategory: "cm-ofm"
  },
  "cm-ofm-combo-pp": {
    name: "CIDETRAK CM-OFM COMBO PP",
    min: 200,
    max: 440,
    defaultRate: 200,
    unit: "dispensers per acre",
    pestCategory: "cm-ofm"
  },
  "cmda-lr-dual-meso": {
    name: "CIDETRAK CMDA + LR DUAL MESO",
    min: 32,
    max: 36,
    defaultRate: 32,
    unit: "dispensers per acre",
    pestCategory: "cm-oblr"
  },
  "ofm-l-meso": {
    name: "CIDETRAK OFM-L MESO",
    min: 32,
    max: 35,
    defaultRate: 32,
    unit: "dispensers per acre",
    pestCategory: "ofm"
  },
  "ofm-l-pp": {
    name: "CIDETRAK OFM-L PP",
    min: 100,
    max: 200,
    defaultRate: 170,
    unit: "dispensers per acre",
    pestCategory: "ofm"
  },
  "lr-meso": {
    name: "CIDETRAK LR MESO",
    min: 32,
    max: 36,
    defaultRate: 32,
    unit: "dispensers per acre",
    pestCategory: "oblr"
  }
};
function refreshProductOptions() {
  const selectedPest = targetPests ? targetPests.value : "";

  productSelect.innerHTML = `<option value="">Manual rate entry</option>`;

  Object.entries(products).forEach(([productKey, product]) => {
    if (selectedPest && product.pestCategory !== selectedPest) {
      return;
    }

    const option = document.createElement("option");
    option.value = productKey;
    option.textContent =
      `${product.name} — ${product.min}-${product.max}/acre`;

    productSelect.appendChild(option);
  });

   productSelect.value = "";
  rateInput.value = "";
  productRateNote.textContent = "";
}
if (targetPests && productSelect) {
  targetPests.addEventListener("change", refreshProductOptions);
}

refreshProductOptions();
if (productSelect && rateInput) {
  productSelect.addEventListener("change", () => {
    const selectedProduct = products[productSelect.value];

    if (selectedProduct) {
      // Fill the recommended planning rate
      rateInput.value = selectedProduct.defaultRate;

      // Show the label range and recommendation
      if (productRateNote) {
        productRateNote.textContent =
          `Label rate: ${selectedProduct.min}-${selectedProduct.max} ${selectedProduct.unit}. ` +
          `Recommended planning rate: ${selectedProduct.defaultRate}. ` +
          `You may enter any rate within the label range.`;
      }
    } else {
      if (productRateNote) {
        productRateNote.textContent = "";
      }
    }
  });
}
let currentInput = null;
let currentPlans = [];

if (generateBtn) {
  generateBtn.addEventListener("click", event => {
    event.preventDefault();
    generatePlans();
  });
}

if (backBtn) {
  backBtn.addEventListener("click", showSetupScreen);
}
if (topBackBtn) {
  topBackBtn.addEventListener("click", showSetupScreen);
}
function getInputs() {
 const selectedProduct = products[productSelect.value] || null;

return {
  acres: Number(document.getElementById("acres").value),
  rows: Number(document.getElementById("rows").value),
  rowSpacing: Number(document.getElementById("rowSpacing").value),
  treeSpacing: Number(document.getElementById("treeSpacing").value),
  targetRate: Number(document.getElementById("rate").value),
  availableDispensers: Number(document.getElementById("availableDispensers").value) || null,
  rowDirection: document.getElementById("rowDirection").value,
  pressureEdge: document.getElementById("pressureEdge").value,
  selectedProduct
};
}

function showSetupScreen() {
  setupScreen.classList.remove("hidden");
  resultsScreen.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showOptionsScreen() {
  setupScreen.classList.add("hidden");
  resultsScreen.classList.remove("hidden");

  summaryEl.classList.remove("hidden");
  optionsEl.classList.remove("hidden");

  mapSection.classList.add("hidden");
  instructionsEl.classList.add("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showPlanScreen(plan) {
  setupScreen.classList.add("hidden");
  resultsScreen.classList.remove("hidden");

  summaryEl.classList.add("hidden");
  optionsEl.classList.add("hidden");

  selectPlan(plan, currentInput);

  window.scrollTo({ top: 0, behavior: "smooth" });
}
function scoreCoverageQuality(placements, orchard, input) {
  if (!placements.length || !orchard.trees.length) {
    return {
      averageNearestDistance: Infinity,
      worstNearestDistance: Infinity,
      clusterPenalty: Infinity,
      coverageScore: Infinity,
      coverageUniformity: 0
    };
  }

  /*
    Scoring every tree against every dispenser is too slow on a phone.

    Instead, sample representative trees and representative dispenser
    placements. This keeps comparisons consistent while allowing the
    optimizer to finish.
  */

  const maximumTreeSamples = 150;
  const maximumPlacementSamples = 150;

  const treeStep = Math.max(
    1,
    Math.ceil(orchard.trees.length / maximumTreeSamples)
  );

  const placementStep = Math.max(
    1,
    Math.ceil(placements.length / maximumPlacementSamples)
  );

  const sampledTrees = [];

  for (
    let index = 0;
    index < orchard.trees.length;
    index += treeStep
  ) {
    sampledTrees.push(orchard.trees[index]);
  }

  const sampledPlacements = [];

  for (
    let index = 0;
    index < placements.length;
    index += placementStep
  ) {
    sampledPlacements.push(placements[index]);
  }

  let totalNearestDistance = 0;
  let worstNearestDistance = 0;

  sampledTrees.forEach(tree => {
    let nearestDistance = Infinity;

    sampledPlacements.forEach(place => {
      const rowDistance =
        Math.abs(tree.row - place.row) *
        input.rowSpacing;

      const treeDistance =
        Math.abs(tree.tree - place.tree) *
        input.treeSpacing;

      const distance = Math.sqrt(
        rowDistance ** 2 +
        treeDistance ** 2
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
      }
    });

    totalNearestDistance += nearestDistance;

    if (nearestDistance > worstNearestDistance) {
      worstNearestDistance = nearestDistance;
    }
  });

  const averageNearestDistance =
    totalNearestDistance / sampledTrees.length;

  const rowCounts = new Map();

  placements.forEach(place => {
    rowCounts.set(
      place.row,
      (rowCounts.get(place.row) || 0) + 1
    );
  });

  const rowCountValues = [...rowCounts.values()];

  const rowUseSpread = rowCountValues.length
    ? Math.max(...rowCountValues) -
      Math.min(...rowCountValues)
    : 0;

  const clusterPenalty =
    rowUseSpread * 20;

  const coverageScore =
    averageNearestDistance +
    worstNearestDistance * 2 +
    clusterPenalty;

  const coverageUniformity = Math.max(
    0,
    100 - coverageScore / 10
  );

  return {
    averageNearestDistance,
    worstNearestDistance,
    clusterPenalty,
    coverageScore,
    coverageUniformity
  };
}
function buildEvenTreePattern(treesPerRow, dispenserCount, phase = 0) {
  const count = Math.max(
    1,
    Math.min(treesPerRow, Math.round(dispenserCount))
  );

  const positions = [];

  for (let index = 0; index < count; index++) {
    const position =
      1 +
      Math.floor(
        ((index + phase) * treesPerRow) /
        count
      );

    positions.push(
      Math.max(1, Math.min(treesPerRow, position))
    );
  }

  return [...new Set(positions)];
}

function orientTreePositions(positions, treesPerRow, reverseTrees) {
  if (!reverseTrees) {
    return positions;
  }

  return positions
    .map(tree => treesPerRow - tree + 1)
    .sort((a, b) => a - b);
}
function getBestPatterns(input) {
  const SQFT_PER_ACRE = 43560;

  const blockArea = input.acres * SQFT_PER_ACRE;
  const totalRowFeet = blockArea / input.rowSpacing;
  const rowLength = totalRowFeet / input.rows;
  const treesPerRow = Math.max(
    1,
    Math.round(rowLength / input.treeSpacing)
  );

  const labelTargetDispensers = Math.round(
    input.acres * input.targetRate
  );

  const inventoryIsLimited =
    input.availableDispensers &&
    input.availableDispensers < labelTargetDispensers;

  const targetDispensers = inventoryIsLimited
    ? input.availableDispensers
    : labelTargetDispensers;

  const targetAreaPerDispenser =
    SQFT_PER_ACRE / input.targetRate;

  const orchard = {
    rows: input.rows,
    rowLength,
    treesPerRow,
    trees: []
  };

  for (let row = 1; row <= input.rows; row++) {
    for (let tree = 1; tree <= treesPerRow; tree++) {
      orchard.trees.push({ row, tree });
    }
  }

  const candidatePatterns = [];

  for (
    let rowInterval = 1;
    rowInterval <= Math.min(10, input.rows);
    rowInterval++
  ) {
    const rowsRunNorthSouth =
      input.rowDirection === "north-south";

    let rowStart = 1;
    let rowEnd = input.rows;
    let rowStep = 1;

    let reverseTrees = false;

    if (rowsRunNorthSouth) {
      if (input.pressureEdge === "east") {
        rowStart = input.rows;
        rowEnd = 1;
        rowStep = -1;
      }

      if (input.pressureEdge === "south") {
        reverseTrees = true;
      }
    } else {
      if (input.pressureEdge === "south") {
        rowStart = input.rows;
        rowEnd = 1;
        rowStep = -1;
      }

      if (input.pressureEdge === "east") {
        reverseTrees = true;
      }
    }

    const treatedRows = [];

    for (
      let row = rowStart;
      rowStep === 1 ? row <= rowEnd : row >= rowEnd;
      row += rowStep
    ) {
      const distanceFromStartingEdge =
        Math.abs(row - rowStart);

      if (distanceFromStartingEdge % rowInterval === 0) {
        treatedRows.push(row);
      }
    }

    if (!treatedRows.length) {
      continue;
    }

    const patternARowCount =
      Math.ceil(treatedRows.length / 2);

    const patternBRowCount =
      Math.floor(treatedRows.length / 2);

    const averageDispensersPerTreatedRow =
      targetDispensers / treatedRows.length;

    const minimumPatternACount = Math.max(
      1,
      Math.floor(averageDispensersPerTreatedRow) - 5
    );

    const maximumPatternACount = Math.min(
      treesPerRow,
      Math.ceil(averageDispensersPerTreatedRow) + 5
    );

    for (
      let patternACount = minimumPatternACount;
      patternACount <= maximumPatternACount;
      patternACount++
    ) {
      let possiblePatternBCounts = [];

      if (patternBRowCount === 0) {
        possiblePatternBCounts = [patternACount];
      } else {
        const desiredPatternBCount =
          (
            targetDispensers -
            patternARowCount * patternACount
          ) /
          patternBRowCount;

        possiblePatternBCounts = [
          Math.floor(desiredPatternBCount) - 1,
          Math.floor(desiredPatternBCount),
          Math.ceil(desiredPatternBCount),
          Math.ceil(desiredPatternBCount) + 1
        ];
      }

      possiblePatternBCounts = [
        ...new Set(possiblePatternBCounts)
      ].filter(count =>
        count >= 1 &&
        count <= treesPerRow
      );

      for (const patternBCount of possiblePatternBCounts) {
        const phaseOptions = [
          { phaseA: 0.10, phaseB: 0.60 },
          { phaseA: 0.00, phaseB: 0.50 },
          { phaseA: 0.25, phaseB: 0.75 }
        ];

        for (const phaseOption of phaseOptions) {
          const patternAPositions = orientTreePositions(
            buildEvenTreePattern(
              treesPerRow,
              patternACount,
              phaseOption.phaseA
            ),
            treesPerRow,
            reverseTrees
          );

          const patternBPositions = orientTreePositions(
            buildEvenTreePattern(
              treesPerRow,
              patternBCount,
              phaseOption.phaseB
            ),
            treesPerRow,
            reverseTrees
          );

          const placements = [];

          treatedRows.forEach((row, treatedRowIndex) => {
            const rowPositions =
              treatedRowIndex % 2 === 0
                ? patternAPositions
                : patternBPositions;

            rowPositions.forEach(tree => {
              placements.push({
                row,
                tree
              });
            });
          });

          const count = placements.length;

          if (!count) {
            continue;
          }

          if (
            inventoryIsLimited &&
            count > targetDispensers
          ) {
            continue;
          }

          const resultingRate =
            count / input.acres;

          if (
            input.selectedProduct &&
            resultingRate > input.selectedProduct.max
          ) {
            continue;
          }

          const rateDifference =
            Math.abs(count - targetDispensers);

          const percentOffTarget =
            Math.abs(
              resultingRate - input.targetRate
            ) /
            input.targetRate;

          if (
            !inventoryIsLimited &&
            percentOffTarget > 0.03
          ) {
            continue;
          }

          if (
            inventoryIsLimited &&
            count < targetDispensers * 0.75
          ) {
            continue;
          }

          const coverageQuality =
            scoreCoverageQuality(
              placements,
              orchard,
              input
            );

          const actualAreaPerDispenser =
            blockArea / count;

          const coverageDifferencePercent =
            Math.abs(
              actualAreaPerDispenser -
              targetAreaPerDispenser
            ) /
            targetAreaPerDispenser;

          const averagePatternCount =
            (
              patternAPositions.length +
              patternBPositions.length
            ) / 2;

          const estimatedTreeInterval =
            averagePatternCount > 0
              ? Math.max(
                  1,
                  Math.round(
                    treesPerRow /
                    averagePatternCount
                  )
                )
              : treesPerRow;

          const crewEaseScore =
            rowInterval * 10 +
            Math.abs(
              patternAPositions.length -
              patternBPositions.length
            ) * 25;

          const score =
            coverageQuality.coverageScore +
            rateDifference * 100 +
            coverageDifferencePercent * 500 +
            crewEaseScore;

          candidatePatterns.push({
            patternType: "alternating-ab",
            averageNearestDistance:
              coverageQuality.averageNearestDistance,
            worstNearestDistance:
              coverageQuality.worstNearestDistance,
            coverageScore:
              coverageQuality.coverageScore,
            coverageUniformity:
              coverageQuality.coverageUniformity,
            rowInterval,
            treeInterval: estimatedTreeInterval,
            offset: 1,
            patternAPositions,
            patternBPositions,
            patternACount:
              patternAPositions.length,
            patternBCount:
              patternBPositions.length,
            placements,
            count,
            targetDispensers,
            resultingRate,
            percentOffTarget,
            actualAreaPerDispenser,
            coverageDifferencePercent,
            score
          });
        }
      }
    }
  }

  candidatePatterns.sort((a, b) => {
    if (a.coverageScore !== b.coverageScore) {
      return a.coverageScore - b.coverageScore;
    }

    const rateDifferenceA =
      Math.abs(a.count - targetDispensers);

    const rateDifferenceB =
      Math.abs(b.count - targetDispensers);

    if (rateDifferenceA !== rateDifferenceB) {
      return rateDifferenceA - rateDifferenceB;
    }

    if (
      a.coverageDifferencePercent !==
      b.coverageDifferencePercent
    ) {
      return (
        a.coverageDifferencePercent -
        b.coverageDifferencePercent
      );
    }

    return a.score - b.score;
  });

  const uniquePatterns = [];
  const seen = new Set();

  candidatePatterns.forEach(pattern => {
    const key = [
      pattern.rowInterval,
      pattern.patternACount,
      pattern.patternBCount,
      pattern.patternAPositions.join(","),
      pattern.patternBPositions.join(","),
      pattern.count
    ].join("|");

    if (!seen.has(key)) {
      seen.add(key);
      uniquePatterns.push(pattern);
    }
  });

  if (!uniquePatterns.length) {
    return {
      orchard,
      patterns: []
    };
  }

  const selectedPatterns =
    uniquePatterns.slice(0, 2);

  const selectedDisplayedRate =
    Math.round(input.targetRate);

  const selectedRateAlreadyShown =
    selectedPatterns.some(pattern =>
      Math.round(pattern.resultingRate) ===
      selectedDisplayedRate
    );

  if (selectedRateAlreadyShown) {
    const normalThirdPattern =
      uniquePatterns.find(pattern =>
        !selectedPatterns.includes(pattern)
      );

    if (normalThirdPattern) {
      selectedPatterns.push(normalThirdPattern);
    }
  } else {
    const selectedRatePattern =
      uniquePatterns.find(pattern =>
        !selectedPatterns.includes(pattern) &&
        Math.round(pattern.resultingRate) ===
          selectedDisplayedRate
      );

    if (selectedRatePattern) {
      selectedPatterns.push(selectedRatePattern);
    } else {
      const normalThirdPattern =
        uniquePatterns.find(pattern =>
          !selectedPatterns.includes(pattern)
        );

      if (normalThirdPattern) {
        selectedPatterns.push(normalThirdPattern);
      }
    }
  }

  return {
    orchard,
    patterns: selectedPatterns
  };
}
function generatePlans() {
  const input = getInputs();

  if (
    !Number.isFinite(input.acres) ||
    input.acres <= 0 ||
    !Number.isFinite(input.rows) ||
    input.rows <= 0 ||
    !Number.isFinite(input.rowSpacing) ||
    input.rowSpacing <= 0 ||
    !Number.isFinite(input.treeSpacing) ||
    input.treeSpacing <= 0 ||
    !Number.isFinite(input.targetRate) ||
    input.targetRate <= 0
  ) {
    alert(
      "Please enter acreage, number of rows, row spacing, tree spacing, and dispenser rate before generating plans."
    );
    return;
  }

input.labelTargetDispensers =
  Math.round(input.acres * input.targetRate);

input.inventoryIsLimited =
  input.availableDispensers &&
  input.availableDispensers < input.labelTargetDispensers;

const engineResults = getBestPatterns(input);

input.targetDispensers =
  input.inventoryIsLimited
    ? input.availableDispensers
    : input.labelTargetDispensers;


  input.targetAreaPerDispenser = 43560 / input.targetRate;
  input.estimatedRowLength = engineResults.orchard.rowLength;
  input.treesPerRow = engineResults.orchard.treesPerRow;

  currentInput = input;
  currentPlans = engineResults.patterns.map(pattern =>
  convertEnginePatternToUiPlan(pattern, engineResults.orchard, input)
);

assignPatternBadges(currentPlans);

  

  renderSummary(input, engineResults.orchard.trees.length);
  renderOptions(currentPlans);
  showOptionsScreen();
}

function convertEnginePatternToUiPlan(pattern, orchard, input) {
  const layout = [];

  for (let r = 0; r < orchard.rows; r++) {
    layout.push(Array(orchard.treesPerRow).fill(false));
  }

  pattern.placements.forEach(place => {
    layout[place.row - 1][place.tree - 1] = true;
  });

  return {
    ...pattern,
    label: "Optimized Pattern",
    note: "",
    layout,
    actualRate: pattern.resultingRate,
    percentRateDifference:
      Math.abs(pattern.count - pattern.targetDispensers) /
      pattern.targetDispensers,
    percentCoverageDifference: pattern.coverageDifferencePercent,
    betweenRowsFeet: pattern.rowInterval * input.rowSpacing,
    betweenTreesFeet: pattern.treeInterval * input.treeSpacing,
    actualAreaPerDispenser: pattern.actualAreaPerDispenser
  };
}

function assignPatternBadges(plans) {
  if (!plans.length) return;

  const coverageBest = [...plans].sort(
    (a, b) => a.percentCoverageDifference - b.percentCoverageDifference
  )[0];

  const simplest = [...plans].sort(
    (a, b) => (a.rowInterval + a.treeInterval) - (b.rowInterval + b.treeInterval)
  )[0];

  const staggered = plans.find(plan => plan.offset > 0);

  coverageBest.label = "Best Coverage Match";

  if (simplest && simplest !== coverageBest) {
    simplest.label = "Simplest for Crews";
  }

  if (staggered && staggered.label === "Optimized Pattern") {
    staggered.label = "Best Staggered Coverage";
  }

  plans.forEach((plan, index) => {
    if (!plan.label || plan.label === "Optimized Pattern") {
      plan.label = `Selectable Pattern ${index + 1}`;
    }
  });
}

function getPlanNote(plan) {
  if (plan.label === "Best Coverage Match") {
    return "Closest match to the expected square feet covered per dispenser.";
  }

  if (plan.label === "Simplest for Crews") {
    return "Simplest repeatable spacing pattern for field crews.";
  }

  if (plan.label === "Best Staggered Coverage") {
    return "Uses a staggered layout to improve distribution across treated rows.";
  }

  return "Another valid pattern within the allowed rate range.";
}

function renderSummary(input, totalTrees) {
  summaryEl.classList.remove("hidden");

  summaryEl.innerHTML = `
   <h2>Choose a Deployment Pattern</h2>
${
  input.selectedProduct
    ? `<p class="muted"><strong>Selected product:</strong> ${input.selectedProduct.name}. Label range ${input.selectedProduct.min}-${input.selectedProduct.max} ${input.selectedProduct.unit}.</p>`
    : `<p class="muted"><strong>Manual rate entry:</strong> No product selected.</p>`
}
${
  input.inventoryIsLimited
    ? `<p class="muted"><strong>Limited inventory mode:</strong> Available dispensers are below the label-rate target. These patterns show the best practical distribution for the amount entered.</p>`
    : ``
}

    <div class="stats">
      <div class="stat">
        <span class="muted">Target Dispensers</span>
        <strong>${input.targetDispensers}</strong>
        <span class="muted">total</span>
      </div>

      <div class="stat">
        <span class="muted">Target Rate</span>
        <strong>${Math.round(input.targetRate)}</strong>
        <span class="muted">per acre</span>
      </div>

      <div class="stat">
        <span class="muted">Expected Coverage</span>
        <strong>${input.targetAreaPerDispenser.toFixed(0)}</strong>
        <span class="muted">sq ft / dispenser</span>
      </div>

      <div class="stat">
        <span class="muted">Estimated Trees</span>
        <strong>${totalTrees}</strong>
        <span class="muted">total</span>
      </div>
    </div>
  `;
}

function renderOptions(plans) {
  optionsEl.innerHTML = "";

  if (!plans.length) {
    optionsEl.innerHTML = `
      <section class="option-card">
        <strong>No qualifying patterns were generated.</strong>
        <p class="muted">
          The entered block dimensions could not produce a pattern within
          the current rate limits.
        </p>
      </section>
    `;

    return;
  }

  plans.forEach((plan, index) => {
  const repeatedMatch = plans.some((otherPlan, otherIndex) =>
    otherIndex !== index &&
    Math.round(otherPlan.actualRate) === Math.round(plan.actualRate) &&
    otherPlan.percentCoverageDifference.toFixed(3) === plan.percentCoverageDifference.toFixed(3)
  );
    const card = document.createElement("section");
    card.className = "option-card";

   card.innerHTML = `
  <span class="badge">Pattern ${index + 1}</span>

  <div class="stats compact-stats">
    <div class="stat">
      <span class="muted">Coverage Fit</span>
      <strong>${(100 - plan.percentCoverageDifference * 100).toFixed(1)}%</strong>
      <span class="muted">of target</span>
    </div>

    <div class="stat">
      <span class="muted">Rate</span>
      <strong>${Math.round(plan.actualRate)}</strong>
      <span class="muted">per acre</span>
    </div>

    <div class="stat">
      <span class="muted">Total</span>
      <strong>${plan.count}</strong>
      <span class="muted">dispensers</span>
    </div>
  </div>

  ${
    repeatedMatch
      ? `<p class="muted">Same rate and coverage fit as another option, but with a different spacing pattern.</p>`
      : `<p class="muted">Tap to view pattern details.</p>`
  }
`;

    card.addEventListener("click", () => {
      showPlanScreen(plan);
    });

    optionsEl.appendChild(card);
  });
}

function describePattern(plan) {
  const rowText =
    plan.rowInterval === 1
      ? "every row"
      : `every ${ordinal(plan.rowInterval)} row`;

  if (plan.patternType === "alternating-ab") {
    const describeRowPattern = positions => {
      if (!positions || positions.length < 2) {
        return positions && positions.length
          ? `place one dispenser at Tree ${positions[0]}`
          : "place dispensers evenly across the row";
      }

      const gaps = [];

      for (let index = 1; index < positions.length; index++) {
        gaps.push(positions[index] - positions[index - 1]);
      }

      const gapCounts = new Map();

      gaps.forEach(gap => {
        gapCounts.set(gap, (gapCounts.get(gap) || 0) + 1);
      });

      const sortedGaps = [...gapCounts.entries()]
        .sort((a, b) => b[1] - a[1]);

      const mainGap = sortedGaps[0][0];
      const secondGap =
        sortedGaps.length > 1
          ? sortedGaps[1][0]
          : null;

      const startTree = positions[0];

      if (secondGap === null) {
        return `start at Tree ${startTree} and place a dispenser every ${mainGap} trees`;
      }

      if (Math.abs(mainGap - secondGap) === 1) {
        return `start at Tree ${startTree} and alternate approximately every ${mainGap} to ${secondGap} trees`;
      }

      return `start at Tree ${startTree} and space dispensers as evenly as possible, averaging about every ${mainGap} trees`;
    };

    const patternADescription =
      describeRowPattern(plan.patternAPositions);

    const patternBDescription =
      describeRowPattern(plan.patternBPositions);

    return `Treat ${rowText}. On the first treated row, ${patternADescription}. On the next treated row, ${patternBDescription}. Continue alternating these two row patterns through the block. Count trees from the selected highest-pressure edge.`;
  }

  const treeText =
    plan.treeInterval === 1
      ? "every tree"
      : `every ${ordinal(plan.treeInterval)} tree`;

  if (plan.offset > 0) {
    const startTree = 1 + plan.offset;

    return `Treat ${rowText}. On the first treated row, place a dispenser on ${treeText}, starting at Tree 1. On the next treated row, use the same spacing starting at Tree ${startTree}. Continue alternating through the block.`;
  }

  return `Treat ${rowText}. Place a dispenser on ${treeText}, starting at Tree 1 from the selected highest-pressure edge.`;
}
function selectPlan(plan, input) {
  mapSection.classList.remove("hidden");
  instructionsEl.classList.remove("hidden");

  selectedPlanText.innerHTML = `
    <button class="secondary-button" onclick="showOptionsScreen()">
      Back to Pattern Options
    </button>
    <br><br>
   <strong>Pattern Details</strong><br>
    ${describePattern(plan)}
  `;

 renderMap(plan.layout, input);
  renderInstructions(plan, input);
}

function renderMap(layout, input) {
  mapEl.innerHTML = "";

  const previewTitle = document.createElement("h3");
previewTitle.textContent = "Pattern Preview";
mapEl.appendChild(previewTitle);

const mapContext = document.createElement("p");
mapContext.className = "muted";
mapContext.innerHTML = `
  Rows: <strong>${input.rowDirection === "east-west" ? "East–West" : "North–South"}</strong>
  <br>
  Highest pressure edge: <strong>${input.pressureEdge === "none" ? "None" : input.pressureEdge.toUpperCase()}</strong>
`;
mapEl.appendChild(mapContext);

  const preview = buildMapView(
    layout,
    12,
    40,
    "orchard-map preview-map",
    input
  );

  mapEl.appendChild(preview);

  const overviewTitle = document.createElement("h3");
  overviewTitle.textContent = "Whole Block Overview";
  mapEl.appendChild(overviewTitle);

  const expandBtn = document.createElement("button");
  expandBtn.className = "secondary-button";
  expandBtn.textContent = "Show Whole Block Map";
  mapEl.appendChild(expandBtn);

  let overviewVisible = false;
  let overview = null;

  expandBtn.addEventListener("click", () => {
    overviewVisible = !overviewVisible;

    if (overviewVisible) {
      expandBtn.textContent = "Hide Whole Block Map";

      overview = buildMapView(
        layout,
        layout.length,
        layout[0].length,
        "orchard-map overview-map",
        input
      );

      mapEl.appendChild(overview);
    } else {
      expandBtn.textContent = "Show Whole Block Map";

      if (overview) {
        overview.remove();
        overview = null;
      }
    }
  });
}

function buildMapView(layout, maxRows, maxTrees, className, input) {
  const totalRows = layout.length;
  const totalTrees = layout[0].length;

  const rows = Math.min(totalRows, maxRows);
  const treesPerRow = Math.min(totalTrees, maxTrees);

  let rowStartIndex = 0;
  let treeStartIndex = 0;

  if (input.pressureEdge === "south" && input.rowDirection === "north-south") {
    treeStartIndex = Math.max(0, totalTrees - treesPerRow);
  }

  if (input.pressureEdge === "north" && input.rowDirection === "north-south") {
    treeStartIndex = 0;
  }

  if (input.pressureEdge === "east" && input.rowDirection === "north-south") {
    rowStartIndex = Math.max(0, totalRows - rows);
  }

  if (input.pressureEdge === "west" && input.rowDirection === "north-south") {
    rowStartIndex = 0;
  }

  if (input.pressureEdge === "south" && input.rowDirection === "east-west") {
    rowStartIndex = Math.max(0, totalRows - rows);
  }

  if (input.pressureEdge === "north" && input.rowDirection === "east-west") {
    rowStartIndex = 0;
  }

  if (input.pressureEdge === "east" && input.rowDirection === "east-west") {
    treeStartIndex = Math.max(0, totalTrees - treesPerRow);
  }

  if (input.pressureEdge === "west" && input.rowDirection === "east-west") {
    treeStartIndex = 0;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "map-wrapper";

  const northLabel = document.createElement("div");
  northLabel.className = "map-direction north-label";
  northLabel.textContent = "N";
  wrapper.appendChild(northLabel);

  const middle = document.createElement("div");
  middle.className = "map-middle";

  const westLabel = document.createElement("div");
  westLabel.className = "map-direction side-label";
  westLabel.textContent = "W";
  middle.appendChild(westLabel);

  const orchardEl = document.createElement("div");
  orchardEl.className = className;

  if (input.rowDirection === "east-west") {
    for (let rowIndex = rowStartIndex; rowIndex < rowStartIndex + rows; rowIndex++) {
      const treeLine = document.createElement("div");
      treeLine.className = "tree-line";

      for (let treeIndex = treeStartIndex; treeIndex < treeStartIndex + treesPerRow; treeIndex++) {
        const tree = document.createElement("div");

        tree.className = layout[rowIndex][treeIndex]
          ? "tree dispenser"
          : "tree";

        treeLine.appendChild(tree);
      }

      orchardEl.appendChild(treeLine);
    }
  } else {
    for (let treeIndex = treeStartIndex; treeIndex < treeStartIndex + treesPerRow; treeIndex++) {
      const treeLine = document.createElement("div");
      treeLine.className = "tree-line";

      for (let rowIndex = rowStartIndex; rowIndex < rowStartIndex + rows; rowIndex++) {
        const tree = document.createElement("div");

        tree.className = layout[rowIndex][treeIndex]
          ? "tree dispenser"
          : "tree";

        treeLine.appendChild(tree);
      }

      orchardEl.appendChild(treeLine);
    }
  }

  middle.appendChild(orchardEl);

  const eastLabel = document.createElement("div");
  eastLabel.className = "map-direction side-label";
  eastLabel.textContent = "E";
  middle.appendChild(eastLabel);

  wrapper.appendChild(middle);

  const southLabel = document.createElement("div");
  southLabel.className = "map-direction south-label";
  southLabel.textContent = "S";
  wrapper.appendChild(southLabel);

  return wrapper;
}

function renderInstructions(plan, input) {
  const difference = plan.count - input.targetDispensers;
  const percentDifference = plan.percentRateDifference * 100;

  const extraDispensers =
    input.availableDispensers && plan.count < input.availableDispensers
      ? input.availableDispensers - plan.count
      : 0;

  instructionsEl.innerHTML = `
    <h2>Field Instructions</h2>

    <p><strong>${describePattern(plan)}</strong></p>

    <ul class="instructions-list">
      <li>Target dispensers: ${input.targetDispensers}</li>
      <li>Pattern uses: ${plan.count}</li>

      ${
        extraDispensers > 0
          ? `<li>Use the remaining ${extraDispensers} dispenser${extraDispensers === 1 ? "" : "s"} on the riskiest border or highest-pressure edge.</li>`
          : ``
      }

      <li>Difference from target: ${difference > 0 ? "+" : ""}${difference}</li>
      <li>Rate difference: ${percentDifference.toFixed(1)}%</li>
      <li>Expected coverage area: ${input.targetAreaPerDispenser.toFixed(0)} sq ft per dispenser</li>
      <li>Pattern coverage area: ${plan.actualAreaPerDispenser.toFixed(0)} sq ft per dispenser</li>
      <li>Coverage difference: ${(plan.percentCoverageDifference * 100).toFixed(1)}%</li>
      <li>Estimated row length: ${input.estimatedRowLength.toFixed(0)} ft</li>
      <li>Estimated trees per row: ${input.treesPerRow}</li>
    </ul>

    <button class="secondary-button" onclick="showOptionsScreen()">
      Back to Pattern Options
    </button>
  `;
}
function ordinal(number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = number % 100;

  return number + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
}
