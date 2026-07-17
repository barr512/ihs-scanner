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
const idealDemoBtn =
  document.getElementById(
    "idealDemoBtn"
  );

const planningOverlay =
  document.getElementById(
    "planningOverlay"
  );

const planningOverlayTitle =
  document.getElementById(
    "planningOverlayTitle"
  );

const planningOverlayMessage =
  document.getElementById(
    "planningOverlayMessage"
  );
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
let currentRejectedPattern = null;

const SAVED_BLOCKS_STORAGE_KEY =
  "ctAppSavedBlocksV1";

const savedBlocksList =
  document.getElementById("savedBlocksList");

const savedBlocksSection =
  document.getElementById(
    "savedBlocksSection"
  );

const viewSavedBlocksBtn =
  document.getElementById(
    "viewSavedBlocksBtn"
  );

const exportBlocksBtn =
  document.getElementById("exportBlocksBtn");

const importBlocksInput =
  document.getElementById("importBlocksInput");

const savedBlocksStatus =
  document.getElementById("savedBlocksStatus");

let currentSelectedPlan = null;
let currentOpenedBlockName = "";


if (generateBtn) {
  generateBtn.addEventListener(
    "click",
    event => {
      event.preventDefault();

      runPlanningTask(
        () => generatePlans(),
        "Building Deployment Patterns",
        "Checking rate, spacing, coverage, and practical field patterns…"
      );
    }
  );
}

if (idealDemoBtn) {
  idealDemoBtn.addEventListener(
    "click",
    event => {
      event.preventDefault();

      runPlanningTask(
        () => showIdealLayoutDemo(),
        "Building Ideal Layout",
        "Calculating mathematical spacing and snapping positions to orchard trees…"
      );
    }
  );
}

if (backBtn) {
  backBtn.addEventListener("click", showSetupScreen);
}
if (topBackBtn) {
  topBackBtn.addEventListener("click", showSetupScreen);
}
function showPlanningOverlay(
  title,
  message
) {
  if (!planningOverlay) return;

  planningOverlayTitle.textContent =
    title;

  planningOverlayMessage.textContent =
    message;

  planningOverlay.hidden = false;
  planningOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "planning-active"
  );
}

function hidePlanningOverlay() {
  if (!planningOverlay) return;

  planningOverlay.hidden = true;
  planningOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "planning-active"
  );
}

function runPlanningTask(
  task,
  title,
  message
) {
  showPlanningOverlay(
    title,
    message
  );

  /*
    Give the browser time to paint the progress
    message before the calculation occupies the
    main thread.
  */
  requestAnimationFrame(() => {
    setTimeout(() => {
      try {
        task();
      } catch (error) {
        console.error(
          "Planning calculation failed:",
          error
        );

        alert(
          "The app could not finish this calculation. Please check the block details and try again."
        );
      } finally {
        hidePlanningOverlay();
      }
    }, 30);
  });
}

function getInputs() {
  const selectedProduct =
    products[productSelect.value] || null;

  const enteredRate = Number(
    document.getElementById("rate").value
  );

  /*
    When a grower changes the product's recommended
    planning rate, optimize specifically for the rate
    they entered.
  */
  const usingCustomProductRate =
    Boolean(
      selectedProduct &&
      Number.isFinite(enteredRate) &&
      enteredRate !== selectedProduct.defaultRate
    );

  return {
    acres: Number(
      document.getElementById("acres").value
    ),

    rows: Number(
      document.getElementById("rows").value
    ),

    rowSpacing: Number(
      document.getElementById("rowSpacing").value
    ),

    treeSpacing: Number(
      document.getElementById("treeSpacing").value
    ),

    targetRate: enteredRate,

    usingCustomProductRate,

    availableDispensers:
      Number(
        document.getElementById(
          "availableDispensers"
        ).value
      ) || null,

    rowDirection:
      document.getElementById(
        "rowDirection"
      ).value,

    pressureEdge:
      document.getElementById(
        "pressureEdge"
      ).value,

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
  currentSelectedPlan = plan;

  setupScreen.classList.add("hidden");
  resultsScreen.classList.remove("hidden");

  summaryEl.classList.add("hidden");
  optionsEl.classList.add("hidden");

  selectPlan(plan, currentInput);

  window.scrollTo({ top: 0, behavior: "smooth" });
}
function scoreCoverageQuality(
  placements,
  orchard,
  input
) {
  if (
    !placements.length ||
    !orchard.trees.length
  ) {
    return {
      averageNearestDistance: Infinity,
      worstNearestDistance: Infinity,
      percentile90: Infinity,
      percentile95: Infinity,
      distanceSpread: Infinity,
      closestDispenserDistance: 0,
      neighborDistanceSpread: Infinity,
      localDensitySpread: Infinity,
      clusterPenalty: Infinity,
      gapPenalty: Infinity,
      coverageScore: Infinity,
      coverageUniformity: 0,
      passesSpacingAudit: false
    };
  }

  const placementsByRow = new Map();

  placements.forEach(place => {
    if (!placementsByRow.has(place.row)) {
      placementsByRow.set(
        place.row,
        []
      );
    }

    placementsByRow
      .get(place.row)
      .push(place.tree);
  });

  placementsByRow.forEach(
    treePositions => {
      treePositions.sort(
        (a, b) => a - b
      );
    }
  );

  const treatedRowNumbers = [
    ...placementsByRow.keys()
  ].sort((a, b) => a - b);

  function nearestTreeDistance(
    sortedTreePositions,
    targetTree,
    excludeExactMatch = false
  ) {
    let low = 0;
    let high =
      sortedTreePositions.length;

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

    let nearestDifference =
      Infinity;

    const indexesToCheck = [
      low - 2,
      low - 1,
      low,
      low + 1
    ];

    indexesToCheck.forEach(index => {
      if (
        index < 0 ||
        index >=
          sortedTreePositions.length
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
    Convert an orchard row/tree position into
    physical block coordinates.
  */
  function getPhysicalPosition(position) {
    return {
      x:
        (position.row - 1) *
        input.rowSpacing,

      y:
        (position.tree - 1) *
        input.treeSpacing
    };
  }

  function physicalDistanceBetween(
    first,
    second
  ) {
    const firstPosition =
      getPhysicalPosition(first);

    const secondPosition =
      getPhysicalPosition(second);

    const xDifference =
      firstPosition.x -
      secondPosition.x;

    const yDifference =
      firstPosition.y -
      secondPosition.y;

    return Math.sqrt(
      xDifference ** 2 +
      yDifference ** 2
    );
  }

  /*
    Survey every orchard tree for open coverage areas.
  */
  const nearestCoverageDistances =
    [];

  orchard.trees.forEach(tree => {
    let nearestDistance =
      Infinity;

    treatedRowNumbers.forEach(
      dispenserRow => {
        const rowDistance =
          Math.abs(
            tree.row -
            dispenserRow
          ) *
          input.rowSpacing;

        if (
          rowDistance >
          nearestDistance
        ) {
          return;
        }

        const treeDifference =
          nearestTreeDistance(
            placementsByRow.get(
              dispenserRow
            ),
            tree.tree
          );

        if (
          !Number.isFinite(
            treeDifference
          )
        ) {
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
    Math.sqrt(
      distanceVariance
    );

  const expectedSpacing =
    Math.sqrt(
      43560 /
      input.targetRate
    );

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
    Survey the completed dispenser layout.

    For each dispenser, record:
    1. Distance to its nearest neighbor.
    2. Number of nearby dispensers inside a fixed
       physical radius.

    This detects repeating dense and sparse bands,
    even when every orchard tree remains reasonably
    close to some dispenser.
  */
  const nearestNeighborDistances = [];
  const localNeighborCounts = [];

  const localDensityRadius =
    expectedSpacing * 1.35;

  placements.forEach(
    (place, placeIndex) => {
      let nearestOtherDispenser =
        Infinity;

      let nearbyDispenserCount = 0;

      placements.forEach(
        (otherPlace, otherIndex) => {
          if (
            placeIndex === otherIndex
          ) {
            return;
          }

          const distance =
            physicalDistanceBetween(
              place,
              otherPlace
            );

          nearestOtherDispenser =
            Math.min(
              nearestOtherDispenser,
              distance
            );

          if (
            distance <=
            localDensityRadius
          ) {
            nearbyDispenserCount++;
          }
        }
      );

      nearestNeighborDistances.push(
        nearestOtherDispenser
      );

      localNeighborCounts.push(
        nearbyDispenserCount
      );
    }
  );

  nearestNeighborDistances.sort(
    (a, b) => a - b
  );

  localNeighborCounts.sort(
    (a, b) => a - b
  );

  const closestDispenserDistance =
    nearestNeighborDistances[0];

  const neighborDistance10 =
    nearestNeighborDistances[
      Math.min(
        nearestNeighborDistances.length - 1,
        Math.floor(
          nearestNeighborDistances.length *
          0.10
        )
      )
    ];

  const neighborDistance50 =
    nearestNeighborDistances[
      Math.min(
        nearestNeighborDistances.length - 1,
        Math.floor(
          nearestNeighborDistances.length *
          0.50
        )
      )
    ];

  const neighborDistance90 =
    nearestNeighborDistances[
      Math.min(
        nearestNeighborDistances.length - 1,
        Math.floor(
          nearestNeighborDistances.length *
          0.90
        )
      )
    ];

  /*
    A large difference between the lower and upper
    neighbor-distance percentiles means that some
    dispensers are bunched while others are isolated.
  */
  const neighborDistanceSpread =
    neighborDistance10 > 0
      ? neighborDistance90 /
        neighborDistance10
      : Infinity;

  const localDensity10 =
    localNeighborCounts[
      Math.min(
        localNeighborCounts.length - 1,
        Math.floor(
          localNeighborCounts.length *
          0.10
        )
      )
    ];

  const localDensity50 =
    localNeighborCounts[
      Math.min(
        localNeighborCounts.length - 1,
        Math.floor(
          localNeighborCounts.length *
          0.50
        )
      )
    ];

  const localDensity90 =
    localNeighborCounts[
      Math.min(
        localNeighborCounts.length - 1,
        Math.floor(
          localNeighborCounts.length *
          0.90
        )
      )
    ];

  /*
    This measures how much nearby dispenser density
    changes across the completed block.
  */
  const localDensitySpread =
    localDensity90 -
    localDensity10;

  const minimumPreferredDispenserDistance =
    expectedSpacing * 0.55;

  let clusterPenalty = 0;

  nearestNeighborDistances.forEach(
    distance => {
      if (
        distance <
        minimumPreferredDispenserDistance
      ) {
        clusterPenalty +=
          (
            minimumPreferredDispenserDistance -
            distance
          ) /
          expectedSpacing;
      }
    }
  );

  clusterPenalty =
    clusterPenalty /
    nearestNeighborDistances.length;

  const coverageScore =
    averageNearestDistance +
    percentile90 * 1.5 +
    percentile95 * 2 +
    worstNearestDistance * 2.5 +
    distanceSpread * 2 +
    neighborDistanceSpread * 100 +
    localDensitySpread * 75 +
    gapPenalty * 300 +
    clusterPenalty * 400;

  const coverageUniformity =
    Math.max(
      0,
      100 -
      (
        coverageScore /
        expectedSpacing
      ) *
      8
    );

  /*
    Final whole-block acceptance audit.

    These checks evaluate the finished placement,
    not the A/B interval instructions.
  */
  const minimumAllowedNeighborDistance =
    expectedSpacing * 0.45;

  const maximumAllowed95thDistance =
    expectedSpacing * 0.80;

  const maximumAllowedWorstDistance =
    expectedSpacing * 1.00;

  const maximumAllowedClusterPenalty =
    0.08;

  const maximumAllowedGapPenalty =
    0.08;

  /*
    Repeated dense/sparse bands produce a large
    neighbor-distance or local-density spread.
  */
  const maximumAllowedNeighborSpread =
    1.45;

  const maximumAllowedLocalDensitySpread =
    2;

  /*
    Do not allow most dispensers to be substantially
    closer together than expected merely because
    other areas contain larger gaps.
  */
  const minimumAllowedMedianNeighborDistance =
    expectedSpacing * 0.60;

  const passesSpacingAudit =
    closestDispenserDistance >=
      minimumAllowedNeighborDistance &&

    neighborDistance50 >=
      minimumAllowedMedianNeighborDistance &&

    neighborDistanceSpread <=
      maximumAllowedNeighborSpread &&

    localDensitySpread <=
      maximumAllowedLocalDensitySpread &&

    percentile95 <=
      maximumAllowed95thDistance &&

    worstNearestDistance <=
      maximumAllowedWorstDistance &&

    clusterPenalty <=
      maximumAllowedClusterPenalty &&

    gapPenalty <=
      maximumAllowedGapPenalty;

  return {
    averageNearestDistance,
    worstNearestDistance,
    percentile90,
    percentile95,
    distanceSpread,
    closestDispenserDistance,
    neighborDistance10,
    neighborDistance50,
    neighborDistance90,
    neighborDistanceSpread,
    localDensity10,
    localDensity50,
    localDensity90,
    localDensitySpread,
    clusterPenalty,
    gapPenalty,
    coverageScore,
    coverageUniformity,
    passesSpacingAudit
  };
}
function auditAssignedCoverageArea(
  placements,
  orchard,
  input
) {
  if (
    !placements.length ||
    !orchard.trees.length
  ) {
    return {
      passesAssignedAreaAudit: false,
      assignedAreaScore: Infinity,
      assignedAreaSpread: Infinity,
      assignedAreaVariation: Infinity,
      minimumAssignedArea: 0,
      maximumAssignedArea: Infinity
    };
  }

  /*
    Each orchard tree represents approximately this
    amount of physical orchard area.
  */
  const areaPerTree =
    input.rowSpacing *
    input.treeSpacing;

  const targetAreaPerDispenser =
    43560 /
    input.targetRate;

  /*
    Count how many orchard tree cells are closest
    to each dispenser.
  */
  const assignedTreeCounts =
    Array(
      placements.length
    ).fill(0);

  orchard.trees.forEach(tree => {
    let closestPlacementIndex = -1;
    let closestDistanceSquared =
      Infinity;

    placements.forEach(
      (placement, placementIndex) => {
        const rowDistance =
          (
            tree.row -
            placement.row
          ) *
          input.rowSpacing;

        const treeDistance =
          (
            tree.tree -
            placement.tree
          ) *
          input.treeSpacing;

        const distanceSquared =
          rowDistance ** 2 +
          treeDistance ** 2;

        if (
          distanceSquared <
          closestDistanceSquared
        ) {
          closestDistanceSquared =
            distanceSquared;

          closestPlacementIndex =
            placementIndex;
        }
      }
    );

    if (
      closestPlacementIndex >= 0
    ) {
      assignedTreeCounts[
        closestPlacementIndex
      ]++;
    }
  });

  /*
    Convert assigned tree cells into estimated
    assigned orchard area for each dispenser.
  */
  const assignedAreas =
    assignedTreeCounts
      .map(
        count =>
          count *
          areaPerTree
      )
      .sort(
        (a, b) => a - b
      );

  const averageAssignedArea =
    assignedAreas.reduce(
      (total, area) =>
        total + area,
      0
    ) /
    assignedAreas.length;

  const minimumAssignedArea =
    assignedAreas[0];

  const maximumAssignedArea =
    assignedAreas[
      assignedAreas.length - 1
    ];

  const percentile10 =
    assignedAreas[
      Math.min(
        assignedAreas.length - 1,
        Math.floor(
          assignedAreas.length *
          0.10
        )
      )
    ];

  const percentile90 =
    assignedAreas[
      Math.min(
        assignedAreas.length - 1,
        Math.floor(
          assignedAreas.length *
          0.90
        )
      )
    ];

  const assignedAreaVariance =
    assignedAreas.reduce(
      (total, area) =>
        total +
        (
          area -
          averageAssignedArea
        ) ** 2,
      0
    ) /
    assignedAreas.length;

  const assignedAreaStandardDeviation =
    Math.sqrt(
      assignedAreaVariance
    );

  /*
    Coefficient of variation measures unevenness
    without depending on the selected rate.
  */
  const assignedAreaVariation =
    averageAssignedArea > 0
      ? assignedAreaStandardDeviation /
        averageAssignedArea
      : Infinity;

  /*
    Compare the larger assigned areas with the
    smaller assigned areas.

    Large values indicate dense and sparse bands.
  */
  const assignedAreaSpread =
    percentile10 > 0
      ? percentile90 /
        percentile10
      : Infinity;

  /*
    Measure each dispenser's difference from the
    target area per dispenser.
  */
  const assignedAreaScore =
    assignedAreas.reduce(
      (total, area) =>
        total +
        Math.abs(
          area -
          targetAreaPerDispenser
        ) /
        targetAreaPerDispenser,
      0
    ) /
    assignedAreas.length;

  /*
    Whole-block acceptance limits.

    Most dispensers should serve a similar amount
    of orchard area. A few border dispensers may
    naturally receive less area, so percentiles are
    used instead of requiring every dispenser to be
    identical.
  */
  const minimumAllowed10thPercentile =
    targetAreaPerDispenser * 0.55;

  const maximumAllowed90thPercentile =
    targetAreaPerDispenser * 1.45;

  const maximumAllowedAssignedAreaSpread =
    2.0;

  const maximumAllowedVariation =
    0.32;

  const maximumAllowedAssignedAreaScore =
    0.30;

  const passesAssignedAreaAudit =
    percentile10 >=
      minimumAllowed10thPercentile &&

    percentile90 <=
      maximumAllowed90thPercentile &&

    assignedAreaSpread <=
      maximumAllowedAssignedAreaSpread &&

    assignedAreaVariation <=
      maximumAllowedVariation &&

    assignedAreaScore <=
      maximumAllowedAssignedAreaScore;

  return {
    passesAssignedAreaAudit,
    assignedAreaScore,
    assignedAreaSpread,
    assignedAreaVariation,
    minimumAssignedArea,
    maximumAssignedArea,
    percentile10AssignedArea:
      percentile10,
    percentile90AssignedArea:
      percentile90,
    averageAssignedArea
  };
}
function auditWholeBlockBanding(
  placements,
  orchard,
  input
) {
  if (
    !placements.length ||
    orchard.rows <= 0 ||
    orchard.rowLength <= 0
  ) {
    return {
      passesBandingAudit: false,
      bandingScore: Infinity,
      alongRowVariation: Infinity,
      acrossRowVariation: Infinity
    };
  }

  /*
    The expected physical spacing for the selected
    dispenser rate.
  */
  const expectedSpacing =
    Math.sqrt(
      43560 /
      input.targetRate
    );

  /*
    Approximate physical dimensions of the block.

    The extra row-spacing width gives the outside rows
    their normal share of orchard area.
  */
  const blockWidth =
    orchard.rows *
    input.rowSpacing;

  const blockLength =
    orchard.rowLength;

  /*
    Store the actual physical location of every
    dispenser in the completed layout.
  */
  const rowCoordinates =
    placements.map(place =>
      (
        place.row -
        0.5
      ) *
      input.rowSpacing
    );

  const treeCoordinates =
    placements.map(place =>
      (
        place.tree -
        0.5
      ) *
      input.treeSpacing
    );

  /*
    Scan overlapping physical strips along one axis.

    This preserves the actual location of dispensers.
    It does not reduce the whole block immediately to
    one average or nearest-neighbor measurement.
  */
  function scanAxis(
  coordinates,
  axisLength,
  windowMultiplier = 1.1
) {
    /*
      A wider scan window can be used along the orchard
      rows so that intentional A/B staggering is measured
      as one combined repeating pattern.

      The narrower default remains appropriate across
      the orchard rows.
    */
    const windowSize =
      Math.min(
        axisLength,
        expectedSpacing *
          windowMultiplier
      );

    const stepSize =
      windowSize / 2;

    /*
      An axis that is too short cannot contain enough
      separate sections for a meaningful banding test.
    */
    if (
      axisLength <
      windowSize * 2.25
    ) {
      return {
        passes: true,
        variation: 0,
        maximumRelativeCount: 1,
        minimumRelativeCount: 1,
        maximumAdjacentChange: 0,
        emptyWindowFraction: 0
      };
    }

    const stripCounts = [];

    for (
      let start = 0;
      start <=
        axisLength -
        windowSize +
        0.0001;
      start += stepSize
    ) {
      const end =
        start +
        windowSize;

      let count = 0;

      coordinates.forEach(
        coordinate => {
          if (
            coordinate >= start &&
            coordinate < end
          ) {
            count++;
          }
        }
      );

      stripCounts.push(count);
    }

    if (
      stripCounts.length < 3
    ) {
      return {
        passes: true,
        variation: 0,
        maximumRelativeCount: 1,
        minimumRelativeCount: 1,
        maximumAdjacentChange: 0,
        emptyWindowFraction: 0
      };
    }

    /*
      Expected number of dispensers in a strip if the
      completed pattern is evenly distributed along
      this axis.
    */
    const expectedCount =
      placements.length *
      (
        windowSize /
        axisLength
      );

    /*
      Do not use an unstable strip test when each
      window would contain almost no dispensers.
    */
    if (
      expectedCount < 1.5
    ) {
      return {
        passes: true,
        variation: 0,
        maximumRelativeCount: 1,
        minimumRelativeCount: 1,
        maximumAdjacentChange: 0,
        emptyWindowFraction: 0
      };
    }

    const averageCount =
      stripCounts.reduce(
        (total, count) =>
          total + count,
        0
      ) /
      stripCounts.length;

    const variance =
      stripCounts.reduce(
        (total, count) =>
          total +
          (
            count -
            averageCount
          ) ** 2,
        0
      ) /
      stripCounts.length;

    const standardDeviation =
      Math.sqrt(variance);

    const variation =
      averageCount > 0
        ? standardDeviation /
          averageCount
        : Infinity;

    const maximumCount =
      Math.max(...stripCounts);

    const minimumCount =
      Math.min(...stripCounts);

    const maximumRelativeCount =
      maximumCount /
      expectedCount;

    const minimumRelativeCount =
      minimumCount /
      expectedCount;

    let maximumAdjacentChange = 0;

    for (
      let index = 1;
      index < stripCounts.length;
      index++
    ) {
      const adjacentChange =
        Math.abs(
          stripCounts[index] -
          stripCounts[index - 1]
        ) /
        expectedCount;

      maximumAdjacentChange =
        Math.max(
          maximumAdjacentChange,
          adjacentChange
        );
    }

    const emptyWindowCount =
      stripCounts.filter(
        count => count === 0
      ).length;

    const emptyWindowFraction =
      emptyWindowCount /
      stripCounts.length;

    /*
      These limits reject repeated dense/open bands
      while allowing normal variation near block edges.
    */
    const passes =
      variation <= 0.38 &&
      maximumRelativeCount <= 1.75 &&
      minimumRelativeCount >= 0.25 &&
      maximumAdjacentChange <= 1.15 &&
      emptyWindowFraction <= 0.10;

    return {
      passes,
      variation,
      maximumRelativeCount,
      minimumRelativeCount,
      maximumAdjacentChange,
      emptyWindowFraction
    };
  }

  /*
    Scan both physical directions.

    alongRowScan detects bands occurring at repeated
    tree positions down the rows.

    acrossRowScan detects uneven concentration across
    the width of the orchard.
  */
  /*
  Along-row dispenser positions from alternating A/B
  rows naturally occur in offset groups.

  Scan a section approximately 2.25 expected spacings
  long so the audit evaluates the combined staggered
  pattern rather than treating each offset group as a
  separate dense or open band.
*/
const alongRowScan =
  scanAxis(
    treeCoordinates,
    blockLength,
    2.25
  );

/*
  Across-row banding cannot be judged reliably when
  the block contains only a small number of discrete rows.

  In those blocks, the row structure itself creates large
  count changes between physical scan windows and can cause
  every candidate to fail.

  Continue scanning down the full row length, which detects
  the repeated dense/open bands visible in the schematic.
*/
const useAcrossRowScan =
  orchard.rows >= 16;

const acrossRowScan =
  useAcrossRowScan
    ? scanAxis(
        rowCoordinates,
        blockWidth
      )
    : {
        passes: true,
        variation: 0,
        maximumRelativeCount: 1,
        minimumRelativeCount: 1,
        maximumAdjacentChange: 0,
        emptyWindowFraction: 0
      };

const passesBandingAudit =
  alongRowScan.passes &&
  acrossRowScan.passes;

  const bandingScore =
    alongRowScan.variation +
    acrossRowScan.variation +
    alongRowScan.maximumAdjacentChange +
    acrossRowScan.maximumAdjacentChange;

  return {
    passesBandingAudit,
    bandingScore,

    alongRowVariation:
      alongRowScan.variation,

    acrossRowVariation:
      acrossRowScan.variation,

    alongRowMaximumRelativeCount:
      alongRowScan
        .maximumRelativeCount,

    acrossRowMaximumRelativeCount:
      acrossRowScan
        .maximumRelativeCount,

    alongRowMinimumRelativeCount:
      alongRowScan
        .minimumRelativeCount,

    acrossRowMinimumRelativeCount:
      acrossRowScan
        .minimumRelativeCount,

    alongRowMaximumAdjacentChange:
      alongRowScan
        .maximumAdjacentChange,

    acrossRowMaximumAdjacentChange:
      acrossRowScan
        .maximumAdjacentChange
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
  /*
    Test every possible starting tree within the
    repeating interval.

    This applies to both the recommended product rate
    and any grower-selected rate. The engine will later
    rank the surviving layouts for coverage and crew
    simplicity.
  */
  const options = [];

  for (
    let start = 1;
    start <= interval;
    start++
  ) {
    options.push(start);
  }

  return options;
}
function clampNumber(
  value,
  minimum,
  maximum
) {
  return Math.max(
    minimum,
    Math.min(maximum, value)
  );
}

/*
  Distribute the exact target dispenser count
  across the selected deployment lines.

  Extra dispensers are spread across the block
  rather than placed only on the first lines.
*/
function distributeCountAcrossLines(
  totalCount,
  lineCount
) {
  const baseCount =
    Math.floor(
      totalCount / lineCount
    );

  const remainder =
    totalCount % lineCount;

  const counts =
    Array(lineCount).fill(
      baseCount
    );

  if (remainder === 0) {
    return counts;
  }

  for (
    let extraIndex = 0;
    extraIndex < remainder;
    extraIndex++
  ) {
    const lineIndex =
      Math.min(
        lineCount - 1,
        Math.floor(
          (
            extraIndex +
            0.5
          ) *
          lineCount /
          remainder
        )
      );

    counts[lineIndex]++;
  }

  return counts;
}

/*
  Find the nearest unused tree on one selected row.

  The ideal coordinate remains stored separately,
  so the engine always knows where the dispenser
  was mathematically intended to be.
*/
function findNearestUnusedTree(
  idealYFeet,
  orchardRow,
  treesPerRow,
  treeSpacing,
  usedLocations
) {
  const nearestTree =
    clampNumber(
      Math.round(
        idealYFeet /
        treeSpacing +
        0.5
      ),
      1,
      treesPerRow
    );

  let bestTree = null;
  let bestDistance =
    Infinity;

  /*
    Search outward from the nearest tree.

    Usually the first tree checked will be available,
    but this also resolves duplicate snapping.
  */
  for (
    let offset = 0;
    offset < treesPerRow;
    offset++
  ) {
    const treeOptions =
      offset === 0
        ? [nearestTree]
        : [
            nearestTree - offset,
            nearestTree + offset
          ];

    treeOptions.forEach(
      treeNumber => {
        if (
          treeNumber < 1 ||
          treeNumber >
            treesPerRow
        ) {
          return;
        }

        const locationKey =
          `${orchardRow}|${treeNumber}`;

        if (
          usedLocations.has(
            locationKey
          )
        ) {
          return;
        }

        const actualYFeet =
          (
            treeNumber -
            0.5
          ) *
          treeSpacing;

        const snapDistance =
          Math.abs(
            actualYFeet -
            idealYFeet
          );

        if (
          snapDistance <
          bestDistance
        ) {
          bestDistance =
            snapDistance;

          bestTree =
            treeNumber;
        }
      }
    );

    /*
      Once a nearby unused tree has been found,
      no much farther tree can improve the result.
    */
    if (
      bestTree !== null &&
      offset >
        Math.ceil(
          bestDistance /
          treeSpacing
        ) +
        1
    ) {
      break;
    }
  }

  return {
    tree:
      bestTree,

    snapDistance:
      bestDistance
  };
}

/*
  Measure physical distance between two snapped
  orchard placements.
*/
function physicalPlacementDistance(
  first,
  second,
  input
) {
  const acrossRowsFeet =
    (
      first.row -
      second.row
    ) *
    input.rowSpacing;

  const alongRowsFeet =
    (
      first.tree -
      second.tree
    ) *
    input.treeSpacing;

  return Math.sqrt(
    acrossRowsFeet ** 2 +
    alongRowsFeet ** 2
  );
}
/*
  Choose a simple, repeatable set of deployment rows.

  Every selected deployment row uses the same row
  interval. This prevents a single unexplained extra
  row skip from appearing in the middle of the block.

  The exact dispenser total is handled separately by
  distributeCountAcrossLines(), so simplifying the row
  sequence does not change the target count.
*/
function findBestRepeatingDeploymentRows(
  lineCount,
  totalRows,
  spacingAcrossBlock,
  rowSpacing
) {
  let bestDesign = null;

  /*
    The mathematically preferred distance between
    deployment rows, expressed in orchard rows.
  */
  const idealRowInterval =
    spacingAcrossBlock /
    rowSpacing;

  /*
    Test intervals close to the mathematical ideal.
  */
  const minimumInterval =
    Math.max(
      1,
      Math.floor(
        idealRowInterval
      ) - 2
    );

  const maximumInterval =
    Math.max(
      minimumInterval,
      Math.ceil(
        idealRowInterval
      ) + 2
    );

  for (
    let rowInterval =
      minimumInterval;
    rowInterval <=
      maximumInterval;
    rowInterval++
  ) {
    /*
      Determine the largest starting row that still
      allows every deployment line to fit.
    */
    const maximumStartRow =
      totalRows -
      (
        lineCount - 1
      ) *
      rowInterval;

    if (
      maximumStartRow < 1
    ) {
      continue;
    }

    for (
      let startRow = 1;
      startRow <=
        maximumStartRow;
      startRow++
    ) {
      const rows = [];

      for (
        let lineIndex = 0;
        lineIndex < lineCount;
        lineIndex++
      ) {
        rows.push(
          startRow +
          lineIndex *
          rowInterval
        );
      }

      /*
        Compare the repeating row sequence with the
        ideal mathematical line coordinates.
      */
      let totalSnapError = 0;

      for (
        let lineIndex = 0;
        lineIndex < lineCount;
        lineIndex++
      ) {
        const idealXFeet =
          (
            lineIndex +
            0.5
          ) *
          spacingAcrossBlock;

        const actualXFeet =
          (
            rows[lineIndex] -
            0.5
          ) *
          rowSpacing;

        totalSnapError +=
          Math.abs(
            actualXFeet -
            idealXFeet
          );
      }

      const averageSnapError =
        totalSnapError /
        lineCount;

      /*
        Keep the deployment lines reasonably centered
        within the full block.

        This prevents an otherwise good repeating
        sequence from being crowded against one edge.
      */
      const firstLineCenter =
        (
          rows[0] -
          0.5
        ) *
        rowSpacing;

      const lastLineCenter =
        (
          rows[
            rows.length - 1
          ] -
          0.5
        ) *
        rowSpacing;

      const blockWidth =
        totalRows *
        rowSpacing;

      const beginningMargin =
        firstLineCenter;

      const endingMargin =
        blockWidth -
        lastLineCenter;

      const edgeBalanceError =
        Math.abs(
          beginningMargin -
          endingMargin
        );

      const intervalDifference =
        Math.abs(
          rowInterval -
          idealRowInterval
        );

      const score =
        averageSnapError +
        edgeBalanceError * 0.20 +
        intervalDifference *
          rowSpacing *
          0.25;

      if (
        !bestDesign ||
        score <
          bestDesign.score
      ) {
        bestDesign = {
          rows,
          rowInterval,
          averageSnapError,
          edgeBalanceError,
          score
        };
      }
    }
  }

  return bestDesign;
}
/*
  Build the ideal whole-block deployment.

  This function starts with the entered rate and exact
  target dispenser count. It does not begin with an
  A/B crew recipe.
*/
function buildIdealLayout(
  input
) {
  const SQFT_PER_ACRE =
    43560;

  const blockArea =
    input.acres *
    SQFT_PER_ACRE;

  /*
    Treat each orchard row as the center of one
    row-spacing-wide strip.
  */
  const blockWidth =
    input.rows *
    input.rowSpacing;

  const rowLength =
    blockArea /
    blockWidth;

  const treesPerRow =
    Math.max(
      1,
      Math.round(
        rowLength /
        input.treeSpacing
      )
    );

  const targetDispensers =
    input.availableDispensers &&
    input.availableDispensers <
      Math.round(
        input.acres *
        input.targetRate
      )
      ? input.availableDispensers
      : Math.round(
          input.acres *
          input.targetRate
        );

  const targetAreaPerDispenser =
    blockArea /
    targetDispensers;

  const expectedSpacing =
    Math.sqrt(
      targetAreaPerDispenser
    );

  /*
    Test every practical number of deployment lines.

    The best line count balances:
    - spacing across the block;
    - spacing down the rows;
    - snapping those ideal lines to actual orchard rows.
  */
  const lineCountCandidates =
  [];

const maximumLineCount =
  Math.min(
    input.rows,
    targetDispensers
  );

/*
  Test every possible number of deployment lines.

  Each candidate is temporarily built and snapped
  to actual orchard trees so we can measure the real
  spacing it would produce.
*/
for (
  let lineCount = 1;
  lineCount <= maximumLineCount;
  lineCount++
) {
  const averageCountPerLine =
    targetDispensers /
    lineCount;

  const spacingAcrossBlock =
    blockWidth /
    lineCount;

  const spacingDownRows =
    rowLength /
    averageCountPerLine;

  /*
    Existing balance measurement.

    A result near zero means across-line spacing
    and down-row spacing are similar.
  */
  const spacingBalanceError =
    Math.abs(
      Math.log(
        spacingAcrossBlock /
        spacingDownRows
      )
    );

     /*
    Snap each mathematical deployment line to its
    nearest actual orchard row.

    This is the version that produced the good
    mathematical layouts during demo testing.
  */
  let totalRowSnapError = 0;

  const snappedRows = [];

  for (
    let lineIndex = 0;
    lineIndex < lineCount;
    lineIndex++
  ) {
    const idealXFeet =
      (
        lineIndex +
        0.5
      ) *
      spacingAcrossBlock;

    const nearestRow =
      clampNumber(
        Math.round(
          idealXFeet /
          input.rowSpacing +
          0.5
        ),
        1,
        input.rows
      );

    const actualRowXFeet =
      (
        nearestRow -
        0.5
      ) *
      input.rowSpacing;

    totalRowSnapError +=
      Math.abs(
        actualRowXFeet -
        idealXFeet
      );

    snappedRows.push(
      nearestRow
    );
  }

  /*
    Two mathematical deployment lines cannot occupy
    the same orchard row.
  */
  const uniqueRowCount =
    new Set(
      snappedRows
    ).size;

  if (
    uniqueRowCount !==
    lineCount
  ) {
    continue;
  }

  const averageRowSnapError =
    totalRowSnapError /
    lineCount;

  const normalizedRowSnapError =
    averageRowSnapError /
    input.rowSpacing;

  /*
    Keep the current selection score unchanged
    while gathering the new diagnostic measurements.
  */
  const lineCountScore =
    spacingBalanceError +
    normalizedRowSnapError *
      0.35;

  const lineCounts =
    distributeCountAcrossLines(
      targetDispensers,
      lineCount
    );

  const diagnosticPlacements =
    [];

  const diagnosticUsedLocations =
    new Set();

  let candidateCouldBeBuilt =
    true;

  /*
    Build and snap this candidate exactly as the
    selected ideal layout would be built.
  */
  for (
    let lineIndex = 0;
    lineIndex < lineCount;
    lineIndex++
  ) {
    const dispenserCount =
      lineCounts[lineIndex];

    const spacingDownLine =
      rowLength /
      dispenserCount;

    const orchardRow =
      snappedRows[
        lineIndex
      ];

    const staggerFraction =
      lineIndex % 2 === 0
        ? 0
        : 0.5;

    const lineIdealYPositions =
      [];

    for (
      let pointIndex = 0;
      pointIndex <
        dispenserCount;
      pointIndex++
    ) {
      let idealYFeet =
        (
          pointIndex +
          0.5 +
          staggerFraction
        ) *
        spacingDownLine;

      while (
        idealYFeet >=
        rowLength
      ) {
        idealYFeet -=
          rowLength;
      }

      lineIdealYPositions.push(
        idealYFeet
      );
    }

    /*
      Wrapped staggered points must be processed
      in physical order down the orchard row.
    */
    lineIdealYPositions.sort(
      (a, b) => a - b
    );

    for (
      const idealYFeet
      of lineIdealYPositions
    ) {
      const nearestTreeResult =
        findNearestUnusedTree(
          idealYFeet,
          orchardRow,
          treesPerRow,
          input.treeSpacing,
          diagnosticUsedLocations
        );

      if (
        nearestTreeResult.tree ===
        null
      ) {
        candidateCouldBeBuilt =
          false;

        break;
      }

      const locationKey =
        `${orchardRow}|${nearestTreeResult.tree}`;

      diagnosticUsedLocations.add(
        locationKey
      );

      diagnosticPlacements.push({
        row:
          orchardRow,

        tree:
          nearestTreeResult.tree
      });
    }

    if (
      !candidateCouldBeBuilt
    ) {
      break;
    }
  }

  if (
    !candidateCouldBeBuilt ||
    diagnosticPlacements.length !==
      targetDispensers
  ) {
    continue;
  }

  /*
    Measure every dispenser's nearest neighbor
    in the finished snapped candidate.
  */
  const diagnosticNeighborDistances =
    [];

  diagnosticPlacements.forEach(
    (
      placement,
      placementIndex
    ) => {
      let nearestDistance =
        Infinity;

      diagnosticPlacements.forEach(
        (
          otherPlacement,
          otherIndex
        ) => {
          if (
            placementIndex ===
            otherIndex
          ) {
            return;
          }

          const distance =
            physicalPlacementDistance(
              placement,
              otherPlacement,
              input
            );

          nearestDistance =
            Math.min(
              nearestDistance,
              distance
            );
        }
      );

      diagnosticNeighborDistances.push(
        nearestDistance
      );
    }
  );

  diagnosticNeighborDistances.sort(
    (a, b) => a - b
  );

  const averageNearestDistance =
    diagnosticNeighborDistances.reduce(
      (total, distance) =>
        total + distance,
      0
    ) /
    diagnosticNeighborDistances.length;

  const minimumNearestDistance =
    diagnosticNeighborDistances[0];

  const maximumNearestDistance =
    diagnosticNeighborDistances[
      diagnosticNeighborDistances.length -
      1
    ];

  /*
    These values are diagnostic only for now.
    They do not yet change which candidate wins.
  */
  const averageSpacingDifference =
    Math.abs(
      averageNearestDistance -
      expectedSpacing
    );

  const neighborDistanceRange =
    maximumNearestDistance -
    minimumNearestDistance;

  lineCountCandidates.push({
    lineCount,
    spacingAcrossBlock,
    spacingDownRows,
    spacingBalanceError,
    averageRowSnapError,
    snappedRows,
    lineCounts,
    lineCountScore,

    averageNearestDistance,
    minimumNearestDistance,
    maximumNearestDistance,

    averageSpacingDifference,
    neighborDistanceRange
  });
}

/*
  Rank each possible deployment-line design by the
  actual snapped dispenser layout it produced.

  The mathematical estimate remains useful, but the
  finished tree-to-tree placement is now the primary
  basis for choosing the ideal layout.
*/
function getIdealLineDesignScore(
  candidate
) {
  /*
    Average nearest-neighbor spacing should remain
    close to the expected equal-area spacing.
  */
  const averageSpacingError =
    Math.abs(
      candidate.averageNearestDistance -
      expectedSpacing
    ) /
    expectedSpacing;

  /*
    A very close pair indicates clustering.
  */
  const preferredMinimumDistance =
    expectedSpacing * 0.65;

  const closePairPenalty =
    candidate.minimumNearestDistance <
      preferredMinimumDistance
      ? (
          preferredMinimumDistance -
          candidate.minimumNearestDistance
        ) /
        expectedSpacing
      : 0;

  /*
    A highly isolated dispenser indicates an open
    area or uneven spacing elsewhere in the block.
  */
  const preferredMaximumDistance =
    expectedSpacing * 1.35;

  const isolatedPointPenalty =
    candidate.maximumNearestDistance >
      preferredMaximumDistance
      ? (
          candidate.maximumNearestDistance -
          preferredMaximumDistance
        ) /
        expectedSpacing
      : 0;

  /*
    Measure how much nearest-neighbor spacing varies
    across the completed layout.
  */
  const spacingRangePenalty =
    candidate.neighborDistanceRange /
    expectedSpacing;

  /*
    Orchard-row snapping and theoretical line balance
    remain tie-breakers rather than the main objective.
  */
  const rowSnapPenalty =
    candidate.averageRowSnapError /
    input.rowSpacing;

  return (
    averageSpacingError * 4 +
    spacingRangePenalty * 3 +
    closePairPenalty * 6 +
    isolatedPointPenalty * 5 +
    rowSnapPenalty * 0.35 +
    candidate.spacingBalanceError * 0.25
  );
}

lineCountCandidates.forEach(
  candidate => {
    candidate.idealDesignScore =
      getIdealLineDesignScore(
        candidate
      );
  }
);

lineCountCandidates.sort(
  (a, b) => {
    if (
      a.idealDesignScore !==
      b.idealDesignScore
    ) {
      return (
        a.idealDesignScore -
        b.idealDesignScore
      );
    }

    /*
      When two completed layouts are nearly equal,
      prefer the design with less snapping from its
      mathematical coordinates.
    */
    if (
      a.averageRowSnapError !==
      b.averageRowSnapError
    ) {
      return (
        a.averageRowSnapError -
        b.averageRowSnapError
      );
    }

    return (
      a.lineCountScore -
      b.lineCountScore
    );
  }
);

const selectedLineDesign =
  lineCountCandidates[0];

  if (!selectedLineDesign) {
    return null;
  }

  const lineCounts =
    distributeCountAcrossLines(
      targetDispensers,
      selectedLineDesign
        .lineCount
    );

  const idealPoints = [];
  const snappedPlacements =
    [];
  const deploymentLines =
    [];

  const usedLocations =
    new Set();

  for (
    let lineIndex = 0;
    lineIndex <
      selectedLineDesign
        .lineCount;
    lineIndex++
  ) {
    const dispenserCount =
      lineCounts[lineIndex];

    const spacingDownLine =
      rowLength /
      dispenserCount;

    const idealXFeet =
      (
        lineIndex +
        0.5
      ) *
      selectedLineDesign
        .spacingAcrossBlock;

    const orchardRow =
      selectedLineDesign
        .snappedRows[
          lineIndex
        ];

    const actualRowXFeet =
      (
        orchardRow -
        0.5
      ) *
      input.rowSpacing;

    const lineIdealPoints =
      [];

    /*
      Alternate deployment lines are shifted by
      one-half of their down-row spacing.

      Positions that pass the far boundary wrap to
      the beginning of the block. This preserves the
      exact point count and creates a stagger.
    */
    const staggerFraction =
      lineIndex % 2 === 0
        ? 0
        : 0.5;

    for (
      let pointIndex = 0;
      pointIndex <
        dispenserCount;
      pointIndex++
    ) {
      let idealYFeet =
        (
          pointIndex +
          0.5 +
          staggerFraction
        ) *
        spacingDownLine;

      while (
        idealYFeet >=
        rowLength
      ) {
        idealYFeet -=
          rowLength;
      }

      const idealPoint = {
        lineIndex,
        pointIndex,
        idealXFeet,
        idealYFeet,
        intendedOrchardRow:
          orchardRow
      };

      idealPoints.push(
        idealPoint
      );

      lineIdealPoints.push(
        idealPoint
      );
    }

    /*
      Sort wrapped points back into physical order
      down the row.
    */
    lineIdealPoints.sort(
      (a, b) =>
        a.idealYFeet -
        b.idealYFeet
    );

    const linePlacements =
      [];

    lineIdealPoints.forEach(
      idealPoint => {
        const nearestTreeResult =
          findNearestUnusedTree(
            idealPoint.idealYFeet,
            orchardRow,
            treesPerRow,
            input.treeSpacing,
            usedLocations
          );

        if (
          nearestTreeResult.tree ===
          null
        ) {
          return;
        }

        const locationKey =
          `${orchardRow}|${nearestTreeResult.tree}`;

        usedLocations.add(
          locationKey
        );

        const actualYFeet =
          (
            nearestTreeResult.tree -
            0.5
          ) *
          input.treeSpacing;

        const acrossRowSnap =
          actualRowXFeet -
          idealPoint.idealXFeet;

        const alongRowSnap =
          actualYFeet -
          idealPoint.idealYFeet;

        const totalSnapDistance =
          Math.sqrt(
            acrossRowSnap ** 2 +
            alongRowSnap ** 2
          );

        const placement = {
          row:
            orchardRow,

          tree:
            nearestTreeResult.tree,

          lineIndex,

          idealXFeet:
            idealPoint.idealXFeet,

          idealYFeet:
            idealPoint.idealYFeet,

          actualXFeet:
            actualRowXFeet,

          actualYFeet,

          snapDistance:
            totalSnapDistance
        };

        snappedPlacements.push(
          placement
        );

        linePlacements.push(
          placement
        );
      }
    );

    linePlacements.sort(
      (a, b) =>
        a.tree -
        b.tree
    );

    deploymentLines.push({
      lineNumber:
        lineIndex + 1,

      orchardRow,

      dispenserCount,

      spacingDownLine,

      staggered:
        lineIndex % 2 === 1,

      placements:
        linePlacements
    });
  }

  /*
    Survey the final snapped placement.

    This does not reject anything yet. It provides
    measurements so we can verify that the mathematical
    layout is behaving correctly before replacing the
    recommendation engine.
  */
  const nearestNeighborDistances =
    [];

  snappedPlacements.forEach(
    (placement, placementIndex) => {
      let nearestDistance =
        Infinity;

      snappedPlacements.forEach(
        (
          otherPlacement,
          otherIndex
        ) => {
          if (
            placementIndex ===
            otherIndex
          ) {
            return;
          }

          const distance =
            physicalPlacementDistance(
              placement,
              otherPlacement,
              input
            );

          nearestDistance =
            Math.min(
              nearestDistance,
              distance
            );
        }
      );

      nearestNeighborDistances.push(
        nearestDistance
      );
    }
  );

  nearestNeighborDistances.sort(
    (a, b) => a - b
  );

  const averageNearestNeighborDistance =
    nearestNeighborDistances.reduce(
      (total, distance) =>
        total + distance,
      0
    ) /
    nearestNeighborDistances.length;

  const minimumNearestNeighborDistance =
    nearestNeighborDistances[0];

  const maximumNearestNeighborDistance =
    nearestNeighborDistances[
      nearestNeighborDistances.length -
      1
    ];

  const averageSnapDistance =
    snappedPlacements.reduce(
      (total, placement) =>
        total +
        placement.snapDistance,
      0
    ) /
    snappedPlacements.length;

  const worstSnapDistance =
    Math.max(
      ...snappedPlacements.map(
        placement =>
          placement.snapDistance
      )
    );

  return {
    blockArea,
    blockWidth,
    rowLength,
    treesPerRow,
    targetDispensers,
    targetAreaPerDispenser,
    expectedSpacing,

    lineCount:
      selectedLineDesign
        .lineCount,

    spacingAcrossBlock:
      selectedLineDesign
        .spacingAcrossBlock,

    averageSpacingDownRows:
      selectedLineDesign
        .spacingDownRows,

    idealPoints,
    placements:
      snappedPlacements,

    deploymentLines,

    averageSnapDistance,
    worstSnapDistance,

    averageNearestNeighborDistance,
    minimumNearestNeighborDistance,
    maximumNearestNeighborDistance
  };
}

/*
  Display the mathematical layout using the app's
  existing results screen and orchard map.
*/
function showIdealLayoutDemo() {
  const input =
    getInputs();

  if (
    !Number.isFinite(
      input.acres
    ) ||
    input.acres <= 0 ||

    !Number.isFinite(
      input.rows
    ) ||
    input.rows <= 0 ||

    !Number.isFinite(
      input.rowSpacing
    ) ||
    input.rowSpacing <= 0 ||

    !Number.isFinite(
      input.treeSpacing
    ) ||
    input.treeSpacing <= 0 ||

    !Number.isFinite(
      input.targetRate
    ) ||
    input.targetRate <= 0
  ) {
    alert(
      "Please enter acreage, number of rows, row spacing, tree spacing, and dispenser rate before previewing the ideal layout."
    );

    return;
  }

  const idealLayout =
    buildIdealLayout(input);

  if (!idealLayout) {
    alert(
      "The mathematical layout could not be created for the entered block."
    );

    return;
  }

  const layout = [];

  for (
    let rowIndex = 0;
    rowIndex < input.rows;
    rowIndex++
  ) {
    layout.push(
      Array(
        idealLayout.treesPerRow
      ).fill(false)
    );
  }

  idealLayout.placements.forEach(
    placement => {
      layout[
        placement.row - 1
      ][
        placement.tree - 1
      ] = true;
    }
  );

  currentInput = {
    ...input,

    targetDispensers:
      idealLayout.targetDispensers,

    targetAreaPerDispenser:
      idealLayout
        .targetAreaPerDispenser,

    estimatedRowLength:
      idealLayout.rowLength,

    treesPerRow:
      idealLayout.treesPerRow
  };

  setupScreen.classList.add(
    "hidden"
  );

  resultsScreen.classList.remove(
    "hidden"
  );

  summaryEl.classList.add(
    "hidden"
  );

  optionsEl.classList.add(
    "hidden"
  );

  mapSection.classList.remove(
    "hidden"
  );

  instructionsEl.classList.remove(
    "hidden"
  );

  const lineDescription =
    idealLayout.deploymentLines
      .map(line => {
        return (
          `Line ${line.lineNumber}: ` +
          `Orchard Row ${line.orchardRow}, ` +
          `${line.dispenserCount} dispensers` +
          (
            line.staggered
              ? ", half-spacing stagger"
              : ""
          )
        );
      })
      .join("<br>");

  selectedPlanText.innerHTML = `
    <button
      class="secondary-button"
      onclick="showSetupScreen()"
    >
      Back to Block Details
    </button>

    <br><br>

    <strong>
      Ideal Mathematical Layout Demo
    </strong>

    <p class="muted">
      This is the mathematically spaced layout
      snapped to actual orchard trees. It is not
      yet a final crew pattern.
    </p>
  `;

  renderMap(
    layout,
    currentInput
  );

  instructionsEl.innerHTML = `
    <h2>
      Mathematical Layout Details
    </h2>

    <div class="stats">
      <div class="stat">
        <span class="muted">
          Target
        </span>

        <strong>
          ${idealLayout.targetDispensers}
        </strong>

        <span class="muted">
          dispensers
        </span>
      </div>

      <div class="stat">
        <span class="muted">
          Deployment Lines
        </span>

        <strong>
          ${idealLayout.lineCount}
        </strong>

        <span class="muted">
          across block
        </span>
      </div>

      <div class="stat">
        <span class="muted">
          Across-Line Spacing
        </span>

        <strong>
          ${idealLayout.spacingAcrossBlock.toFixed(1)}
        </strong>

        <span class="muted">
          feet
        </span>
      </div>

      <div class="stat">
        <span class="muted">
          Average Down-Row Spacing
        </span>

        <strong>
          ${idealLayout.averageSpacingDownRows.toFixed(1)}
        </strong>

        <span class="muted">
          feet
        </span>
      </div>
    </div>

    <p>
      <strong>
        Selected orchard rows
      </strong>
      <br>
      ${lineDescription}
    </p>

    <ul class="instructions-list">
      <li>
        Entered rate:
        ${input.targetRate}
        per acre
      </li>

      <li>
        Ideal area per dispenser:
        ${idealLayout.targetAreaPerDispenser.toFixed(0)}
        sq ft
      </li>

      <li>
        Expected equal-spacing distance:
        ${idealLayout.expectedSpacing.toFixed(1)}
        ft
      </li>

      <li>
        Average snap to an actual tree:
        ${idealLayout.averageSnapDistance.toFixed(1)}
        ft
      </li>

      <li>
        Worst snap to an actual tree:
        ${idealLayout.worstSnapDistance.toFixed(1)}
        ft
      </li>

      <li>
        Average nearest-dispenser distance:
        ${idealLayout.averageNearestNeighborDistance.toFixed(1)}
        ft
      </li>

      <li>
        Closest dispenser pair:
        ${idealLayout.minimumNearestNeighborDistance.toFixed(1)}
        ft
      </li>

      <li>
        Most isolated dispenser:
        ${idealLayout.maximumNearestNeighborDistance.toFixed(1)}
        ft
      </li>
    </ul>

    <p class="muted">
      The next development stage will compare
      repeatable crew patterns directly against
      these stored ideal coordinates.
    </p>

    <button
      class="secondary-button"
      onclick="showSetupScreen()"
    >
      Back to Block Details
    </button>
  `;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}
function getBestPatterns(
  input,
  idealLayout,
  showClosest = false
) {
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
/*
  Store one mathematical ideal layout for each
  whole-number deployment-rate class.

  This ensures that a 34-per-acre candidate is always
  evaluated against the same 34-per-acre ideal layout,
  regardless of the rate originally entered.
*/
const idealLayoutsByRate =
  new Map();

function getEvaluationContext(
  effectiveRate
) {
  if (
    idealLayoutsByRate.has(
      effectiveRate
    )
  ) {
    return idealLayoutsByRate.get(
      effectiveRate
    );
  }

  const evaluationInput = {
    ...input,
    targetRate:
      effectiveRate
  };

  const evaluationIdealLayout =
    buildIdealLayout(
      evaluationInput
    );

  const context = {
    evaluationInput,
    evaluationIdealLayout
  };

  idealLayoutsByRate.set(
    effectiveRate,
    context
  );

  return context;
}
  /*
    Diagnostic storage only.

    This records the strongest rejected candidates so
    we can see exactly which audit prevented them from
    becoming grower-facing patterns.
  */
  const rejectedPatterns = [];

  let bestRejectedPattern = null;

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
  Do not reject an A/B pattern merely because positions
  on different orchard rows approach the same tree number.

  A and B dispensers remain physically separated by the
  orchard row spacing. The completed two-dimensional
  layout is evaluated later by the spacing, coverage,
  banding, and assigned-area audits.
*/
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
;
            const count =
              placements.length;

            if (!count) {
              continue;
            }

            /*
              Never recommend more dispensers than the grower
              requested or entered as available inventory.
              A lower-rate pattern can leave extras for borders;
              a higher-rate pattern would require inventory the
              grower may not have.
            */
            if (
              count > targetDispensers
            ) {
              continue;
            }

            const resultingRate =
              count / input.acres;
/*
  Grower-facing deployment rates are whole numbers.

  Examples:
  32.5 through 33.4 belong to the 33-per-acre class.
  33.5 through 34.4 belong to the 34-per-acre class.
*/
const effectiveRate =
  Math.round(
    resultingRate
  );

const {
  evaluationInput,
  evaluationIdealLayout
} =
  getEvaluationContext(
    effectiveRate
  );

if (
  !evaluationIdealLayout
) {
  continue;
}
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
/*
  A grower-selected product rate must be treated as
  the actual deployment target.

  Permit no more than one dispenser of unavoidable
  rounding difference during the normal search.
*/
/*
  Normal search allows candidates within three percent
  of the entered rate, whether the rate came from the
  product recommendation or was entered by the grower.

  Candidate grouping later uses the rounded displayed
  rate, so a calculated rate of 33.5 is treated as 34.
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
    evaluationInput
  );

const bandingAudit =
  auditWholeBlockBanding(
    placements,
    orchard,
    evaluationInput
  );

const assignedAreaAudit =
  auditAssignedCoverageArea(
    placements,
    orchard,
    evaluationInput
  );

const expectedSpacing =
  Math.sqrt(
    SQFT_PER_ACRE /
    effectiveRate
  );

/*
  Strict audit for fully optimized patterns.
*/
const passesOptimizedAudit =
  coverageQuality.passesSpacingAudit &&
  bandingAudit.passesBandingAudit &&
  assignedAreaAudit.passesAssignedAreaAudit;

/*
  Broader audit for "Closest Practical Patterns."

  These patterns may be somewhat less uniform than a
  fully optimized layout, but visibly severe clusters,
  open bands and large gaps are still rejected.
*/
const passesPracticalAudit =
  coverageQuality.closestDispenserDistance >=
    expectedSpacing * 0.35 &&

  coverageQuality.percentile95 <=
    expectedSpacing * 0.95 &&

  coverageQuality.worstNearestDistance <=
    expectedSpacing * 1.20 &&

  coverageQuality.neighborDistanceSpread <=
    1.80 &&

  coverageQuality.localDensitySpread <=
    4 &&

  coverageQuality.clusterPenalty <=
    0.16 &&

  coverageQuality.gapPenalty <=
    0.16 &&

  bandingAudit.alongRowVariation <=
    0.52 &&

  bandingAudit.acrossRowVariation <=
    0.52 &&

  bandingAudit.alongRowMaximumAdjacentChange <=
    1.50 &&

  bandingAudit.acrossRowMaximumAdjacentChange <=
    1.50;

/*
  Normal search requires a fully optimized pattern.

  The closest-pattern search uses the broader practical
  audit, but does not permit completely unrestricted
  layouts.
*/
if (
  !showClosest &&
  !passesOptimizedAudit
) {
  const rejectionReasons = [];

  if (
    !coverageQuality
      .passesSpacingAudit
  ) {
    rejectionReasons.push(
      "Spacing audit"
    );
  }

  if (
    !bandingAudit
      .passesBandingAudit
  ) {
    rejectionReasons.push(
      "Banding audit"
    );
  }

  if (
    !assignedAreaAudit
      .passesAssignedAreaAudit
  ) {
    rejectionReasons.push(
      "Assigned-area audit"
    );
  }

  /*
    Record the individual spacing-audit failures.

    These explain why passesSpacingAudit was false.
  */
  const spacingFailures = [];

  if (
    coverageQuality
      .closestDispenserDistance <
    expectedSpacing * 0.45
  ) {
    spacingFailures.push(
      "Closest dispenser pair too close"
    );
  }

  if (
    coverageQuality
      .neighborDistance50 <
    expectedSpacing * 0.60
  ) {
    spacingFailures.push(
      "Median dispenser spacing too close"
    );
  }

  if (
    coverageQuality
      .neighborDistanceSpread >
    1.45
  ) {
    spacingFailures.push(
      "Neighbor-distance spread too large"
    );
  }

  if (
    coverageQuality
      .localDensitySpread >
    2
  ) {
    spacingFailures.push(
      "Local-density spread too large"
    );
  }

  if (
    coverageQuality
      .percentile95 >
    expectedSpacing * 0.80
  ) {
    spacingFailures.push(
      "95th-percentile coverage gap too large"
    );
  }

  if (
    coverageQuality
      .worstNearestDistance >
    expectedSpacing
  ) {
    spacingFailures.push(
      "Worst coverage gap too large"
    );
  }

  if (
    coverageQuality
      .clusterPenalty >
    0.08
  ) {
    spacingFailures.push(
      "Cluster penalty too high"
    );
  }

  if (
    coverageQuality
      .gapPenalty >
    0.08
  ) {
    spacingFailures.push(
      "Gap penalty too high"
    );
  }

  /*
    Record the individual banding-audit failures.
  */
  const bandingFailures = [];

  if (
    bandingAudit
      .alongRowVariation >
    0.38
  ) {
    bandingFailures.push(
      "Along-row variation too high"
    );
  }

  if (
    bandingAudit
      .acrossRowVariation >
    0.38
  ) {
    bandingFailures.push(
      "Across-row variation too high"
    );
  }

  if (
    bandingAudit
      .alongRowMaximumRelativeCount >
    1.75
  ) {
    bandingFailures.push(
      "Along-row dense band too large"
    );
  }

  if (
    bandingAudit
      .acrossRowMaximumRelativeCount >
    1.75
  ) {
    bandingFailures.push(
      "Across-row dense band too large"
    );
  }

  if (
    bandingAudit
      .alongRowMinimumRelativeCount <
    0.25
  ) {
    bandingFailures.push(
      "Along-row open band too large"
    );
  }

  if (
    bandingAudit
      .acrossRowMinimumRelativeCount <
    0.25
  ) {
    bandingFailures.push(
      "Across-row open band too large"
    );
  }

  if (
    bandingAudit
      .alongRowMaximumAdjacentChange >
    1.15
  ) {
    bandingFailures.push(
      "Along-row adjacent band change too large"
    );
  }

  if (
    bandingAudit
      .acrossRowMaximumAdjacentChange >
    1.15
  ) {
    bandingFailures.push(
      "Across-row adjacent band change too large"
    );
  }

  /*
    Record the individual assigned-area failures.
  */
  const assignedAreaFailures = [];

 const evaluationTargetAreaPerDispenser =
  SQFT_PER_ACRE /
  effectiveRate;

const minimumAllowedAssignedArea =
  evaluationTargetAreaPerDispenser *
  0.55;

const maximumAllowedAssignedArea =
  evaluationTargetAreaPerDispenser *
  1.45;

  if (
    assignedAreaAudit
      .percentile10AssignedArea <
    minimumAllowedAssignedArea
  ) {
    assignedAreaFailures.push(
      "Small assigned areas indicate clustering"
    );
  }

  if (
    assignedAreaAudit
      .percentile90AssignedArea >
    maximumAllowedAssignedArea
  ) {
    assignedAreaFailures.push(
      "Large assigned areas indicate open coverage"
    );
  }

  if (
    assignedAreaAudit
      .assignedAreaSpread >
    2
  ) {
    assignedAreaFailures.push(
      "Assigned-area spread too large"
    );
  }

  if (
    assignedAreaAudit
      .assignedAreaVariation >
    0.32
  ) {
    assignedAreaFailures.push(
      "Assigned-area variation too high"
    );
  }

  if (
    assignedAreaAudit
      .assignedAreaScore >
    0.30
  ) {
    assignedAreaFailures.push(
      "Overall assigned-area score too high"
    );
  }

  const rejectedPattern = {
    count,
    resultingRate,
    percentOffTarget,

    rowInterval,
    patternAInterval,
    patternBInterval,
    patternAStart,
    patternBStart,

    rejectionReasons,
    spacingFailures,
    bandingFailures,
    assignedAreaFailures,

    passesSpacingAudit:
      coverageQuality
        .passesSpacingAudit,

    passesBandingAudit:
      bandingAudit
        .passesBandingAudit,

    passesAssignedAreaAudit:
      assignedAreaAudit
        .passesAssignedAreaAudit,

    expectedSpacing,

    closestDispenserDistance:
      coverageQuality
        .closestDispenserDistance,

    medianNeighborDistance:
      coverageQuality
        .neighborDistance50,

    percentile95:
      coverageQuality
        .percentile95,

    worstNearestDistance:
      coverageQuality
        .worstNearestDistance,

    neighborDistanceSpread:
      coverageQuality
        .neighborDistanceSpread,

    localDensitySpread:
      coverageQuality
        .localDensitySpread,
localDensity10:
  coverageQuality
    .localDensity10,

localDensity50:
  coverageQuality
    .localDensity50,

localDensity90:
  coverageQuality
    .localDensity90,
    gapPenalty:
      coverageQuality
        .gapPenalty,

    clusterPenalty:
      coverageQuality
        .clusterPenalty,

    assignedAreaScore:
      assignedAreaAudit
        .assignedAreaScore,

    assignedAreaSpread:
      assignedAreaAudit
        .assignedAreaSpread,

    assignedAreaVariation:
      assignedAreaAudit
        .assignedAreaVariation,

    percentile10AssignedArea:
      assignedAreaAudit
        .percentile10AssignedArea,

    percentile90AssignedArea:
      assignedAreaAudit
        .percentile90AssignedArea,

    bandingScore:
      bandingAudit
        .bandingScore,

        alongRowVariation:
      bandingAudit
        .alongRowVariation,

    acrossRowVariation:
      bandingAudit
        .acrossRowVariation,

    alongRowMaximumRelativeCount:
      bandingAudit
        .alongRowMaximumRelativeCount,

    acrossRowMaximumRelativeCount:
      bandingAudit
        .acrossRowMaximumRelativeCount,

    alongRowMinimumRelativeCount:
      bandingAudit
        .alongRowMinimumRelativeCount,

    acrossRowMinimumRelativeCount:
      bandingAudit
        .acrossRowMinimumRelativeCount,

    alongRowMaximumAdjacentChange:
      bandingAudit
        .alongRowMaximumAdjacentChange,

    acrossRowMaximumAdjacentChange:
      bandingAudit
        .acrossRowMaximumAdjacentChange,

    coverageScore:
      coverageQuality
        .coverageScore
  };

  rejectedPatterns.push(
    rejectedPattern
  );

  /*
    Keep the rejected candidate closest to the
    requested dispenser count.

    When counts are equal, keep the candidate with
    the lower coverage score.
  */
  if (
    !bestRejectedPattern ||

    Math.abs(
      rejectedPattern.count -
      targetDispensers
    ) <
    Math.abs(
      bestRejectedPattern.count -
      targetDispensers
    ) ||

    (
      Math.abs(
        rejectedPattern.count -
        targetDispensers
      ) ===
      Math.abs(
        bestRejectedPattern.count -
        targetDispensers
      ) &&

      rejectedPattern.coverageScore <
        bestRejectedPattern
          .coverageScore
    )
  ) {
    bestRejectedPattern =
      rejectedPattern;
  }

  continue;
}

if (
  showClosest &&
  !passesPracticalAudit
) {
  continue;
}
/*
  Compare this repeatable crew pattern with the
  ideal mathematical dispenser locations.

  Lower scores mean the repeatable pattern more
  closely follows the ideal layout.
*/
let totalIdealMatchDistance = 0;

evaluationIdealLayout.placements.forEach(
  idealPlacement => {
    let nearestCandidateDistance =
      Infinity;

    placements.forEach(
      candidatePlacement => {
        const distance =
          physicalPlacementDistance(
            idealPlacement,
            candidatePlacement,
            input
          );

        nearestCandidateDistance =
          Math.min(
            nearestCandidateDistance,
            distance
          );
      }
    );

    totalIdealMatchDistance +=
      nearestCandidateDistance;
  }
);

const averageIdealMatchDistance =
  evaluationIdealLayout.placements.length
    ? totalIdealMatchDistance /
      evaluationIdealLayout.placements.length
    : Infinity;

/*
  Also check in the opposite direction.

  This prevents a candidate from appearing to match
  the ideal layout merely because it covers each ideal
  point while placing additional dispensers elsewhere.
*/
let totalCandidateToIdealDistance = 0;

placements.forEach(
  candidatePlacement => {
    let nearestIdealDistance =
      Infinity;

    evaluationIdealLayout.placements.forEach(
      idealPlacement => {
        const distance =
          physicalPlacementDistance(
            candidatePlacement,
            idealPlacement,
            input
          );

        nearestIdealDistance =
          Math.min(
            nearestIdealDistance,
            distance
          );
      }
    );

    totalCandidateToIdealDistance +=
      nearestIdealDistance;
  }
);

const averageCandidateToIdealDistance =
  placements.length
    ? totalCandidateToIdealDistance /
      placements.length
    : Infinity;

const idealMatchScore =
  averageIdealMatchDistance +
  averageCandidateToIdealDistance
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
  assignedAreaAudit.assignedAreaScore *
    1000 +
  assignedAreaAudit.assignedAreaVariation *
    750 +
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
idealMatchScore,
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
  /*
    Diagnostic output.

    Put the candidates closest to the requested total
    first, then the candidates with the best coverage
    score.

    Open the browser console after generating patterns
    to inspect this table.
  */
  rejectedPatterns.sort(
    (a, b) => {
      const countDifferenceA =
        Math.abs(
          a.count -
          targetDispensers
        );

      const countDifferenceB =
        Math.abs(
          b.count -
          targetDispensers
        );

      if (
        countDifferenceA !==
        countDifferenceB
      ) {
        return (
          countDifferenceA -
          countDifferenceB
        );
      }

      return (
        a.coverageScore -
        b.coverageScore
      );
    }
  );

  if (
    !showClosest &&
    rejectedPatterns.length
  ) {
    console.group(
      "CT APP rejected-pattern audit"
    );

    console.log(
      "Requested rate:",
      input.targetRate
    );

    console.log(
      "Requested total:",
      targetDispensers
    );

    console.log(
  "Expected spacing:",
  Math.sqrt(
    SQFT_PER_ACRE /
    input.targetRate
  )
);

    console.table(
      rejectedPatterns
        .slice(0, 20)
        .map(pattern => ({
          total:
            pattern.count,

          rate:
            pattern.resultingRate
              .toFixed(2),

          rowInterval:
            pattern.rowInterval,

          patternA:
            `${pattern.patternAStart} every ${pattern.patternAInterval}`,

          patternB:
            `${pattern.patternBStart} every ${pattern.patternBInterval}`,

          failedAudits:
            pattern.rejectionReasons
              .join(", "),

          spacingFailures:
            pattern.spacingFailures
              .join(", "),

          bandingFailures:
            pattern.bandingFailures
              .join(", "),

          assignedAreaFailures:
            pattern.assignedAreaFailures
              .join(", "),

          closestPair:
            pattern
              .closestDispenserDistance
              .toFixed(1),

          medianSpacing:
            pattern
              .medianNeighborDistance
              .toFixed(1),

          percentile95Gap:
            pattern.percentile95
              .toFixed(1),

          worstGap:
            pattern
              .worstNearestDistance
              .toFixed(1),

          neighborSpread:
            pattern
              .neighborDistanceSpread
              .toFixed(2),

          densitySpread:
            pattern
              .localDensitySpread,

          areaSpread:
            pattern
              .assignedAreaSpread
              .toFixed(2),

          areaVariation:
            pattern
              .assignedAreaVariation
              .toFixed(2)
        }))
    );

    console.log(
      "Best rejected candidate:",
      rejectedPatterns[0]
    );

    console.groupEnd();
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
  First, prefer the repeatable pattern that most
  closely matches the ideal mathematical layout.

  Small differences are ignored so that noticeably
  better coverage or rate can still determine the
  final recommendation.
*/
const idealMatchTolerance = 3; // feet

if (
  Math.abs(
    a.idealMatchScore -
    b.idealMatchScore
  ) > idealMatchTolerance
) {
  return (
    a.idealMatchScore -
    b.idealMatchScore
  );
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
    patterns: [],
    bestRejectedPattern,

    rejectedPatterns:
      rejectedPatterns.slice(
        0,
        20
      )
  };
}

  /*
  Group candidates by the whole-number deployment-rate
  class shown to the grower.

  Examples:

  32 class:
  31.5 through 32.499...

  33 class:
  32.5 through 33.499...

  The decimal rate remains internal. The grower sees
  only the rounded whole-number rate.
*/
const requestedRateClass =
  Math.round(
    input.targetRate
  );

const requestedClassPatterns =
  [];

const lowerClassPatterns =
  [];

const higherClassPatterns =
  [];

uniquePatterns.forEach(
  pattern => {
    const patternRateClass =
      Math.round(
        pattern.resultingRate
      );

    pattern.rateClass =
      patternRateClass;

    if (
      patternRateClass ===
      requestedRateClass
    ) {
      requestedClassPatterns.push(
        pattern
      );

      return;
    }

    if (
      patternRateClass <
      requestedRateClass
    ) {
      lowerClassPatterns.push(
        pattern
      );

      return;
    }

    higherClassPatterns.push(
      pattern
    );
  }
);

/*
  uniquePatterns is already ranked by the engine.

  Preserve that existing quality order within the
  requested rate class.
*/
requestedClassPatterns.sort(
  (a, b) =>
    uniquePatterns.indexOf(a) -
    uniquePatterns.indexOf(b)
);

/*
  For lower-rate alternatives, first prefer the class
  nearest the grower's requested class.

  Within the same lower class, preserve the engine's
  existing quality ranking.
*/
lowerClassPatterns.sort(
  (a, b) => {
    if (
      a.rateClass !==
      b.rateClass
    ) {
      return (
        b.rateClass -
        a.rateClass
      );
    }

    return (
      uniquePatterns.indexOf(a) -
      uniquePatterns.indexOf(b)
    );
  }
);

/*
  For higher-rate alternatives, first prefer the class
  requiring the smallest increase.

  Within the same higher class, preserve the engine's
  existing quality ranking.
*/
higherClassPatterns.sort(
  (a, b) => {
    if (
      a.rateClass !==
      b.rateClass
    ) {
      return (
        a.rateClass -
        b.rateClass
      );
    }

    return (
      uniquePatterns.indexOf(a) -
      uniquePatterns.indexOf(b)
    );
  }
);

const selectedPatterns = [];

function addSelectedPattern(
  pattern
) {
  if (
    !pattern ||
    selectedPatterns.includes(
      pattern
    )
  ) {
    return;
  }

  selectedPatterns.push(
    pattern
  );
}

/*
  Pattern 1 must come from the requested rate class
  whenever a valid requested-class pattern exists.

  This protects the grower's expected inventory.
*/
addSelectedPattern(
  requestedClassPatterns[0]
);

/*
  Pattern 2 should also remain in the requested class
  when another valid requested-class pattern exists.
*/
addSelectedPattern(
  requestedClassPatterns[1]
);

/*
  If fewer than two requested-class patterns exist,
  fill the remaining early position with the best
  lower-rate alternative.

  The grower can use the remaining purchased
  dispensers along the highest-pressure edge.
*/
if (
  selectedPatterns.length < 2
) {
  addSelectedPattern(
    lowerClassPatterns[0]
  );
}

/*
  Pattern 3 should normally be the best unused
  lower-rate alternative.

  A higher-rate pattern is used only when no unused
  lower-rate alternative exists.
*/
const unusedLowerPattern =
  lowerClassPatterns.find(
    pattern =>
      !selectedPatterns.includes(
        pattern
      )
  );

if (
  unusedLowerPattern
) {
  addSelectedPattern(
    unusedLowerPattern
  );
}

/*
  If fewer than three options have been selected,
  first use another requested-class pattern, then
  another lower-class pattern, and finally a
  higher-class pattern.
*/
requestedClassPatterns.forEach(
  pattern => {
    if (
      selectedPatterns.length >= 3
    ) {
      return;
    }

    addSelectedPattern(
      pattern
    );
  }
);

lowerClassPatterns.forEach(
  pattern => {
    if (
      selectedPatterns.length >= 3
    ) {
      return;
    }

    addSelectedPattern(
      pattern
    );
  }
);

/*
  Higher-rate candidates are intentionally not selected.
  Growers can place leftover dispensers from a lower-rate
  pattern along borders, but cannot be expected to supply
  additional dispensers for a higher-rate pattern.
*/

/*
  Store inventory guidance for the UI.

  Lower-rate patterns leave dispensers available for
  the highest-pressure edge.

  Higher-rate patterns require additional inventory.
*/
selectedPatterns.forEach(
  pattern => {
    if (
      pattern.rateClass ===
      requestedRateClass
    ) {
      pattern.recommendationGroup =
        "requested-rate-class";
    } else if (
      pattern.rateClass <
      requestedRateClass
    ) {
      pattern.recommendationGroup =
        "lower-rate-class";
    } else {
      pattern.recommendationGroup =
        "higher-rate-class";
    }

    pattern.leftoverDispensers =
      Math.max(
        0,
        targetDispensers -
        pattern.count
      );

    pattern.additionalDispensers =
      Math.max(
        0,
        pattern.count -
        targetDispensers
      );
  }
);
    return {
    orchard,
    patterns:
      selectedPatterns,

    bestRejectedPattern,

    rejectedPatterns:
      rejectedPatterns.slice(
        0,
        20
      )
  };
}
/*

/*
  Generate repeatable deployment plans.

  The mathematical layout remains available as a
  development benchmark, but the grower-facing plan
  must come from the staggered repeatable-pattern engine.
*/
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

  if (
    input.selectedProduct &&
    (
      input.targetRate <
        input.selectedProduct.min ||

      input.targetRate >
        input.selectedProduct.max
    )
  ) {
    alert(
      `Enter a rate between ` +
      `${input.selectedProduct.min} and ` +
      `${input.selectedProduct.max} per acre for ` +
      `${input.selectedProduct.name}.`
    );

    return;
  }

  input.labelTargetDispensers =
    Math.round(
      input.acres *
      input.targetRate
    );

  input.inventoryIsLimited =
    Boolean(
      input.availableDispensers &&
      input.availableDispensers <
        input.labelTargetDispensers
    );

  /*
    The grower cannot be expected to have more than
    the entered-rate quantity unless a larger inventory
    was specifically entered.
  */
  input.targetDispensers =
    input.inventoryIsLimited
      ? input.availableDispensers
      : input.labelTargetDispensers;

  const idealLayout =
  buildIdealLayout(input);

if (!idealLayout) {
  alert(
    "Unable to generate an ideal mathematical layout for this block."
  );

  return;
}

let engineResults =
  getBestPatterns(
    input,
    idealLayout,
    showClosest
  );

let usedAutomaticPracticalFallback =
  false;

/*
  When no fully optimized pattern survives, automatically
  check the practical audit. Higher-rate candidates have
  already been excluded.
*/
if (
  !showClosest &&
  !engineResults.patterns.length
) {
  const practicalResults =
    getBestPatterns(
      input,
      idealLayout,
      true
    );

  if (
    practicalResults.patterns.length
  ) {
    engineResults =
      practicalResults;

    showClosest = true;

    usedAutomaticPracticalFallback =
      true;
  }
}

/*
  Save the closest rejected candidate so its audit
  failures can be shown directly on the results screen.
*/
currentRejectedPattern =
  engineResults.bestRejectedPattern ||
  null;

input.showingClosestPatterns =
  showClosest;

input.usingPracticalFallback =
  usedAutomaticPracticalFallback;

  input.targetAreaPerDispenser =
    43560 /
    input.targetRate;

  input.estimatedRowLength =
    engineResults.orchard.rowLength;

  input.treesPerRow =
    engineResults.orchard.treesPerRow;

  currentInput = input;

  currentPlans =
    engineResults.patterns.map(
      pattern =>
        convertEnginePatternToUiPlan(
          pattern,
          engineResults.orchard,
          input
        )
    );

  assignPatternBadges(
    currentPlans
  );

  renderSummary(
    input,
    engineResults.orchard.trees.length
  );

  renderOptions(
    currentPlans
  );

  showOptionsScreen();
}

/*
  Convert the validated ideal layout into the same
  plan shape already used by the app's cards, map,
  and instruction screens.
*/
/*
  Convert a repeatable A/B engine pattern into the
  format used by the option cards, map, and field
  instructions.
*/
function convertEnginePatternToUiPlan(
  pattern,
  orchard,
  input
) {
  const layout = [];

  for (
    let rowIndex = 0;
    rowIndex < orchard.rows;
    rowIndex++
  ) {
    layout.push(
      Array(
        orchard.treesPerRow
      ).fill(false)
    );
  }

  pattern.placements.forEach(
    placement => {
      layout[
        placement.row - 1
      ][
        placement.tree - 1
      ] = true;
    }
  );

  return {
    ...pattern,

    label:
      "Optimized Pattern",

    note: "",

    layout,

    actualRate:
      pattern.resultingRate,

    percentRateDifference:
      Math.abs(
        pattern.count -
        pattern.targetDispensers
      ) /
      pattern.targetDispensers,

    percentCoverageDifference:
      pattern.coverageDifferencePercent,

    betweenRowsFeet:
      pattern.rowInterval *
      input.rowSpacing,

    betweenTreesFeet:
      pattern.treeInterval *
      input.treeSpacing,

    actualAreaPerDispenser:
      pattern.actualAreaPerDispenser
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

${
  input.usingPracticalFallback
    ? `
      <p class="pattern-warning">
        <strong>Closest practical result:</strong>
        No fully optimized pattern passed at the requested rate.
        The options below use no more dispensers than requested.
        Review the coverage fit before selecting a plan; leftover
        dispensers may be placed along borders or the highest-pressure edge.
      </p>
    `
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
function renderRejectedPatternAudit(
  rejectedPattern
) {
  if (!rejectedPattern) {
    return "";
  }

  const failedAuditNames = [];

  if (
    !rejectedPattern
      .passesSpacingAudit
  ) {
    failedAuditNames.push(
      "Spacing audit"
    );
  }

  if (
    !rejectedPattern
      .passesBandingAudit
  ) {
    failedAuditNames.push(
      "Banding audit"
    );
  }

  if (
    !rejectedPattern
      .passesAssignedAreaAudit
  ) {
    failedAuditNames.push(
      "Assigned-area audit"
    );
  }

  const detailedFailures = [
    ...(
      rejectedPattern
        .spacingFailures ||
      []
    ),

    ...(
      rejectedPattern
        .bandingFailures ||
      []
    ),

    ...(
      rejectedPattern
        .assignedAreaFailures ||
      []
    )
  ];

  const auditNameText =
    failedAuditNames.length
      ? failedAuditNames.join(
          ", "
        )
      : "Unknown audit";

  const detailedFailureHtml =
    detailedFailures.length
      ? `
        <ul class="instructions-list">
          ${detailedFailures
            .map(
              failure =>
                `<li>${failure}</li>`
            )
            .join("")}
        </ul>
      `
      : `
        <p class="muted">
          The candidate failed an audit, but no
          individual threshold was recorded.
        </p>
      `;

  return `
    <div class="audit-details">
      <p>
        <strong>
          Development Audit
        </strong>
      </p>

      <p class="muted">
        Closest rejected candidate:
        <strong>
          ${rejectedPattern.count}
        </strong>
        dispensers
        ${
          Number.isFinite(
            rejectedPattern
              .resultingRate
          )
            ? `
              at
              <strong>
                ${rejectedPattern
                  .resultingRate
                  .toFixed(1)}
              </strong>
              per acre
            `
            : ""
        }.
      </p>

                <p class="muted">
        Failed:
        <strong>
          ${auditNameText}
        </strong>
      </p>

      ${detailedFailureHtml}

      ${
        !rejectedPattern.passesSpacingAudit
          ? `
            <p>
              <strong>
                Spacing Measurements
              </strong>
            </p>

            <ul class="instructions-list">
              <li>
                Local density (10th percentile):
                ${rejectedPattern.localDensity10}
              </li>

              <li>
                Local density (median):
                ${rejectedPattern.localDensity50}
              </li>

              <li>
                Local density (90th percentile):
                ${rejectedPattern.localDensity90}
              </li>

              <li>
                Local-density spread:
                ${rejectedPattern.localDensitySpread}
                — allowed maximum: 2
              </li>
            </ul>
          `
          : ""
      }

      ${
        !rejectedPattern
          .passesBandingAudit
          ? `
            <p>
              <strong>
                Banding Measurements
              </strong>
            </p>

            <ul class="instructions-list">
              <li>
                Across-row variation:
                ${rejectedPattern
                  .acrossRowVariation
                  .toFixed(3)}
                — allowed maximum: 0.380
              </li>

              <li>
                Along-row variation:
                ${rejectedPattern
                  .alongRowVariation
                  .toFixed(3)}
                — allowed maximum: 0.380
              </li>

              <li>
                Across-row densest strip:
                ${rejectedPattern
                  .acrossRowMaximumRelativeCount
                  .toFixed(3)}
                × expected
                — allowed maximum: 1.750
              </li>

              <li>
                Across-row sparsest strip:
                ${rejectedPattern
                  .acrossRowMinimumRelativeCount
                  .toFixed(3)}
                × expected
                — allowed minimum: 0.250
              </li>

              <li>
                Across-row largest adjacent change:
                ${rejectedPattern
                  .acrossRowMaximumAdjacentChange
                  .toFixed(3)}
                — allowed maximum: 1.150
              </li>
            </ul>
          `
          : ""
      }
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

        ${renderRejectedPatternAudit(
          currentRejectedPattern
        )}

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
          runPlanningTask(
            () => generatePlans(true),
            "Finding Closest Practical Patterns",
            "Reviewing nearby rates and checking spacing, coverage, and field practicality…"
          );
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
    currentInput?.usingPracticalFallback
      ? `
        <p class="pattern-warning">
          Closest practical option—not a fully optimized coverage match.
          This pattern does not exceed the requested dispenser total.
        </p>
      `
      : ``
  }

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
    <button class="secondary-button no-print" onclick="showOptionsScreen()">
      Back to Pattern Options
    </button>

    <div class="pattern-details-heading">
      <strong>Pattern Details</strong>
      <br>
      ${describePattern(plan)}
    </div>

    <section class="plan-save-panel no-print">
      <h3>Save or Print This Plan</h3>

      <label>
        Block Name
        <input
          id="planBlockName"
          type="text"
          maxlength="80"
          placeholder="Example: North Block"
          value="${escapeHtmlAttribute(currentOpenedBlockName)}">
      </label>

      <div class="plan-action-grid">
        <button id="saveBlockPlanBtn" type="button">
          Save Block in CT APP
        </button>

        <button id="printBlockPlanBtn" type="button" class="secondary-button">
          Print / Save as PDF
        </button>

        <button id="viewSavedBlocksFromPlanBtn" type="button" class="secondary-button">
          View Blocks Saved in CT APP
        </button>
      </div>

      <p id="planSaveStatus" class="hint"></p>
    </section>
  `;

  renderMap(plan.layout, input);
  renderInstructions(plan, input);
  setupPlanActionButtons();
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

    <button class="secondary-button no-print" onclick="showOptionsScreen()">
      Back to Pattern Options
    </button>
  `;
}
function ordinal(number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = number % 100;

  return number + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
}


function showSavedBlocks() {
  showSetupScreen();

  requestAnimationFrame(() => {
    savedBlocksSection?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

if (viewSavedBlocksBtn) {
  viewSavedBlocksBtn.addEventListener(
    "click",
    showSavedBlocks
  );
}

function getSavedBlocks() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(
        SAVED_BLOCKS_STORAGE_KEY
      ) || "[]"
    );

    return Array.isArray(saved)
      ? saved
      : [];
  } catch (error) {
    console.error(
      "Could not read saved blocks:",
      error
    );

    return [];
  }
}

function writeSavedBlocks(blocks) {
  localStorage.setItem(
    SAVED_BLOCKS_STORAGE_KEY,
    JSON.stringify(blocks)
  );
}

function normalizeBlockName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlAttribute(value) {
  return escapeHtml(value);
}

function makeSerializableInput(input) {
  return JSON.parse(
    JSON.stringify(input)
  );
}

function makeSerializablePlan(plan) {
  return JSON.parse(
    JSON.stringify(plan)
  );
}

function setupPlanActionButtons() {
  const saveButton =
    document.getElementById(
      "saveBlockPlanBtn"
    );

  const printButton =
    document.getElementById(
      "printBlockPlanBtn"
    );

  const viewSavedButton =
    document.getElementById(
      "viewSavedBlocksFromPlanBtn"
    );

  if (saveButton) {
    saveButton.addEventListener(
      "click",
      saveCurrentPlanToBlock
    );
  }

  if (printButton) {
    printButton.addEventListener(
      "click",
      printCurrentPlan
    );
  }

  if (viewSavedButton) {
    viewSavedButton.addEventListener(
      "click",
      showSavedBlocks
    );
  }
}

function saveCurrentPlanToBlock() {
  const blockNameInput =
    document.getElementById(
      "planBlockName"
    );

  const status =
    document.getElementById(
      "planSaveStatus"
    );

  const blockName =
    blockNameInput?.value
      ?.trim()
      .replace(/\s+/g, " ");

  if (!blockName) {
    if (status) {
      status.textContent =
        "Enter a block name before saving.";
    }

    blockNameInput?.focus();
    return;
  }

  if (
    !currentInput ||
    !currentSelectedPlan
  ) {
    if (status) {
      status.textContent =
        "Open a deployment pattern before saving.";
    }

    return;
  }

  const blocks = getSavedBlocks();
  const normalizedName =
    normalizeBlockName(blockName);

  const existingIndex =
    blocks.findIndex(
      block =>
        normalizeBlockName(
          block.name
        ) === normalizedName
    );

  if (existingIndex >= 0) {
    const replaceConfirmed = confirm(
      `"${blocks[existingIndex].name}" already has a saved plan. Replace it with this plan?`
    );

    if (!replaceConfirmed) {
      if (status) {
        status.textContent =
          "The existing saved plan was not changed.";
      }

      return;
    }
  }

  const savedRecord = {
    version: 1,
    id:
      existingIndex >= 0
        ? blocks[existingIndex].id
        : crypto.randomUUID(),
    name: blockName,
    savedAt:
      new Date().toISOString(),
    input:
      makeSerializableInput(
        currentInput
      ),
    plan:
      makeSerializablePlan(
        currentSelectedPlan
      )
  };

  if (existingIndex >= 0) {
    blocks[existingIndex] =
      savedRecord;
  } else {
    blocks.push(savedRecord);
  }

  blocks.sort(
    (a, b) =>
      a.name.localeCompare(b.name)
  );

  writeSavedBlocks(blocks);

  currentOpenedBlockName =
    blockName;

  if (status) {
    status.textContent =
      `Saved "${blockName}" inside CT APP on this device. No file was created.`;
  }

  renderSavedBlocks();
}

function openSavedBlock(blockId) {
  const block =
    getSavedBlocks().find(
      savedBlock =>
        savedBlock.id === blockId
    );

  if (!block) {
    renderSavedBlocks(
      "That saved block could not be found."
    );
    return;
  }

  currentInput =
    makeSerializableInput(
      block.input
    );

  currentSelectedPlan =
    makeSerializablePlan(
      block.plan
    );

  currentOpenedBlockName =
    block.name;

  showPlanScreen(
    currentSelectedPlan
  );
}

function renameSavedBlock(blockId) {
  const blocks = getSavedBlocks();
  const blockIndex =
    blocks.findIndex(
      block => block.id === blockId
    );

  if (blockIndex < 0) return;

  const oldName =
    blocks[blockIndex].name;

  const enteredName = prompt(
    "Enter the new block name:",
    oldName
  );

  if (enteredName == null) return;

  const newName =
    enteredName
      .trim()
      .replace(/\s+/g, " ");

  if (!newName) {
    alert(
      "The block name cannot be blank."
    );
    return;
  }

  const duplicateIndex =
    blocks.findIndex(
      (block, index) =>
        index !== blockIndex &&
        normalizeBlockName(
          block.name
        ) ===
        normalizeBlockName(
          newName
        )
    );

  if (duplicateIndex >= 0) {
    alert(
      "Another saved block already uses that name."
    );
    return;
  }

  blocks[blockIndex].name =
    newName;

  blocks[blockIndex].savedAt =
    new Date().toISOString();

  writeSavedBlocks(blocks);

  if (
    normalizeBlockName(
      currentOpenedBlockName
    ) ===
    normalizeBlockName(oldName)
  ) {
    currentOpenedBlockName =
      newName;
  }

  renderSavedBlocks(
    `Renamed "${oldName}" to "${newName}".`
  );
}

function deleteSavedBlock(blockId) {
  const blocks = getSavedBlocks();
  const block =
    blocks.find(
      savedBlock =>
        savedBlock.id === blockId
    );

  if (!block) return;

  const confirmed = confirm(
    `Delete the saved plan for "${block.name}" from this device?`
  );

  if (!confirmed) return;

  writeSavedBlocks(
    blocks.filter(
      savedBlock =>
        savedBlock.id !== blockId
    )
  );

  if (
    normalizeBlockName(
      currentOpenedBlockName
    ) ===
    normalizeBlockName(
      block.name
    )
  ) {
    currentOpenedBlockName = "";
  }

  renderSavedBlocks(
    `Deleted "${block.name}".`
  );
}

function renderSavedBlocks(
  message = ""
) {
  if (!savedBlocksList) return;

  const blocks =
    getSavedBlocks();

  if (!blocks.length) {
    savedBlocksList.innerHTML = `
      <p class="muted">
        No blocks have been saved on this device.
      </p>
    `;
  } else {
    savedBlocksList.innerHTML =
      blocks
        .map(block => {
          const plan = block.plan || {};
          const input = block.input || {};
          const productName =
            input.selectedProduct?.name ||
            "Manual rate";

          const savedDate =
            block.savedAt
              ? new Date(
                  block.savedAt
                ).toLocaleString()
              : "Unknown date";

          return `
            <article class="saved-block-item">
              <div>
                <h3>${escapeHtml(block.name)}</h3>

                <p class="muted">
                  ${escapeHtml(productName)}
                  ·
                  ${Number(
                    plan.resultingRate ||
                    plan.actualRate ||
                    input.targetRate ||
                    0
                  ).toFixed(1)}
                  per acre
                  ·
                  ${Number(
                    plan.count || 0
                  )}
                  dispensers
                </p>

                <p class="hint">
                  Saved ${escapeHtml(savedDate)}
                </p>
              </div>

              <div class="saved-block-actions">
                <button
                  type="button"
                  data-open-block="${escapeHtmlAttribute(block.id)}">
                  Open
                </button>

                <button
                  type="button"
                  class="secondary-button"
                  data-rename-block="${escapeHtmlAttribute(block.id)}">
                  Rename
                </button>

                <button
                  type="button"
                  class="secondary-button danger-button"
                  data-delete-block="${escapeHtmlAttribute(block.id)}">
                  Delete
                </button>
              </div>
            </article>
          `;
        })
        .join("");
  }

  savedBlocksList
    .querySelectorAll(
      "[data-open-block]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          openSavedBlock(
            button.dataset.openBlock
          )
      );
    });

  savedBlocksList
    .querySelectorAll(
      "[data-rename-block]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          renameSavedBlock(
            button.dataset.renameBlock
          )
      );
    });

  savedBlocksList
    .querySelectorAll(
      "[data-delete-block]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          deleteSavedBlock(
            button.dataset.deleteBlock
          )
      );
    });

  if (savedBlocksStatus) {
    savedBlocksStatus.textContent =
      message;
  }
}

function printCurrentPlan() {
  if (!currentSelectedPlan) {
    alert(
      "Open a deployment pattern before printing."
    );
    return;
  }

  document.body.dataset.printBlock =
    currentOpenedBlockName ||
    "Unsaved Plan";

  window.print();
}

function exportSavedBlocks() {
  const blocks = getSavedBlocks();

  if (!blocks.length) {
    renderSavedBlocks(
      "There are no blocks saved inside CT APP to export."
    );
    return;
  }

  const exportData = {
    type: "ct-app-saved-blocks",
    version: 1,
    exportedAt:
      new Date().toISOString(),
    blocks
  };

  const blob = new Blob(
    [
      JSON.stringify(
        exportData,
        null,
        2
      )
    ],
    {
      type: "application/json"
    }
  );

  const downloadUrl =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = downloadUrl;
  link.download =
    "CT-APP-saved-blocks.json";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(
    () =>
      URL.revokeObjectURL(
        downloadUrl
      ),
    1000
  );

  renderSavedBlocks(
    `Downloaded a backup file containing ${blocks.length} saved block${blocks.length === 1 ? "" : "s"}.`
  );
}

async function importSavedBlocks(
  event
) {
  const file =
    event.target.files?.[0];

  if (!file) return;

  try {
    const imported =
      JSON.parse(
        await file.text()
      );

    if (
      imported?.type !==
        "ct-app-saved-blocks" ||
      !Array.isArray(
        imported.blocks
      )
    ) {
      throw new Error(
        "That file is not a CT APP saved-block backup."
      );
    }

    const existing =
      getSavedBlocks();

    const merged =
      [...existing];

    let added = 0;
    let replaced = 0;

    imported.blocks.forEach(
      importedBlock => {
        if (
          !importedBlock?.name ||
          !importedBlock?.input ||
          !importedBlock?.plan
        ) {
          return;
        }

        const matchIndex =
          merged.findIndex(
            block =>
              normalizeBlockName(
                block.name
              ) ===
              normalizeBlockName(
                importedBlock.name
              )
          );

        if (matchIndex >= 0) {
          merged[matchIndex] =
            importedBlock;
          replaced++;
        } else {
          merged.push(
            importedBlock
          );
          added++;
        }
      }
    );

    const confirmed = confirm(
      `Import ${added} new block${added === 1 ? "" : "s"} and replace ${replaced} matching block${replaced === 1 ? "" : "s"} on this device?`
    );

    if (!confirmed) {
      renderSavedBlocks(
        "Import cancelled."
      );
      return;
    }

    writeSavedBlocks(merged);
    renderSavedBlocks(
      `Import complete: ${added} added and ${replaced} replaced.`
    );
  } catch (error) {
    console.error(
      "Saved block import failed:",
      error
    );

    renderSavedBlocks(
      error.message
    );
  } finally {
    importBlocksInput.value = "";
  }
}

if (exportBlocksBtn) {
  exportBlocksBtn.addEventListener(
    "click",
    exportSavedBlocks
  );
}

if (importBlocksInput) {
  importBlocksInput.addEventListener(
    "change",
    importSavedBlocks
  );
}

renderSavedBlocks();
