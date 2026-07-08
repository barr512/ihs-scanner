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

let currentInput = null;
let currentPlans = [];

generateBtn.addEventListener("click", generatePlans);

if (backBtn) {
  backBtn.addEventListener("click", showSetupScreen);
}

function getInputs() {
  return {
    acres: Number(document.getElementById("acres").value),
    rows: Number(document.getElementById("rows").value),
    rowSpacing: Number(document.getElementById("rowSpacing").value),
    treeSpacing: Number(document.getElementById("treeSpacing").value),
    targetRate: Number(document.getElementById("rate").value),
    pressureEdge: document.getElementById("pressureEdge").value
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
  let totalNearestDistance = 0;
  let worstNearestDistance = 0;

  orchard.trees.forEach(tree => {
    let nearestDistance = Infinity;

    placements.forEach(place => {
      const rowDistance =
        Math.abs(tree.row - place.row) * input.rowSpacing;

      const treeDistance =
        Math.abs(tree.tree - place.tree) * input.treeSpacing;

      const distance = Math.sqrt(
        rowDistance ** 2 + treeDistance ** 2
      );

      nearestDistance = Math.min(nearestDistance, distance);
    });

    totalNearestDistance += nearestDistance;
    worstNearestDistance = Math.max(worstNearestDistance, nearestDistance);
  });

  const averageNearestDistance =
    totalNearestDistance / orchard.trees.length;

  return {
    averageNearestDistance,
    worstNearestDistance,
    coverageScore:
      averageNearestDistance * 1 +
      worstNearestDistance * 2
  };
}
function getBestPatterns(input) {
  const SQFT_PER_ACRE = 43560;

  const blockArea = input.acres * SQFT_PER_ACRE;
  const totalRowFeet = blockArea / input.rowSpacing;
  const rowLength = totalRowFeet / input.rows;
  const treesPerRow = Math.round(rowLength / input.treeSpacing);
  const targetDispensers = Math.round(input.acres * input.targetRate);
  const targetAreaPerDispenser = SQFT_PER_ACRE / input.targetRate;

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

  for (let rowInterval = 1; rowInterval <= Math.min(10, input.rows); rowInterval++) {
    for (let treeInterval = 1; treeInterval <= Math.min(40, treesPerRow); treeInterval++) {
      for (const offset of [0, Math.floor(treeInterval / 2)]) {
        const placements = [];
        let treatedRowIndex = 0;

        const rowStart = input.pressureEdge === "south" ? input.rows : 1;
const rowEnd = input.pressureEdge === "south" ? 1 : input.rows;
const rowStep = input.pressureEdge === "south" ? -1 : 1;

for (let row = rowStart; input.pressureEdge === "south" ? row >= rowEnd : row <= rowEnd; row += rowStep) {
  const rowDistanceFromPressureEdge = Math.abs(row - rowStart);

  if (rowDistanceFromPressureEdge % rowInterval !== 0) continue;

  const rowOffset = treatedRowIndex % 2 === 0 ? 0 : offset;

          for (let idealTree = 1 + rowOffset; idealTree <= treesPerRow; idealTree += treeInterval) {
            const closestTree = Math.max(
              1,
              Math.min(treesPerRow, Math.round(idealTree))
            );

            placements.push({
              row,
              tree: closestTree
            });
          }

          treatedRowIndex++;
        }

        const count = placements.length;
        if (count === 0) continue;

        const resultingRate = count / input.acres;
        const rateDifference = Math.abs(count - targetDispensers);
        const percentOffTarget = rateDifference / targetDispensers;

        if (percentOffTarget > 0.10) continue;

        const actualAreaPerDispenser =
          rowInterval *
          input.rowSpacing *
          treeInterval *
          input.treeSpacing;
const coverageQuality = scoreCoverageQuality(
  placements,
  orchard,
  input
);
        const coverageDifferencePercent =
          Math.abs(actualAreaPerDispenser - targetAreaPerDispenser) /
          targetAreaPerDispenser;

        const staggerBonus = offset > 0 ? -500 : 0;


const crewEaseScore =
  rowInterval * -10 + treeInterval;

const score =
  coverageQuality.coverageScore * 100 +
  rateDifference * 100 +
  crewEaseScore +
  staggerBonus;

        candidatePatterns.push({
         averageNearestDistance: coverageQuality.averageNearestDistance,
worstNearestDistance: coverageQuality.worstNearestDistance,
coverageScore: coverageQuality.coverageScore,
          rowInterval,
          treeInterval,
          offset,
          placements,
          count,
          targetDispensers,
          resultingRate,
          actualAreaPerDispenser,
          coverageDifferencePercent,
          score
        });
      }
    }
  }

  const uniquePatterns = [];
  const seen = new Set();

  candidatePatterns
   .sort((a, b) => {
  const scoreDifference = a.score - b.score;

  if (Math.abs(scoreDifference) < 1) {
    return b.offset - a.offset;
  }

  return scoreDifference;
})
    .forEach(pattern => {
      const key = `${pattern.rowInterval}-${pattern.treeInterval}-${pattern.offset}-${pattern.count}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniquePatterns.push(pattern);
      }
    });

  const bestPattern = uniquePatterns[0];

const preferredPatterns = uniquePatterns.filter(pattern => {
  if (pattern === bestPattern) return true;
  return pattern.offset > 0;
});

return {
  orchard,
  patterns: preferredPatterns.slice(0, 3)
};
}

function generatePlans() {
  

  const input = getInputs();


  const engineResults = getBestPatterns(input);

  input.targetDispensers = Math.round(input.acres * input.targetRate);
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

  plans.forEach((plan, index) => {
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

  <p class="muted">Tap to view pattern details.</p>
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

  const treeText =
    plan.treeInterval === 1
      ? "every tree"
      : `every ${ordinal(plan.treeInterval)} tree`;

  if (plan.offset > 0) {
    const startTree = 1 + plan.offset;

    return `Place on ${treeText} in ${rowText}. Start the first treated row on Tree 1. Start the next treated row on Tree ${startTree}, then continue alternating those starting positions through the block.`;
  }

  return `Place on ${treeText} in ${rowText}, starting on Tree 1.`;
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

  renderMap(plan.layout);
  renderInstructions(plan, input);
}

function renderMap(layout) {
  mapEl.innerHTML = "";

  const previewTitle = document.createElement("h3");
  previewTitle.textContent = "Pattern Preview";
  mapEl.appendChild(previewTitle);

  const preview = buildMapView(
    layout,
    12,
    40,
    "orchard-map preview-map"
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
      "orchard-map overview-map"
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

function buildMapView(layout, maxRows, maxTrees, className) {
  const rows = Math.min(layout.length, maxRows);
  const treesPerRow = Math.min(layout[0].length, maxTrees);

  const orchardEl = document.createElement("div");
  orchardEl.className = className;

  for (let treeIndex = 0; treeIndex < treesPerRow; treeIndex++) {
    const treeLine = document.createElement("div");
    treeLine.className = "tree-line";

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const tree = document.createElement("div");

      tree.className =
        layout[rowIndex][treeIndex]
          ? "tree dispenser"
          : "tree";

      treeLine.appendChild(tree);
    }

    orchardEl.appendChild(treeLine);
  }

  return orchardEl;
}

function renderInstructions(plan, input) {
  const difference = plan.count - input.targetDispensers;
  const percentDifference = plan.percentRateDifference * 100;

  instructionsEl.innerHTML = `
    <h2>Field Instructions</h2>

    <p><strong>${describePattern(plan)}</strong></p>

    <ul class="instructions-list">
      <li>Target dispensers: ${input.targetDispensers}</li>
      <li>Pattern uses: ${plan.count}</li>
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
