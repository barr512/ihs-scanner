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
      gapPenalty: Infinity,
      coverageScore: Infinity,
      coverageUniformity: 0
    };
  }

  /*
    Store dispenser tree positions by orchard row.

    This lets the app check every tree in the orchard
    without comparing every tree to every dispenser.
  */
  const placementsByRow = new Map();

  placements.forEach(place => {
    if (!placementsByRow.has(place.row)) {
      placementsByRow.set(place.row, []);
    }

    placementsByRow.get(place.row).push(place.tree);
  });

  placementsByRow.forEach(treePositions => {
    treePositions.sort((a, b) => a - b);
  });

  const treatedRowNumbers = [
    ...placementsByRow.keys()
  ].sort((a, b) => a - b);

  /*
    Find the nearest dispenser position in one row.
  */
  function nearestTreeDistance(
    sortedTreePositions,
    targetTree,
    excludeExactMatch = false
  ) {
    let low = 0;
    let high = sortedTreePositions.length;

    while (low < high) {
      const middle = Math.floor(
        (low + high) / 2
      );

      if (
        sortedTreePositions[middle] <
        targetTree
      ) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    let nearestDifference = Infinity;

    const indexesToCheck = [
      low - 2,
      low - 1,
      low,
      low + 1
    ];

    indexesToCheck.forEach(index => {
      if (
        index < 0 ||
        index >= sortedTreePositions.length
      ) {
        return;
      }

      const candidateTree =
        sortedTreePositions[index];

      if (
        excludeExactMatch &&
        candidateTree === targetTree
      ) {
        return;
      }

      nearestDifference = Math.min(
        nearestDifference,
        Math.abs(
          candidateTree -
          targetTree
        )
      );
    });

    return nearestDifference;
  }

  /*
    Check every orchard tree.

    This catches gaps and uneven bands anywhere in
    the complete block rather than sampling only part
    of the orchard.
  */
  const nearestCoverageDistances = [];

  orchard.trees.forEach(tree => {
    let nearestDistance = Infinity;

    treatedRowNumbers.forEach(
      dispenserRow => {
        const rowDistance =
          Math.abs(
            tree.row -
            dispenserRow
          ) *
          input.rowSpacing;

        /*
          A farther row cannot improve the current
          nearest distance.
        */
        if (rowDistance > nearestDistance) {
          return;
        }

        const treeDifference =
          nearestTreeDistance(
            placementsByRow.get(
              dispenserRow
            ),
            tree.tree
          );

        if (!Number.isFinite(treeDifference)) {
          return;
        }

        const distanceAlongRow =
          treeDifference *
          input.treeSpacing;

        const physicalDistance =
          Math.sqrt(
            rowDistance ** 2 +
            distanceAlongRow ** 2
          );

        nearestDistance = Math.min(
          nearestDistance,
          physicalDistance
        );
      }
    );

    nearestCoverageDistances.push(
      nearestDistance
    );
  });

  nearestCoverageDistances.sort(
    (a, b) => a - b
  );

  const averageNearestDistance =
    nearestCoverageDistances.reduce(
      (total, distance) =>
        total + distance,
      0
    ) /
    nearestCoverageDistances.length;

  const worstNearestDistance =
    nearestCoverageDistances[
      nearestCoverageDistances.length - 1
    ];

  const percentile90 =
    nearestCoverageDistances[
      Math.min(
        nearestCoverageDistances.length - 1,
        Math.floor(
          nearestCoverageDistances.length *
          0.90
        )
      )
    ];

  const percentile95 =
    nearestCoverageDistances[
      Math.min(
        nearestCoverageDistances.length - 1,
        Math.floor(
          nearestCoverageDistances.length *
          0.95
        )
      )
    ];

  const distanceVariance =
    nearestCoverageDistances.reduce(
      (total, distance) =>
        total +
        (
          distance -
          averageNearestDistance
        ) ** 2,
      0
    ) /
    nearestCoverageDistances.length;

  const distanceSpread =
    Math.sqrt(distanceVariance);

  /*
    The square root of expected coverage area gives
    a useful physical reference for expected spacing.
  */
  const expectedSpacing =
    Math.sqrt(
      43560 /
      input.targetRate
    );

  /*
    Penalize orchard trees that are much farther than
    expected from a dispenser.
  */
  const preferredMaximumCoverageDistance =
    expectedSpacing * 0.75;

  let gapPenalty = 0;

  nearestCoverageDistances.forEach(
    distance => {
      if (
        distance >
        preferredMaximumCoverageDistance
      ) {
        gapPenalty +=
          (
            distance -
            preferredMaximumCoverageDistance
          ) /
          expectedSpacing;
      }
    }
  );

  gapPenalty =
    gapPenalty /
    nearestCoverageDistances.length;

  /*
    Check every dispenser's nearest neighboring
    dispenser. This detects clusters and rows that
    periodically line up too closely.
  */
  const minimumPreferredDispenserDistance =
    expectedSpacing * 0.55;

  let clusterPenalty = 0;
  let closestDispenserDistance = Infinity;

  placements.forEach(place => {
    let nearestOtherDispenser = Infinity;

    treatedRowNumbers.forEach(
      dispenserRow => {
        const rowDistance =
          Math.abs(
            place.row -
            dispenserRow
          ) *
          input.rowSpacing;

        if (
          rowDistance >
          nearestOtherDispenser
        ) {
          return;
        }

        const treeDifference =
          nearestTreeDistance(
            placementsByRow.get(
              dispenserRow
            ),
            place.tree,
            dispenserRow === place.row
          );

        if (!Number.isFinite(treeDifference)) {
          return;
        }

        const distanceAlongRow =
          treeDifference *
          input.treeSpacing;

        const physicalDistance =
          Math.sqrt(
            rowDistance ** 2 +
            distanceAlongRow ** 2
          );

        nearestOtherDispenser = Math.min(
          nearestOtherDispenser,
          physicalDistance
        );
      }
    );

    closestDispenserDistance = Math.min(
      closestDispenserDistance,
      nearestOtherDispenser
    );

    if (
      nearestOtherDispenser <
      minimumPreferredDispenserDistance
    ) {
      clusterPenalty +=
        (
          minimumPreferredDispenserDistance -
          nearestOtherDispenser
        ) /
        expectedSpacing;
    }
  });

  clusterPenalty =
    clusterPenalty /
    placements.length;

  /*
    Lower is better.

    Average distance measures general coverage.
    The 90th, 95th and worst distances expose gaps.
    Distance spread exposes uneven distribution.
    Cluster penalty catches dispensers placed too close.
  */
  const coverageScore =
    averageNearestDistance +
    percentile90 * 1.5 +
    percentile95 * 2 +
    worstNearestDistance * 2.5 +
    distanceSpread * 2 +
    gapPenalty * 300 +
    clusterPenalty * 400;

  const coverageUniformity = Math.max(
    0,
    100 -
    (
      coverageScore /
      expectedSpacing
    ) *
    8
  );

  return {
    averageNearestDistance,
    worstNearestDistance,
    percentile90,
    percentile95,
    distanceSpread,
    closestDispenserDistance,
    clusterPenalty,
    gapPenalty,
    coverageScore,
    coverageUniformity
  };
}
function buildRepeatingTreePattern(
  treesPerRow,
  interval,
  startTree,
  reverseTrees
) {
  const positions = [];

  for (
    let tree = startTree;
    tree <= treesPerRow;
    tree += interval
  ) {
    positions.push(tree);
  }

  if (!reverseTrees) {
    return positions;
  }

  // Convert tree numbers counted from the opposite edge
  // into their actual orchard positions.
  return positions
    .map(tree => treesPerRow - tree + 1)
    .sort((a, b) => a - b);
}

function getSimpleStartOptions(interval) {
  const options = [
    1,
    1 + Math.floor(interval / 2)
  ];

  return [...new Set(options)].filter(
    start => start >= 1 && start <= interval
  );
}

function getBestPatterns(input, showClosest = false) {
  const SQFT_PER_ACRE = 43560;

  const blockArea =
    input.acres * SQFT_PER_ACRE;

  const totalRowFeet =
    blockArea / input.rowSpacing;

  const rowLength =
    totalRowFeet / input.rows;

  const treesPerRow = Math.max(
    1,
    Math.round(rowLength / input.treeSpacing)
  );

  const labelTargetDispensers = Math.round(
    input.acres * input.targetRate
  );

  const inventoryIsLimited =
    input.availableDispensers &&
    input.availableDispensers <
      labelTargetDispensers;

  const targetDispensers =
    inventoryIsLimited
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
    for (
      let tree = 1;
      tree <= treesPerRow;
      tree++
    ) {
      orchard.trees.push({
        row,
        tree
      });
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
      rowStep === 1
        ? row <= rowEnd
        : row >= rowEnd;
      row += rowStep
    ) {
      const distanceFromStartingEdge =
        Math.abs(row - rowStart);

      if (
        distanceFromStartingEdge %
          rowInterval ===
        0
      ) {
        treatedRows.push(row);
      }
    }

    if (!treatedRows.length) {
      continue;
    }

    const averageDispensersPerTreatedRow =
      targetDispensers /
      treatedRows.length;

    const estimatedTreeInterval = Math.max(
      1,
      Math.round(
        treesPerRow /
          averageDispensersPerTreatedRow
      )
    );

    /*
      Only test intervals near the expected spacing.

      Pattern A and Pattern B may use different fixed
      intervals, but both must remain simple and repeatable.
    */

    const intervalCandidates = [];

    for (
      let interval =
        estimatedTreeInterval - 4;
      interval <=
        estimatedTreeInterval + 4;
      interval++
    ) {
      if (
        interval >= 1 &&
        interval <= treesPerRow
      ) {
        intervalCandidates.push(interval);
      }
    }

    for (
      const patternAInterval
      of intervalCandidates
    ) {
      for (
        const patternBInterval
        of intervalCandidates
      ) {
        const patternAStartOptions =
          getSimpleStartOptions(
            patternAInterval
          );

        const patternBStartOptions =
          getSimpleStartOptions(
            patternBInterval
          );

        for (
          const patternAStart
          of patternAStartOptions
        ) {
         for (
  const patternBStart
  of patternBStartOptions
) {
  /*
    Every displayed pattern must be staggered.
    Pattern A and Pattern B cannot begin on the same tree.
  */
 /*
  Require a meaningful stagger.

  Different starting trees are not enough.
  Pattern A and Pattern B must begin far enough
  apart to avoid nearly straight alignment.
*/
const smallerInterval = Math.min(
  patternAInterval,
  patternBInterval
);

const startSeparation = Math.abs(
  patternAStart -
  patternBStart
);

const minimumStaggerSeparation = Math.max(
  2,
  Math.floor(smallerInterval * 0.3)
);

if (
  startSeparation <
  minimumStaggerSeparation
) {
  continue;
}

  const patternAPositions =
              buildRepeatingTreePattern(
                treesPerRow,
                patternAInterval,
                patternAStart,
                reverseTrees
              );

            const patternBPositions =
              buildRepeatingTreePattern(
                treesPerRow,
                patternBInterval,
                patternBStart,
                reverseTrees
              );
/*
  Check the complete A/B pattern across the entire row.

  Different intervals can begin staggered but drift together
  farther down the row. Reject patterns where A and B become
  too closely aligned anywhere in the block.
*/
const minimumInterval = Math.min(
  patternAInterval,
  patternBInterval
);

const minimumRequiredSeparation = Math.max(
  2,
  Math.floor(minimumInterval * 0.3)
);

let patternRemainsStaggered = true;

for (const aTree of patternAPositions) {
  let nearestBSeparation = Infinity;

  for (const bTree of patternBPositions) {
    nearestBSeparation = Math.min(
      nearestBSeparation,
      Math.abs(aTree - bTree)
    );
  }

  if (
    nearestBSeparation <
    minimumRequiredSeparation
  ) {
    patternRemainsStaggered = false;
    break;
  }
}

if (!patternRemainsStaggered) {
  continue;
}
            const placements = [];

            treatedRows.forEach(
              (row, treatedRowIndex) => {
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
              }
            );

            const count =
              placements.length;

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
              resultingRate >
                input.selectedProduct.max
            ) {
              continue;
            }

            const rateDifference =
              Math.abs(
                count -
                  targetDispensers
              );

            const percentOffTarget =
              Math.abs(
                resultingRate -
                  input.targetRate
              ) /
              input.targetRate;

           /*
  Normal optimization stays within 3% of the requested rate.

  The 3% limit is relaxed only after the user chooses
  "View Closest Practical Patterns."
*/
if (
  !inventoryIsLimited &&
  !showClosest &&
  percentOffTarget > 0.03
) {
  continue;
}

            if (
              inventoryIsLimited &&
              count <
                targetDispensers * 0.75
            ) {
              continue;
            }

           const coverageQuality =
  scoreCoverageQuality(
    placements,
    orchard,
    input
  );

/*
  Reject patterns that create unacceptable gaps anywhere
  in the complete block.

  Different A and B intervals are allowed, but only when
  their combined placement maintains reasonable coverage
  throughout the orchard.
*/
const expectedSpacing =
  Math.sqrt(
    SQFT_PER_ACRE /
    input.targetRate
  );

const maximumAllowed95thDistance =
  expectedSpacing * 0.85;

const maximumAllowedWorstDistance =
  expectedSpacing * 1.10;

if (
  coverageQuality.percentile95 >
    maximumAllowed95thDistance ||
  coverageQuality.worstNearestDistance >
    maximumAllowedWorstDistance
) {
  continue;
}

const actualAreaPerDispenser =
  blockArea / count;
            const coverageDifferencePercent =
              Math.abs(
                actualAreaPerDispenser -
                  targetAreaPerDispenser
              ) /
              targetAreaPerDispenser;

            /*
              Penalize differences between A and B spacing,
              but still allow them when they improve the rate
              or coverage.
            */

            const intervalDifference =
              Math.abs(
                patternAInterval -
                  patternBInterval
              );

            const countDifference =
              Math.abs(
                patternAPositions.length -
                  patternBPositions.length
              );

            const crewEaseScore =
              intervalDifference * 100 +
              countDifference * 25 +
              rowInterval * 5;

          const score =
  rateDifference * 300 +
  coverageQuality.coverageScore +
  coverageDifferencePercent * 500 +
  crewEaseScore;

            candidatePatterns.push({
              patternType:
                "simple-alternating-ab",

              rowInterval,

              patternAInterval,
              patternBInterval,

              patternAStart,
              patternBStart,

              patternAPositions,
              patternBPositions,

              placements,
              count,
              targetDispensers,
              resultingRate,
              percentOffTarget,

              actualAreaPerDispenser,
              coverageDifferencePercent,

              averageNearestDistance:
                coverageQuality
                  .averageNearestDistance,

              worstNearestDistance:
                coverageQuality
                  .worstNearestDistance,

              coverageScore:
                coverageQuality.coverageScore,

              coverageUniformity:
                coverageQuality
                  .coverageUniformity,

              /*
                Keep these properties because other parts
                of your app currently expect them.
              */

              treeInterval:
                Math.round(
                  (
                    patternAInterval +
                    patternBInterval
                  ) / 2
                ),

              offset:
                patternAStart !==
                  patternBStart
                  ? 1
                  : 0,

              score
            });
          }
        }
      }
    }
  }

  candidatePatterns.sort((a, b) => {
     /*
    When the user requests closest practical patterns:

    1. Closest dispenser count/rate
    2. Closest expected coverage area
    3. Best whole-block coverage score
    4. Simplest A/B pattern for workers
  */
  if (showClosest) {
    const rateDifferenceA = Math.abs(
      a.count - targetDispensers
    );

    const rateDifferenceB = Math.abs(
      b.count - targetDispensers
    );

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

    if (a.coverageScore !== b.coverageScore) {
      return a.coverageScore - b.coverageScore;
    }

    const simplicityA = Math.abs(
      a.patternAInterval -
      a.patternBInterval
    );

    const simplicityB = Math.abs(
      b.patternAInterval -
      b.patternBInterval
    );

    return simplicityA - simplicityB;
  } 
  /*
  Normal pattern ranking:

  If coverage is similar, prefer the rate closest
  to the selected rate.

  If coverage is meaningfully different, prefer
  the better coverage match.
*/

const coverageDifferenceA =
  a.coverageDifferencePercent;

const coverageDifferenceB =
  b.coverageDifferencePercent;

const coverageSimilarityTolerance = 0.01;

const coverageIsSimilar =
  Math.abs(
    coverageDifferenceA -
    coverageDifferenceB
  ) <= coverageSimilarityTolerance;

const rateDifferenceA =
  Math.abs(
    a.resultingRate -
    input.targetRate
  );

const rateDifferenceB =
  Math.abs(
    b.resultingRate -
    input.targetRate
  );

if (coverageIsSimilar) {
  if (rateDifferenceA !== rateDifferenceB) {
    return rateDifferenceA - rateDifferenceB;
  }

  if (
    coverageDifferenceA !==
    coverageDifferenceB
  ) {
    return (
      coverageDifferenceA -
      coverageDifferenceB
    );
  }
} else {
  return (
    coverageDifferenceA -
    coverageDifferenceB
  );
}

if (a.coverageScore !== b.coverageScore) {
  return a.coverageScore - b.coverageScore;
}

const simplicityA =
  Math.abs(
    a.patternAInterval -
    a.patternBInterval
  ) +
  a.rowInterval;

const simplicityB =
  Math.abs(
    b.patternAInterval -
    b.patternBInterval
  ) +
  b.rowInterval;

return simplicityA - simplicityB;

  
});

  const uniquePatterns = [];
  const seen = new Set();

  candidatePatterns.forEach(pattern => {
    const key = [
      pattern.rowInterval,
      pattern.patternAInterval,
      pattern.patternBInterval,
      pattern.patternAStart,
      pattern.patternBStart,
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

  /*
    Patterns 1 and 2 are ranked normally.
  */

  const selectedPatterns =
    uniquePatterns.slice(0, 2);

  const selectedDisplayedRate =
    Math.round(input.targetRate);

  const selectedRateAlreadyShown =
    selectedPatterns.some(pattern =>
      Math.round(
        pattern.resultingRate
      ) === selectedDisplayedRate
    );

  if (selectedRateAlreadyShown) {
    const normalThirdPattern =
      uniquePatterns.find(pattern =>
        !selectedPatterns.includes(
          pattern
        )
      );

    if (normalThirdPattern) {
      selectedPatterns.push(
        normalThirdPattern
      );
    }
  } else {
    /*
      Pattern 3 shows the selected rate when it is
      absent from Patterns 1 and 2.
    */

    const selectedRatePattern =
      uniquePatterns.find(pattern =>
        !selectedPatterns.includes(
          pattern
        ) &&
        Math.round(
          pattern.resultingRate
        ) === selectedDisplayedRate
      );

    if (selectedRatePattern) {
      selectedPatterns.push(
        selectedRatePattern
      );
    } else {
      const normalThirdPattern =
        uniquePatterns.find(pattern =>
          !selectedPatterns.includes(
            pattern
          )
        );

      if (normalThirdPattern) {
        selectedPatterns.push(
          normalThirdPattern
        );
      }
    }
  }

  return {
    orchard,
    patterns: selectedPatterns
  };
}
function generatePlans(showClosest = false) {
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

const engineResults = getBestPatterns(
  input,
  showClosest
);

input.showingClosestPatterns = showClosest;

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
  /*
    Normal search found no fully optimized pattern.
    Give the grower the choice to view the closest options.
  */
  if (
    !currentInput ||
    !currentInput.showingClosestPatterns
  ) {
    optionsEl.innerHTML = `
      <section class="option-card">
        <strong>
          No fully optimized deployment pattern was found.
        </strong>

        <p class="muted">
          The closest practical alternatives are available
          for review.
        </p>

        <button
          type="button"
          class="secondary-button"
          id="viewClosestPatternsBtn"
        >
          View Closest Practical Patterns
        </button>
      </section>
    `;

    const closestPatternsBtn =
      document.getElementById(
        "viewClosestPatternsBtn"
      );

    if (closestPatternsBtn) {
      closestPatternsBtn.addEventListener(
        "click",
        () => {
          generatePlans(true);
        }
      );
    }

    return;
  }

  /*
    Even the relaxed rate search found no pattern that
    passed the remaining deployment rules.
  */
  optionsEl.innerHTML = `
    <section class="option-card">
      <strong>
        No practical deployment pattern was found.
      </strong>

      <p class="muted">
        No pattern satisfied the current stagger, spacing,
        coverage, and field-deployment requirements.
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

  if (
    plan.patternType ===
    "simple-alternating-ab"
  ) {
    const sameInterval =
      plan.patternAInterval ===
      plan.patternBInterval;

    const sameStart =
      plan.patternAStart ===
      plan.patternBStart;

    if (sameInterval && sameStart) {
      return `Treat ${rowText}. On each treated row, start at Tree ${plan.patternAStart} and place one dispenser every ${plan.patternAInterval} trees. Continue the same pattern through the block. Count trees from the selected highest-pressure edge.`;
    }

    if (sameInterval) {
      return `Treat ${rowText}. On Pattern A rows, start at Tree ${plan.patternAStart} and place one dispenser every ${plan.patternAInterval} trees. On Pattern B rows, use the same spacing but start at Tree ${plan.patternBStart}. Continue alternating A, B, A, B through the block. Count trees from the selected highest-pressure edge.`;
    }

    return `Treat ${rowText}. On Pattern A rows, start at Tree ${plan.patternAStart} and place one dispenser every ${plan.patternAInterval} trees. On Pattern B rows, start at Tree ${plan.patternBStart} and place one dispenser every ${plan.patternBInterval} trees. Continue alternating A, B, A, B through the block. Count trees from the selected highest-pressure edge.`;
  }

  return "Follow the displayed repeating deployment pattern.";
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
