const generateBtn = document.getElementById("generateBtn");
const summaryEl = document.getElementById("summary");
const optionsEl = document.getElementById("options");
const mapSection = document.getElementById("mapSection");
const mapEl = document.getElementById("map");
const instructionsEl = document.getElementById("instructions");
const selectedPlanText = document.getElementById("selectedPlanText");

generateBtn.addEventListener("click", generatePlans);

function getInputs() {
  return {
    blockName: document.getElementById("blockName").value || "Unnamed Block",
    acres: Number(document.getElementById("acres").value),
    rows: Number(document.getElementById("rows").value),
    rowSpacing: Number(document.getElementById("rowSpacing").value),
treeSpacing: Number(document.getElementById("treeSpacing").value),
    rate: Number(document.getElementById("rate").value),
    crewSize: Number(document.getElementById("crewSize").value)
  };
}

function generatePlans() {
 const input = getInputs();

const squareFeetPerAcre = 43560;
const blockSqFt = input.acres * squareFeetPerAcre;
const blockWidth = input.rows * input.rowSpacing;

input.estimatedRowLength = blockSqFt / blockWidth;
input.treesPerRow = Math.max(
  1,
  Math.round(input.estimatedRowLength / input.treeSpacing)
);

const targetDispensers = Math.round(input.acres * input.rate);
const totalTrees = input.rows * input.treesPerRow;

  const candidates = [];

  for (
    let rowInterval = 1;
    rowInterval <= Math.min(8, input.rows);
    rowInterval++
  ) {
    for (
      let treeInterval = 1;
      treeInterval <= Math.min(20, input.treesPerRow);
      treeInterval++
    ) {
      for (let offset = 0; offset < treeInterval; offset++) {
        const layout = buildLayout(
          input.rows,
          input.treesPerRow,
          rowInterval,
          treeInterval,
          offset
        );

        const count = countDispensers(layout);
        if (count === 0) continue;

        const rateActual = count / input.acres;
        const rateDiff = Math.abs(count - targetDispensers);

        candidates.push({
          rowInterval,
          treeInterval,
          offset,
          layout,
          count,
          rateActual,
          rateDiff,
          spacingScore: scoreSpacing(rowInterval, treeInterval, offset),
          simplicityScore: scoreSimplicity(rowInterval, treeInterval, offset),
          laborScore: scoreLabor(rowInterval, input.crewSize)
        });
      }
    }
  }

  const bestSpacing = pickBest(candidates, "spacing");
  const easiestDeployment = pickBest(candidates, "easy");
  const closestRate = pickBest(candidates, "rate");

  const plans = removeDuplicatePlans([
    {
      label: "Best Staggered Spacing",
      note: "Best for even coverage across the block.",
      ...bestSpacing
    },
    {
      label: "Easiest Deployment",
      note: "Best for simple crew instructions.",
      ...easiestDeployment
    },
    {
      label: "Closest to Target Rate",
      note: "Best for matching the desired dispensers per acre.",
      ...closestRate
    }
  ]);

  renderSummary(input, targetDispensers, totalTrees);
  renderOptions(plans, input, targetDispensers);
  selectPlan(plans[0], input, targetDispensers);
}
function buildLayout(rows, treesPerRow, rowInterval, treeInterval, offset) {
  const layout = [];

  for (let r = 1; r <= rows; r++) {
    const row = [];

    const isPlacementRow = (r - 1) % rowInterval === 0;
    const rowOffset = offset > 0
      ? ((r - 1) * offset) % treeInterval
      : 0;

    for (let t = 1; t <= treesPerRow; t++) {
      const hasDispenser =
        isPlacementRow &&
        ((t - 1 + rowOffset) % treeInterval === 0);

      row.push(hasDispenser);
    }

    layout.push(row);
  }

  return layout;
}

function countDispensers(layout) {
  return layout.flat().filter(Boolean).length;
}

function scoreSpacing(rowInterval, treeInterval, offset) {
  let score = 100;

  score -= Math.abs(rowInterval - treeInterval) * 4;

  if (offset > 0) {
    score += 20;
  }

  if (rowInterval === 1) {
    score += 10;
  }

  return score;
}

function scoreSimplicity(rowInterval, treeInterval, offset) {
  let score = 100;

  score -= rowInterval * 5;
  score -= treeInterval * 2;

  if (offset === 0) {
    score += 20;
  } else {
    score += 8;
  }

  return score;
}

function scoreLabor(rowInterval, crewSize) {
  let score = 100;

  if (crewSize === 1) {
    score += rowInterval === 1 ? 15 : 5;
  } else {
    score += rowInterval <= crewSize ? 15 : 0;
  }

  return score;
}

function pickBest(candidates, type) {
  return [...candidates].sort((a, b) => {
    if (type === "rate") {
      return a.rateDiff - b.rateDiff || b.spacingScore - a.spacingScore;
    }

    if (type === "easy") {
      return b.simplicityScore - a.simplicityScore || a.rateDiff - b.rateDiff;
    }

    return b.spacingScore - a.spacingScore || a.rateDiff - b.rateDiff;
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
function renderSummary(input, targetDispensers, totalTrees) {
  summaryEl.classList.remove("hidden");

  summaryEl.innerHTML = `
    <h2>${input.blockName}</h2>
    <div class="stats">
      <div class="stat">
        <span class="muted">Target</span>
        <strong>${targetDispensers}</strong>
        <span class="muted">dispensers</span>
      </div>
      <div class="stat">
        <span class="muted">Trees</span>
        <strong>${totalTrees}</strong>
        <span class="muted">total trees</span>
      </div>
    </div>
  `;
}

function renderOptions(plans, input, targetDispensers) {
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
          <strong>${plan.rateActual.toFixed(1)}</strong>
          <span class="muted">per acre</span>
        </div>
      </div>

      <p class="muted">
        Difference from target: ${
          plan.count - targetDispensers > 0 ? "+" : ""
        }${plan.count - targetDispensers} dispensers
      </p>

      <button>View This Plan</button>
    `;

    card.querySelector("button").addEventListener("click", () => {
      document
        .querySelectorAll(".option-card")
        .forEach(el => el.classList.remove("selected"));

      card.classList.add("selected");
      selectPlan(plan, input, targetDispensers);
    });

    if (index === 0) {
      card.classList.add("selected");
    }

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

  const offsetText =
    plan.offset > 0
      ? `, staggered by ${plan.offset} tree${plan.offset > 1 ? "s" : ""} each placement row`
      : "";

  return `Place on ${treeText} in ${rowText}${offsetText}.`;
}
function selectPlan(plan, input, targetDispensers) {
  mapSection.classList.remove("hidden");
  instructionsEl.classList.remove("hidden");

  selectedPlanText.textContent = describePattern(plan);

  renderMap(plan.layout);
  renderInstructions(plan, input, targetDispensers);
}

function renderMap(layout) {
  mapEl.innerHTML = "";

  layout.forEach((row, rowIndex) => {
    const rowEl = document.createElement("div");
    rowEl.className = "row";

    const label = document.createElement("div");
    label.className = "row-label";
    label.textContent = `Row ${rowIndex + 1}`;
    rowEl.appendChild(label);

    row.forEach(hasDispenser => {
      const tree = document.createElement("div");
      tree.className = hasDispenser ? "tree dispenser" : "tree";
      rowEl.appendChild(tree);
    });

    mapEl.appendChild(rowEl);
  });
}

function renderInstructions(plan, input, targetDispensers) {
  const difference = plan.count - targetDispensers;

  instructionsEl.innerHTML = `
    <h2>Field Instructions</h2>

    <p><strong>${describePattern(plan)}</strong></p>

    <ul class="instructions-list">
      <li>Target number of dispensers: ${targetDispensers}</li>
      <li>This plan uses: ${plan.count}</li>
      <li>Difference from target: ${difference > 0 ? "+" : ""}${difference}</li>
      <li>Actual rate: ${plan.rateActual.toFixed(1)} dispensers per acre</li>
      <li>${getCrewInstructions(input)}</li>
    </ul>
  `;
}

function getCrewInstructions(input) {
  if (input.crewSize === 1) {
    return "One person mode: walk Row 1 forward, Row 2 backward, and continue alternating up and back through the block.";
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

  return `Crew mode: split rows by person. ${assignments.join("; ")}.`;
}

function ordinal(number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = number % 100;

  return number + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
}
