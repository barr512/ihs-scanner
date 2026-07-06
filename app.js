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

let currentPlans = [];
let currentInput = null;

generateBtn.addEventListener("click", generatePlans);

if (backBtn) {
  backBtn.addEventListener("click", () => {
    showSetupScreen();
  });
}

function getInputs() {
  return {
    blockName: document.getElementById("blockName").value || "Unnamed Block",
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
}
function generatePlans() {
  const input = getInputs();
const engineResults = getBestPatterns(input);
console.log(engineResults);
alert(`Engine found ${engineResults.patterns.length} patterns. Top pattern uses ${engineResults.patterns[0].count} dispensers.`);
return;
  const squareFeetPerAcre = 43560;
  const blockSqFt = input.acres * squareFeetPerAcre;
  const blockWidth = input.rows * input.rowSpacing;

  input.targetDispensers = Math.round(input.acres * input.rate);
  input.targetAreaPerDispenser = squareFeetPerAcre / input.rate;
  input.estimatedRowLength = blockSqFt / blockWidth;

  input.treesPerRow = Math.max(
    1,
    Math.round(input.estimatedRowLength / input.treeSpacing)
  );

  const totalTrees = input.rows * input.treesPerRow;
  const candidates = [];

  for (
    let rowInterval = 1;
    rowInterval <= Math.min(10, input.rows);
    rowInterval++
  ) {
    for (
      let treeInterval = 1;
      treeInterval <= Math.min(40, input.treesPerRow);
      treeInterval++
    ) {
      const preferredOffsets = getPreferredOffsets(treeInterval);

      preferredOffsets.forEach(offset => {
        const layout = buildLayout(
          input.rows,
          input.treesPerRow,
          rowInterval,
          treeInterval,
          offset
        );

        const count = countDispensers(layout);
        if (count === 0) return;

        const actualRate = count / input.acres;
        const rateDifference = Math.abs(actualRate - input.rate);
        const percentRateDifference = rateDifference / input.rate;

        if (percentRateDifference > 0.10) return;

        const betweenRowsFeet = rowInterval * input.rowSpacing;
        const betweenTreesFeet = treeInterval * input.treeSpacing;
        const actualAreaPerDispenser = betweenRowsFeet * betweenTreesFeet;

        candidates.push({
          rowInterval,
          treeInterval,
          offset,
          layout,
          count,
          actualRate,
          rateDifference,
          percentRateDifference,
          betweenRowsFeet,
          betweenTreesFeet,
          actualAreaPerDispenser,
          coverageScore: scoreCoverage({
            targetArea: input.targetAreaPerDispenser,
            actualArea: actualAreaPerDispenser,
            betweenRowsFeet,
            betweenTreesFeet,
            treeInterval,
            offset,
            rowInterval
          }),
          rateScore: scoreRate(percentRateDifference),
          simplicityScore: scoreSimplicity(rowInterval, treeInterval, offset),
          laborScore: scoreLabor(rowInterval, input.crewSize)
        });
      });
    }
  }
    if (candidates.length === 0) {
    alert(
      "No repeatable pattern was found within 10% of the target rate. Try adjusting acres, rows, spacing, or rate."
    );
    return;
  }

  const bestCoverage = pickBest(candidates, "coverage");
  const closestRate = pickBest(candidates, "rate");
  const easiestCrew = pickBest(candidates, "easy");

  currentPlans = removeDuplicatePlans([
    {
      label: "Best Coverage",
      note: "Best staggered spacing with the fewest coverage gaps.",
      ...bestCoverage
    },
    {
      label: "Closest Rate",
      note: "Closest to the requested dispensers per acre.",
      ...closestRate
    },
    {
      label: "Easiest Crew Pattern",
      note: "Simplest repeatable pattern for field crews.",
      ...easiestCrew
    }
  ]);

  currentInput = input;

  renderSummary(input, totalTrees);
  renderOptions(currentPlans, input);
  showOptionsScreen();
}

function getPreferredOffsets(treeInterval) {
  const halfOffset = Math.round(treeInterval / 2);

  return [...new Set([
    halfOffset,
    Math.floor(treeInterval / 2),
    Math.ceil(treeInterval / 2),
    1,
    0
  ])].filter(offset => offset >= 0 && offset < treeInterval);
}

function buildLayout(rows, treesPerRow, rowInterval, treeInterval, offset) {
  const layout = [];

  for (let r = 1; r <= rows; r++) {
    const row = [];

    const isPlacementRow = (r - 1) % rowInterval === 0;
    const isReturnDirection = r % 2 === 0;

    for (let t = 1; t <= treesPerRow; t++) {
      let hasDispenser = false;

      if (isPlacementRow) {
        if (!isReturnDirection) {
          hasDispenser = (t - 1) % treeInterval === 0;
        } else {
          const distanceFromFarEnd = treesPerRow - t;
          hasDispenser = (distanceFromFarEnd + offset) % treeInterval === 0;
        }
      }

      row.push(hasDispenser);
    }

    layout.push(row);
  }

  return layout;
}

function countDispensers(layout) {
  return layout.flat().filter(Boolean).length;
}
function scoreCoverage(data) {
  let score = 1000;

  const areaDifference =
    Math.abs(data.actualArea - data.targetArea) / data.targetArea;

  score -= areaDifference * 400;

  const spacingShapeDifference =
    Math.abs(data.betweenRowsFeet - data.betweenTreesFeet) /
    Math.max(data.betweenRowsFeet, data.betweenTreesFeet);

  score -= spacingShapeDifference * 250;

  const idealOffset = data.treeInterval / 2;
  const offsetDifference =
    Math.abs(data.offset - idealOffset) / data.treeInterval;

  score -= offsetDifference * 200;

  if (data.offset > 0) {
    score += 150;
  }

  if (data.rowInterval === 1) {
    score += 75;
  }

  if (data.rowInterval > 5) {
    score -= 100;
  }

  return score;
}

function scoreRate(percentRateDifference) {
  return 1000 - percentRateDifference * 1000;
}

function scoreSimplicity(rowInterval, treeInterval, offset) {
  let score = 1000;

  score -= rowInterval * 35;
  score -= treeInterval * 10;

  if (offset === 0) {
    score += 100;
  } else {
    score += 50;
  }

  if (rowInterval <= 2) {
    score += 75;
  }

  return score;
}

function scoreLabor(rowInterval, crewSize) {
  let score = 1000;

  if (crewSize === 1) {
    score += rowInterval === 1 ? 100 : 50;
  } else {
    score += rowInterval <= crewSize ? 100 : 25;
  }

  return score;
}

function pickBest(candidates, type) {
  return [...candidates].sort((a, b) => {
    if (type === "coverage") {
      return (
        b.coverageScore - a.coverageScore ||
        b.rateScore - a.rateScore ||
        b.simplicityScore - a.simplicityScore
      );
    }

    if (type === "rate") {
      return (
        b.rateScore - a.rateScore ||
        b.coverageScore - a.coverageScore ||
        b.simplicityScore - a.simplicityScore
      );
    }

    return (
      b.simplicityScore - a.simplicityScore ||
      b.rateScore - a.rateScore ||
      b.coverageScore - a.coverageScore
    );
  })[0];
}

function removeDuplicatePlans(plans) {
  const seen = new Set();

  return plans.filter(plan => {
    const key = `${plan.rowInterval}-${plan.treeInterval}-${plan.offset}`;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}
function renderSummary(input, totalTrees) {
  summaryEl.classList.remove("hidden");

  summaryEl.innerHTML = `
    <h2>${input.blockName}</h2>

    <div class="stats">
      <div class="stat">
        <span class="muted">Target</span>
        <strong>${input.targetDispensers}</strong>
        <span class="muted">dispensers</span>
      </div>

      <div class="stat">
        <span class="muted">Coverage Area</span>
        <strong>${input.targetAreaPerDispenser.toFixed(0)}</strong>
        <span class="muted">sq ft per dispenser</span>
      </div>

      <div class="stat">
        <span class="muted">Estimated Trees</span>
        <strong>${totalTrees}</strong>
        <span class="muted">total trees</span>
      </div>

      <div class="stat">
        <span class="muted">Estimated Row Length</span>
        <strong>${input.estimatedRowLength.toFixed(0)}</strong>
        <span class="muted">feet</span>
      </div>
    </div>
  `;
}

function renderOptions(plans, input) {
  optionsEl.innerHTML = "";

  plans.forEach((plan, index) => {
    const card = document.createElement("section");
    card.className = "option-card";

    card.innerHTML = `
      <span class="badge">Option ${index + 1}</span>
      <h3>${plan.label}</h3>
      <p class="muted">${plan.note}</p>

      <p><strong>Pattern:</strong> ${describePattern(plan)}</p>

      <div class="stats">
        <div class="stat">
          <span class="muted">Total</span>
          <strong>${plan.count}</strong>
          <span class="muted">dispensers</span>
        </div>

        <div class="stat">
          <span class="muted">Actual Rate</span>
          <strong>${plan.actualRate.toFixed(1)}</strong>
          <span class="muted">per acre</span>
        </div>

        <div class="stat">
          <span class="muted">Row Spacing</span>
          <strong>${plan.betweenRowsFeet.toFixed(0)}</strong>
          <span class="muted">ft between dispenser rows</span>
        </div>

        <div class="stat">
          <span class="muted">Tree Spacing</span>
          <strong>${plan.betweenTreesFeet.toFixed(0)}</strong>
          <span class="muted">ft in-row</span>
        </div>
      </div>

      <p class="muted">
        Tap this option to view the full schematic.
      </p>
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

  selectedPlanText.textContent = describePattern(plan);

  renderMap(plan.layout);
  renderInstructions(plan, input);
}

function renderMap(layout) {
  mapEl.innerHTML = "";

  const rows = layout.length;
  const treesPerRow = layout[0].length;

  const orchardEl = document.createElement("div");
  orchardEl.className = "orchard-map";

  for (let treeIndex = 0; treeIndex < treesPerRow; treeIndex++) {
    const treeLine = document.createElement("div");
    treeLine.className = "tree-line";

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const tree = document.createElement("div");

      tree.className = layout[rowIndex][treeIndex]
        ? "tree dispenser"
        : "tree";

      treeLine.appendChild(tree);
    }

    orchardEl.appendChild(treeLine);
  }

  mapEl.appendChild(orchardEl);
}

function renderInstructions(plan, input) {
  const difference = plan.count - input.targetDispensers;
  const percentDifference = plan.percentRateDifference * 100;

  instructionsEl.innerHTML = `
    <h2>Field Instructions</h2>

    <p><strong>${describePattern(plan)}</strong></p>

    <ul class="instructions-list">
      <li>Target number of dispensers: ${input.targetDispensers}</li>
      <li>This plan uses: ${plan.count}</li>
      <li>Difference from target: ${difference > 0 ? "+" : ""}${difference}</li>
      <li>Rate difference: ${percentDifference.toFixed(1)}%</li>
      <li>Target coverage area: ${input.targetAreaPerDispenser.toFixed(0)} sq ft per dispenser</li>
      <li>Pattern coverage area: ${plan.actualAreaPerDispenser.toFixed(0)} sq ft per dispenser grid cell</li>
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
    return "One person mode: start Row 1 from the starting end, then start Row 2 from the opposite end. Continue alternating ends to create the staggered field pattern.";
  }

  const rowsPerPerson = Math.ceil(input.rows / input.crewSize);
  const assignments = [];

  for (let p = 1; p <= input.crewSize; p++) {
    const start = (p - 1) * rowsPerPerson + 1;
    const end = Math.min(p * rowsPerPerson, input.rows);

    if (start <= input.rows) {
      assignments.push(`Person ${p}: Rows ${start}-${end}`);
    }
  }

  return `Crew mode: split rows by person. ${assignments.join("; ")}. Workers should use the same alternating-end logic within their assigned rows.`;
}

function ordinal(number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = number % 100;

  return number + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
}
