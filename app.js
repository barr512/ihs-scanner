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
    crewSize: Number(document.getElementById("crewSize").value)
  };
}

function showSetupScreen() {
  setupScreen.classList.remove("hidden");
  resultsScreen.classList.add("hidden");
}

function showOptionsScreen() {
  setupScreen.classList.add("hidden");
  resultsScreen.classList.remove("hidden");

  summaryEl.classList.remove("hidden");
  optionsEl.classList.remove("hidden");

  mapSection.classList.add("hidden");
  instructionsEl.classList.add("hidden");
}

function showPlanScreen(plan) {
  setupScreen.classList.add("hidden");
  resultsScreen.classList.remove("hidden");

  summaryEl.classList.add("hidden");
  optionsEl.classList.add("hidden");

  selectPlan(plan, currentInput);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}
function getBestPatterns(input) {
  const SQFT_PER_ACRE = 43560;

  const blockArea = input.acres * SQFT_PER_ACRE;
  const totalRowFeet = blockArea / input.rowSpacing;
  const rowLength = totalRowFeet / input.rows;
  const treesPerRow = Math.round(rowLength / input.treeSpacing);

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

  const targetDispensers = Math.round(input.acres * input.targetRate);

  const candidatePatterns = [];

  for (let rowInterval = 1; rowInterval <= Math.min(10, input.rows); rowInterval++) {
    for (let treeInterval = 1; treeInterval <= Math.min(40, treesPerRow); treeInterval++) {
      for (let offset of [0, Math.floor(treeInterval / 2)]) {
        const placements = [];

        for (let row = 1; row <= input.rows; row++) {
          if ((row - 1) % rowInterval !== 0) continue;

          const rowOffset = row % 2 === 0 ? offset : 0;

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
        }

        const count = placements.length;
const resultingRate = count / input.acres;
const rateDifference = Math.abs(count - targetDispensers);
const percentOffTarget = rateDifference / targetDispensers;

if (percentOffTarget > 0.03) continue;

        const areaPerDispenser =
          rowInterval *
          input.rowSpacing *
          treeInterval *
          input.treeSpacing;

        const targetAreaPerDispenser = SQFT_PER_ACRE / input.targetRate;

        const areaDifference = Math.abs(
          areaPerDispenser - targetAreaPerDispenser
        );

        const score =
          rateDifference * 1000 +
          areaDifference +
          rowInterval * 5 +
          treeInterval;

        candidatePatterns.push({
          rowInterval,
          treeInterval,
          offset,
          placements,
          count,
          targetDispensers,
          resultingRate,
          score
        });
      }
    }
  }

    const uniquePatterns = [];
  const seen = new Set();

  candidatePatterns
    .sort((a, b) => {
      const aStaggered = a.offset > 0;
      const bStaggered = b.offset > 0;

      if (aStaggered !== bStaggered) {
        return aStaggered ? -1 : 1;
      }

      return a.score - b.score;
    })
    .forEach(pattern => {
      const key = `${pattern.rowInterval}-${pattern.treeInterval}-${pattern.offset}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniquePatterns.push(pattern);
      }
    });

  const patterns = uniquePatterns.slice(0, 3);

  return {
    orchard,
    patterns
  };
}

function generatePlans() {
  const input = getInputs();

  const engineResults = getBestPatterns(input);
  console.log(engineResults);

  input.targetDispensers = Math.round(input.acres * input.targetRate);
  input.targetAreaPerDispenser = 43560 / input.targetRate;
  input.estimatedRowLength = engineResults.orchard.rowLength;
  input.treesPerRow = engineResults.orchard.treesPerRow;

  currentInput = input;
  currentPlans = engineResults.patterns.map(pattern =>
    convertEnginePatternToUiPlan(pattern, engineResults.orchard, input)
  );

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
    label: getPlanLabel(pattern),
    note: getPlanNote(pattern),
    layout,
    actualRate: pattern.resultingRate,
    percentRateDifference:
      Math.abs(pattern.count - pattern.targetDispensers) /
      pattern.targetDispensers,
    betweenRowsFeet: pattern.rowInterval * input.rowSpacing,
    betweenTreesFeet: pattern.treeInterval * input.treeSpacing,
    actualAreaPerDispenser:
      pattern.rowInterval *
      input.rowSpacing *
      pattern.treeInterval *
      input.treeSpacing
  };
}

function getPlanLabel(pattern) {
  if (currentPlans.length === 0) return "Recommended";
  if (currentPlans.length === 1) return "Alternative";
  return "Crew Friendly";
}

function getPlanNote(pattern) {
  if (currentPlans.length === 0) {
    return "Best overall pattern from the coverage engine.";
  }

  if (currentPlans.length === 1) {
    return "A second valid repeatable pattern.";
  }

  return "A repeatable option that may be easier for some crews.";
}
function renderSummary(input, totalTrees) {
  summaryEl.classList.remove("hidden");

  summaryEl.innerHTML = `
    <h2>Coverage Plan</h2>

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
        <span class="muted">Coverage Area</span>
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
      <span class="badge">${plan.label}</span>
      <h3>${describePattern(plan)}</h3>
      <p class="muted">${plan.note}</p>

      <div class="stats">
        <div class="stat">
          <span class="muted">Pattern Uses</span>
          <strong>${plan.count}</strong>
          <span class="muted">dispensers</span>
        </div>

        <div class="stat">
          <span class="muted">Resulting Rate</span>
          <strong>${Math.round(plan.actualRate)}</strong>
          <span class="muted">per acre</span>
        </div>

        <div class="stat">
          <span class="muted">Dispenser Rows</span>
          <strong>${plan.betweenRowsFeet.toFixed(0)}</strong>
          <span class="muted">ft apart</span>
        </div>

        <div class="stat">
          <span class="muted">In-Row Spacing</span>
          <strong>${plan.betweenTreesFeet.toFixed(0)}</strong>
          <span class="muted">ft apart</span>
        </div>
                <div class="stat">
          <span class="muted">Coverage Difference</span>
          <strong>${((Math.abs(plan.actualAreaPerDispenser - currentInput.targetAreaPerDispenser) / currentInput.targetAreaPerDispenser) * 100).toFixed(1)}%</strong>
          <span class="muted">from target</span>
        </div>
      </div>

      <p class="muted">Tap to view schematic.</p>
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

  const staggerText =
    plan.offset > 0
      ? " with alternating-end stagger"
      : "";

  return `Place on ${treeText} in ${rowText}${staggerText}.`;
}
function selectPlan(plan, input) {
  mapSection.classList.remove("hidden");
  instructionsEl.classList.remove("hidden");

  selectedPlanText.innerHTML = `
  <button class="secondary-button" onclick="showOptionsScreen()">
    Back to Plan Options
  </button>
  <br><br>
  ${describePattern(plan)}
`;

  renderMap(plan.layout);
  renderInstructions(plan, input);
}

function renderMap(layout) {
  mapEl.innerHTML = "";

  // ---------- Pattern Preview ----------

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

  // ---------- Whole Orchard ----------

  const overviewTitle = document.createElement("h3");
  overviewTitle.textContent = "Whole Block Overview";
  mapEl.appendChild(overviewTitle);

  const overview = buildMapView(
    layout,
    layout.length,
    layout[0].length,
    "orchard-map overview-map"
  );

  mapEl.appendChild(overview);
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
      <li>Target coverage area: ${input.targetAreaPerDispenser.toFixed(0)} sq ft per dispenser</li>
      <li>Pattern grid area: ${plan.actualAreaPerDispenser.toFixed(0)} sq ft</li>
      <li>Estimated row length: ${input.estimatedRowLength.toFixed(0)} ft</li>
      <li>Estimated trees per row: ${input.treesPerRow}</li>
      <li>${getCrewInstructions(input)}</li>
    </ul>

    <button class="secondary-button" onclick="showOptionsScreen()">
      Back to Plan Options
    </button>
  `;
}

function getCrewInstructions(input) {
  if (input.crewSize === 1) {
    return "One person mode: start Row 1 from one end, then start Row 2 from the opposite end. Continue alternating starting ends through the block.";
  }

  return `${input.crewSize}-person crew mode: divide rows evenly among workers. Each worker should use the same alternating-start pattern within their assigned rows.`;
}

function ordinal(number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = number % 100;

  return number + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
}
