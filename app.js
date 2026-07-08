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
let currentInput = null;
let currentPlans = [];

generateBtn.addEventListener("click", generatePlans);

if (backBtn) {
  backBtn.addEventListener("click", showSetupScreen);
}
if (topBackBtn) {
  topBackBtn.addEventListener("click", showSetupScreen);
}
function getInputs() {
  return {
  acres: Number(document.getElementById("acres").value),
  rows: Number(document.getElementById("rows").value),
  rowSpacing: Number(document.getElementById("rowSpacing").value),
  treeSpacing: Number(document.getElementById("treeSpacing").value),
  targetRate: Number(document.getElementById("rate").value),
  availableDispensers: Number(document.getElementById("availableDispensers").value) || null,
  rowDirection: document.getElementById("rowDirection").value,
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

  const rowCounts = new Map();
  const treeCounts = new Map();

  placements.forEach(place => {
    rowCounts.set(place.row, (rowCounts.get(place.row) || 0) + 1);
    treeCounts.set(place.tree, (treeCounts.get(place.tree) || 0) + 1);
  });

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

  const rowUseSpread = Math.max(...rowCounts.values()) - Math.min(...rowCounts.values());
  const treeUseSpread = Math.max(...treeCounts.values()) - Math.min(...treeCounts.values());

  const clusterPenalty =
  rowUseSpread * 10 +
  treeUseSpread * 25;

  const coverageScore =
    averageNearestDistance * 1 +
    worstNearestDistance * 2 +
    clusterPenalty * 5;

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

function getBestPatterns(input) {
  const SQFT_PER_ACRE = 43560;

  const blockArea = input.acres * SQFT_PER_ACRE;
  const totalRowFeet = blockArea / input.rowSpacing;
  const rowLength = totalRowFeet / input.rows;
  const treesPerRow = Math.round(rowLength / input.treeSpacing);

  const labelTargetDispensers = Math.round(input.acres * input.targetRate);

const inventoryIsLimited =
  input.availableDispensers &&
  input.availableDispensers < labelTargetDispensers;

const targetDispensers = inventoryIsLimited
  ? input.availableDispensers
  : labelTargetDispensers;

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

        const rowsRunNorthSouth = input.rowDirection === "north-south";

        let rowStart = 1;
        let rowEnd = input.rows;
        let rowStep = 1;

        let treeStart = 1;
        let treeEnd = treesPerRow;
        let treeStep = treeInterval;

        if (rowsRunNorthSouth) {
          if (input.pressureEdge === "east") {
            rowStart = input.rows;
            rowEnd = 1;
            rowStep = -1;
          }

          if (input.pressureEdge === "south") {
            treeStart = treesPerRow;
            treeEnd = 1;
            treeStep = -treeInterval;
          }
        } else {
          if (input.pressureEdge === "south") {
            rowStart = input.rows;
            rowEnd = 1;
            rowStep = -1;
          }

          if (input.pressureEdge === "east") {
            treeStart = treesPerRow;
            treeEnd = 1;
            treeStep = -treeInterval;
          }
        }

        for (
          let row = rowStart;
          rowStep === 1 ? row <= rowEnd : row >= rowEnd;
          row += rowStep
        ) {
          const rowDistanceFromPressureEdge = Math.abs(row - rowStart);

          if (rowDistanceFromPressureEdge % rowInterval !== 0) continue;

          const rowOffset = treatedRowIndex % 2 === 0 ? 0 : offset;

          let adjustedTreeStart = treeStart;

          if (treeStep > 0) {
            adjustedTreeStart = treeStart + rowOffset;
          } else {
            adjustedTreeStart = treeStart - rowOffset;
          }

          for (
            let idealTree = adjustedTreeStart;
            treeStep > 0 ? idealTree <= treeEnd : idealTree >= treeEnd;
            idealTree += treeStep
          ) {
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

        // Limited inventory rule:
        // never recommend a pattern that uses more dispensers than the grower has.
        if (inventoryIsLimited && count > targetDispensers) continue;

        const resultingRate = count / input.acres;
        const rateDifference = Math.abs(count - targetDispensers);
        const percentOffTarget = rateDifference / targetDispensers;

        // Normal label-rate mode allows up to 10% off target.
        if (!inventoryIsLimited && percentOffTarget > 0.10) continue;

        // Limited inventory mode allows lower repeatable patterns,
        // because leftovers can be placed on the highest-risk border.
        if (inventoryIsLimited && count < targetDispensers * 0.75) continue;

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
          coverageDifferencePercent * 1000 +
          rateDifference * 100 +
          coverageQuality.coverageScore +
          crewEaseScore +
          staggerBonus;

        candidatePatterns.push({
          averageNearestDistance: coverageQuality.averageNearestDistance,
          worstNearestDistance: coverageQuality.worstNearestDistance,
          coverageScore: coverageQuality.coverageScore,
          coverageUniformity: coverageQuality.coverageUniformity,
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
      // 1. Best coverage fit first
      if (a.coverageDifferencePercent !== b.coverageDifferencePercent) {
        return a.coverageDifferencePercent - b.coverageDifferencePercent;
      }

      // 2. Then closest dispenser count/rate
      const rateDifferenceA = Math.abs(a.count - targetDispensers);
      const rateDifferenceB = Math.abs(b.count - targetDispensers);

      if (rateDifferenceA !== rateDifferenceB) {
        return rateDifferenceA - rateDifferenceB;
      }

      // 3. Then actual spacing quality
      if (a.coverageScore !== b.coverageScore) {
        return a.coverageScore - b.coverageScore;
      }

      // 4. Prefer staggered layouts if still tied
      if (a.offset !== b.offset) {
        return b.offset - a.offset;
      }

      return a.score - b.score;
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

input.inventoryIsLimited =
  input.availableDispensers &&
  input.availableDispensers < input.labelTargetDispensers;
  const engineResults = getBestPatterns(input);

  input.labelTargetDispensers = Math.round(input.acres * input.targetRate);

input.targetDispensers =
  input.availableDispensers &&
  input.availableDispensers < input.labelTargetDispensers
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
  input.inventoryIsLimited && plan.count < input.targetDispensers
    ? input.targetDispensers - plan.count
    : 0;
  instructionsEl.innerHTML = `
    <h2>Field Instructions</h2>

    <p><strong>${describePattern(plan)}</strong></p>

    <ul class="instructions-list">
      <li>Target dispensers: ${input.targetDispensers}</li>
      <li>Pattern uses: ${plan.count}</li>
      <li>Difference from target: ${difference > 0 ? "+" : ""}${difference}</li>
      ${
  extraDispensers > 0
    ? `<li>Place remaining ${extraDispensers} dispenser${extraDispensers === 1 ? "" : "s"} along the riskiest border or highest-pressure edge.</li>`
    : ``
}
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
