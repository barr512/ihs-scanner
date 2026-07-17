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

if (generateBtn) {
  generateBtn.addEventListener(
    "click",
    event => {
      event.preventDefault();
      generatePlans();
    }
  );
}

if (idealDemoBtn) {
  idealDemoBtn.addEventListener(
    "click",
    event => {
      event.preventDefault();
      showIdealLayoutDemo();
    }
  );
}

if (backBtn) {
  backBtn.addEventListener("click", showSetupScreen);
}
if (topBackBtn) {
  topBackBtn.addEventListener("click", showSetupScreen);
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
    Math.round(
      rowLength / input.treeSpacing
    )
  );

  const orchard = {
    rows: input.rows,
    rowLength,
    treesPerRow,
    trees: []
  };

  for (
    let row = 1;
    row <= input.rows;
    row++
  ) {
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

  const totalTreeCapacity =
    input.rows * treesPerRow;

  const targetDispensers =
    input.inventoryIsLimited
      ? input.availableDispensers
      : Math.round(
          input.acres *
          input.targetRate
        );

  if (
    targetDispensers >
    totalTreeCapacity
  ) {
    return {
      orchard,
      patterns: [],
      bestRejectedPattern: null,
      rejectedPatterns: [],
      capacityExceeded: true,
      totalTreeCapacity,
      maximumRate:
        totalTreeCapacity /
        input.acres
    };
  }

  function getTreatedRows(
    rowInterval
  ) {
    const rowsRunNorthSouth =
      input.rowDirection ===
      "north-south";

    let rowStart = 1;
    let rowEnd = input.rows;
    let rowStep = 1;

    if (
      (
        rowsRunNorthSouth &&
        input.pressureEdge === "east"
      ) ||
      (
        !rowsRunNorthSouth &&
        input.pressureEdge === "south"
      )
    ) {
      rowStart = input.rows;
      rowEnd = 1;
      rowStep = -1;
    }

    const rows = [];

    for (
      let row = rowStart;
      rowStep === 1
        ? row <= rowEnd
        : row >= rowEnd;
      row += rowStep
    ) {
      if (
        Math.abs(
          row - rowStart
        ) %
          rowInterval ===
        0
      ) {
        rows.push(row);
      }
    }

    return rows;
  }

  function shouldReverseTrees() {
    if (
      input.rowDirection ===
      "north-south"
    ) {
      return (
        input.pressureEdge ===
        "south"
      );
    }

    return (
      input.pressureEdge ===
      "east"
    );
  }

  function buildEvenPositions(
    count,
    phase,
    reverseTrees
  ) {
    if (
      count <= 0 ||
      count > treesPerRow
    ) {
      return [];
    }

    const positions = [];

    for (
      let index = 0;
      index < count;
      index++
    ) {
      const position = Math.min(
        treesPerRow,
        1 +
          Math.floor(
            (
              index + phase
            ) *
              treesPerRow /
              count
          )
      );

      if (
        positions[
          positions.length - 1
        ] !== position
      ) {
        positions.push(position);
      }
    }

    const oriented =
      reverseTrees
        ? positions
            .map(
              tree =>
                treesPerRow -
                tree +
                1
            )
            .sort(
              (a, b) => a - b
            )
        : positions;

    return oriented;
  }

  function getGapSequence(
    positions
  ) {
    if (
      positions.length < 2
    ) {
      return [];
    }

    const gaps = [];

    for (
      let index = 1;
      index < positions.length;
      index++
    ) {
      gaps.push(
        positions[index] -
        positions[index - 1]
      );
    }

    /*
      Keep the shortest repeating prefix when one
      exists. Otherwise retain a practical sample
      for the grower-facing description.
    */
    for (
      let length = 1;
      length <=
        Math.min(12, gaps.length);
      length++
    ) {
      const repeats =
        gaps.every(
          (gap, index) =>
            gap ===
            gaps[index % length]
        );

      if (repeats) {
        return gaps.slice(
          0,
          length
        );
      }
    }

    return gaps.slice(0, 12);
  }

  function buildWholeBlockLattice(
    desiredCount,
    treatedRows,
    reverseTrees
  ) {
    const averageGap =
      (
        treatedRows.length *
        treesPerRow
      ) /
      desiredCount;

    const staggerFractions = [
      0.45,
      0.50,
      0.55
    ];

    let best = null;

    function makePatternSet(
      baseOffset,
      staggerFraction
    ) {
      const patterns = [];

      treatedRows.forEach(
        (row, rowIndex) => {
          const start =
            (
              baseOffset +
              (
                rowIndex % 2
              ) *
              averageGap *
              staggerFraction
            ) %
            averageGap;

          const positions = [];
          const used = new Set();

          for (
            let coordinate = start;
            coordinate < treesPerRow;
            coordinate += averageGap
          ) {
            const tree = Math.min(
              treesPerRow,
              1 +
                Math.round(
                  coordinate
                )
            );

            if (!used.has(tree)) {
              used.add(tree);
              positions.push(tree);
            }
          }

          patterns.push(
            positions.sort(
              (a, b) => a - b
            )
          );
        }
      );

      return patterns;
    }

    function getPatternScore(
      patterns
    ) {
      const total =
        patterns.reduce(
          (sum, positions) =>
            sum +
            positions.length,
          0
        );

      let alignedPairs = 0;
      let nearPairs = 0;

      for (
        let rowIndex = 1;
        rowIndex < patterns.length;
        rowIndex++
      ) {
        const previous =
          new Set(
            patterns[rowIndex - 1]
          );

        patterns[rowIndex].forEach(
          tree => {
            if (
              previous.has(tree)
            ) {
              alignedPairs++;
            }

            if (
              previous.has(tree - 1) ||
              previous.has(tree + 1)
            ) {
              nearPairs++;
            }
          }
        );
      }

      return {
        total,
        score:
          Math.abs(
            total -
            desiredCount
          ) *
            1000000 +
          alignedPairs *
            1000 +
          nearPairs
      };
    }

    for (
      const staggerFraction
      of staggerFractions
    ) {
      for (
        let step = 0;
        step < 96;
        step++
      ) {
        const baseOffset =
          (
            step /
            96
          ) *
          averageGap;

        const patterns =
          makePatternSet(
            baseOffset,
            staggerFraction
          );

        const evaluation =
          getPatternScore(
            patterns
          );

        if (
          !best ||
          evaluation.score <
            best.score
        ) {
          best = {
            patterns,
            score:
              evaluation.score,
            total:
              evaluation.total
          };
        }
      }
    }

    if (!best) {
      return null;
    }

    const patterns =
      best.patterns.map(
        positions =>
          [...positions]
      );

    function physicalDistance(
      firstRowIndex,
      firstTree,
      secondRowIndex,
      secondTree
    ) {
      const rowDistance =
        Math.abs(
          treatedRows[firstRowIndex] -
          treatedRows[secondRowIndex]
        ) *
        input.rowSpacing;

      const treeDistance =
        Math.abs(
          firstTree -
          secondTree
        ) *
        input.treeSpacing;

      return Math.sqrt(
        rowDistance ** 2 +
        treeDistance ** 2
      );
    }

    function nearestDistanceToPattern(
      rowIndex,
      tree,
      ignoreTree = null
    ) {
      let nearest = Infinity;

      const firstRow =
        Math.max(
          0,
          rowIndex - 1
        );

      const lastRow =
        Math.min(
          patterns.length - 1,
          rowIndex + 1
        );

      for (
        let otherRowIndex =
          firstRow;
        otherRowIndex <=
          lastRow;
        otherRowIndex++
      ) {
        patterns[
          otherRowIndex
        ].forEach(
          otherTree => {
            if (
              otherRowIndex ===
                rowIndex &&
              otherTree ===
                ignoreTree
            ) {
              return;
            }

            nearest = Math.min(
              nearest,
              physicalDistance(
                rowIndex,
                tree,
                otherRowIndex,
                otherTree
              )
            );
          }
        );
      }

      return nearest;
    }

    let total =
      patterns.reduce(
        (sum, positions) =>
          sum +
          positions.length,
        0
      );

    /*
      Boundary snapping can leave the continuous
      lattice a few dispensers short. Add those
      dispensers one at a time at the safest unused
      tree, while keeping row totals balanced.
    */
    while (
      total <
      desiredCount
    ) {
      const minimumRowCount =
        Math.min(
          ...patterns.map(
            positions =>
              positions.length
          )
        );

      let bestAddition = null;

      patterns.forEach(
        (positions, rowIndex) => {
          if (
            positions.length >
            minimumRowCount
          ) {
            return;
          }

          const used =
            new Set(positions);

          for (
            let tree = 1;
            tree <= treesPerRow;
            tree++
          ) {
            if (used.has(tree)) {
              continue;
            }

            const distance =
              nearestDistanceToPattern(
                rowIndex,
                tree
              );

            if (
              !bestAddition ||
              distance >
                bestAddition.distance
            ) {
              bestAddition = {
                rowIndex,
                tree,
                distance
              };
            }
          }
        }
      );

      if (!bestAddition) {
        return null;
      }

      patterns[
        bestAddition.rowIndex
      ].push(
        bestAddition.tree
      );

      patterns[
        bestAddition.rowIndex
      ].sort(
        (a, b) => a - b
      );

      total++;
    }

    /*
      If rounding created extras, remove the placement
      with the smallest local separation from one of
      the most populated rows.
    */
    while (
      total >
      desiredCount
    ) {
      const maximumRowCount =
        Math.max(
          ...patterns.map(
            positions =>
              positions.length
          )
        );

      let bestRemoval = null;

      patterns.forEach(
        (positions, rowIndex) => {
          if (
            positions.length <
            maximumRowCount
          ) {
            return;
          }

          positions.forEach(
            tree => {
              const distance =
                nearestDistanceToPattern(
                  rowIndex,
                  tree,
                  tree
                );

              if (
                !bestRemoval ||
                distance <
                  bestRemoval.distance
              ) {
                bestRemoval = {
                  rowIndex,
                  tree,
                  distance
                };
              }
            }
          );
        }
      );

      if (!bestRemoval) {
        return null;
      }

      patterns[
        bestRemoval.rowIndex
      ] =
        patterns[
          bestRemoval.rowIndex
        ].filter(
          tree =>
            tree !==
            bestRemoval.tree
        );

      total--;
    }

    if (reverseTrees) {
      return patterns.map(
        positions =>
          positions
            .map(
              tree =>
                treesPerRow -
                tree +
                1
            )
            .sort(
              (a, b) => a - b
            )
      );
    }

    return patterns;
  }

  function constructPattern(
    rateClass,
    rowInterval,
    phaseShift
  ) {
    const desiredCount =
      input.inventoryIsLimited
        ? targetDispensers
        : Math.round(
            rateClass *
            input.acres
          );

    const treatedRows =
      getTreatedRows(
        rowInterval
      );

    if (!treatedRows.length) {
      return null;
    }

    const treatedCapacity =
      treatedRows.length *
      treesPerRow;

    if (
      desiredCount >
      treatedCapacity
    ) {
      return null;
    }

    const basePerRow =
      Math.floor(
        desiredCount /
        treatedRows.length
      );

    const remainder =
      desiredCount %
      treatedRows.length;

    const reverseTrees =
      shouldReverseTrees();

    const rowPatterns =
      buildWholeBlockLattice(
        desiredCount,
        treatedRows,
        reverseTrees
      );

    if (!rowPatterns) {
      return null;
    }

    const rowCounts =
      rowPatterns.map(
        positions =>
          positions.length
      );

    const placements = [];

    treatedRows.forEach(
      (row, rowIndex) => {
        rowPatterns[
          rowIndex
        ].forEach(
          tree => {
            placements.push({
              row,
              tree
            });
          }
        );
      }
    );

    if (
      placements.length !==
      desiredCount
    ) {
      return null;
    }

    const resultingRate =
      placements.length /
      input.acres;

    const evaluationInput = {
      ...input,
      targetRate:
        resultingRate
    };

    const expectedSpacing =
      Math.sqrt(
        SQFT_PER_ACRE /
        resultingRate
      );

    const averageAlongRowSpacing =
      rowPatterns.length &&
      rowPatterns[0].length
        ? (
            treesPerRow /
            rowPatterns[0].length
          ) *
          input.treeSpacing
        : Infinity;

    const acrossRowSpacing =
      rowInterval *
      input.rowSpacing;

    const geometryScore =
      Math.abs(
        acrossRowSpacing -
        expectedSpacing *
          0.866
      ) +
      Math.abs(
        averageAlongRowSpacing -
        expectedSpacing
      );

    return {
      patternType:
        placements.length ===
        totalTreeCapacity
          ? "every-tree"
          : "direct-mixed-gap",
      rowInterval,
      treatedRows,
      rowCounts,
      rowPatterns,
      placements,
      count:
        placements.length,
      targetDispensers,
      resultingRate,
      percentOffTarget:
        Math.abs(
          resultingRate -
          input.targetRate
        ) /
        input.targetRate,
      actualAreaPerDispenser:
        blockArea /
        placements.length,
      coverageDifferencePercent:
        Math.abs(
          resultingRate -
          input.targetRate
        ) /
        input.targetRate,
      patternAInterval:
        Math.max(
          1,
          Math.round(
            treesPerRow /
            Math.max(
              1,
              rowCounts[0] || 1
            )
          )
        ),
      patternBInterval:
        Math.max(
          1,
          Math.round(
            treesPerRow /
            Math.max(
              1,
              rowCounts[1] ||
              rowCounts[0] ||
              1
            )
          )
        ),
      patternAStart:
        rowPatterns[0]?.[0] || 1,
      patternBStart:
        rowPatterns[1]?.[0] ||
        rowPatterns[0]?.[0] ||
        1,
      patternAPositions:
        rowPatterns[0] || [],
      patternBPositions:
        rowPatterns[1] ||
        rowPatterns[0] ||
        [],
      treeInterval:
        Math.max(
          1,
          Math.round(
            treesPerRow /
            Math.max(
              1,
              desiredCount /
              treatedRows.length
            )
          )
        ),
      offset: 1,
      gapSequence:
        getGapSequence(
          rowPatterns[0] || []
        ),
      rowCountSequence:
        rowCounts.slice(
          0,
          Math.min(
            rowCounts.length,
            12
          )
        ),
      minimumWithinRowGapFeet:
        Math.max(
          1,
          Math.floor(
            treesPerRow /
            Math.max(
              ...rowCounts
            )
          )
        ) *
        input.treeSpacing,
      geometryScore,
      expectedSpacing,
      evaluationInput
    };
  }

  function auditCandidate(
    candidate
  ) {
    if (
      candidate.patternType ===
      "every-tree"
    ) {
      return {
        ...candidate,
        coverageScore: 0,
        coverageUniformity: 100,
        idealMatchScore: 0,
        auditPassed: true
      };
    }

    const coverage =
      scoreCoverageQuality(
        candidate.placements,
        orchard,
        candidate.evaluationInput
      );

    const banding =
      auditWholeBlockBanding(
        candidate.placements,
        orchard,
        candidate.evaluationInput
      );

    const assigned =
      auditAssignedCoverageArea(
        candidate.placements,
        orchard,
        candidate.evaluationInput
      );

    /*
      At high density, whole-tree Voronoi cells are
      too coarse to make assigned-area percentiles a
      hard rejection rule. Direct construction already
      balances row totals and within-row gaps. Spacing
      and banding remain the hard physical safeguards.
    */
    const highDensity =
      candidate.resultingRate >=
      80;

    const practicalSpacing =
      coverage
        .closestDispenserDistance >=
        candidate.expectedSpacing *
          0.35 &&
      coverage.percentile95 <=
        candidate.expectedSpacing *
          0.95 &&
      coverage.worstNearestDistance <=
        candidate.expectedSpacing *
          1.20 &&
      coverage.neighborDistanceSpread <=
        1.85 &&
      coverage.localDensitySpread <=
        4 &&
      coverage.clusterPenalty <=
        0.16 &&
      coverage.gapPenalty <=
        0.16;

    const practicalBanding =
      banding.alongRowVariation <=
        0.52 &&
      banding.acrossRowVariation <=
        0.52 &&
      banding
        .alongRowMaximumAdjacentChange <=
        1.50 &&
      banding
        .acrossRowMaximumAdjacentChange <=
        1.50;

    const rowCountSpread =
      Math.max(
        ...candidate.rowCounts
      ) -
      Math.min(
        ...candidate.rowCounts
      );

    const balancedWithinRows =
      candidate.rowPatterns.every(
        positions => {
          if (
            positions.length < 3
          ) {
            return true;
          }

          const gaps = [];

          for (
            let index = 1;
            index < positions.length;
            index++
          ) {
            gaps.push(
              positions[index] -
              positions[index - 1]
            );
          }

          return (
            Math.max(...gaps) -
            Math.min(...gaps) <=
            2
          );
        }
      );

    /*
      Direct high-density patterns are constructed
      with row totals differing by no more than one
      and within-row gaps using neighboring whole-tree
      intervals. These construction guarantees are
      more reliable than coarse whole-tree area bands
      when many dispensers are used.
    */
    const highDensityAudit =
      rowCountSpread <= 1 &&
      balancedWithinRows &&
      coverage
        .closestDispenserDistance >=
        Math.min(
          candidate.expectedSpacing *
            0.78,
          candidate
            .minimumWithinRowGapFeet *
            0.98,
          candidate.rowInterval *
            input.rowSpacing *
            0.95
        ) &&
      coverage
        .worstNearestDistance <=
        candidate.expectedSpacing *
          1.35;

    const auditPassed =
      highDensity
        ? highDensityAudit
        : (
            coverage
              .passesSpacingAudit &&
            banding
              .passesBandingAudit &&
            assigned
              .passesAssignedAreaAudit
          );

    return {
      ...candidate,
      coverageScore:
        coverage.coverageScore,
      coverageUniformity:
        coverage.coverageUniformity,
      idealMatchScore:
        candidate.geometryScore,
      assignedAreaScore:
        assigned.assignedAreaScore,
      bandingScore:
        banding.bandingScore,
      auditPassed
    };
  }

  function bestPatternForRate(
    rateClass
  ) {
    const preliminary = [];

    const maximumRowInterval =
      rateClass >= 80
        ? 1
        : Math.min(
            10,
            input.rows
          );

    for (
      let rowInterval = 1;
      rowInterval <=
        maximumRowInterval;
      rowInterval++
    ) {
      for (
        let phaseShift = 0;
        phaseShift < 2;
        phaseShift++
      ) {
        const pattern =
          constructPattern(
            rateClass,
            rowInterval,
            phaseShift
          );

        if (pattern) {
          preliminary.push(
            pattern
          );
        }
      }
    }

    preliminary.sort(
      (a, b) =>
        a.geometryScore -
        b.geometryScore
    );

    /*
      Audit only the most plausible directly
      constructed finalists. This avoids the long
      brute-force delay.
    */
    const finalists =
      preliminary.slice(0, 4);

    const audited =
      finalists
        .map(auditCandidate)
        .filter(
          pattern =>
            pattern.auditPassed
        )
        .sort(
          (a, b) => {
            if (
              a.coverageScore !==
              b.coverageScore
            ) {
              return (
                a.coverageScore -
                b.coverageScore
              );
            }

            return (
              a.geometryScore -
              b.geometryScore
            );
          }
        );

    return audited[0] || null;
  }

  const requestedRateClass =
    Math.round(
      input.inventoryIsLimited
        ? targetDispensers /
          input.acres
        : input.targetRate
    );

  const selectedPatterns = [];
  const usedMapKeys = new Set();

  function addIfUnique(
    pattern,
    group
  ) {
    if (!pattern) return false;

    const mapKey =
      pattern.placements
        .map(
          place =>
            `${place.row}:${place.tree}`
        )
        .join("|");

    if (
      usedMapKeys.has(mapKey)
    ) {
      return false;
    }

    usedMapKeys.add(mapKey);
    pattern.rateClass =
      Math.round(
        pattern.resultingRate
      );
    pattern.recommendationGroup =
      group;
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

    selectedPatterns.push(
      pattern
    );

    return true;
  }

  const requestedPattern =
    bestPatternForRate(
      requestedRateClass
    );

  addIfUnique(
    requestedPattern,
    "requested-rate-class"
  );

  const searchRange =
    showClosest
      ? Math.max(
          20,
          Math.ceil(
            requestedRateClass *
            0.20
          )
        )
      : Math.max(
          3,
          Math.ceil(
            requestedRateClass *
            0.03
          )
        );

  let lowerPattern = null;

  for (
    let difference = 1;
    difference <= searchRange;
    difference++
  ) {
    const rateClass =
      requestedRateClass -
      difference;

    if (rateClass < 1) break;

    lowerPattern =
      bestPatternForRate(
        rateClass
      );

    if (lowerPattern) break;
  }

  addIfUnique(
    lowerPattern,
    "lower-rate-class"
  );

  let higherPattern = null;

  for (
    let difference = 1;
    difference <= searchRange;
    difference++
  ) {
    const rateClass =
      requestedRateClass +
      difference;

    if (
      input.selectedProduct &&
      rateClass >
        input.selectedProduct.max
    ) {
      break;
    }

    if (
      Math.round(
        rateClass *
        input.acres
      ) >
      totalTreeCapacity
    ) {
      break;
    }

    higherPattern =
      bestPatternForRate(
        rateClass
      );

    if (higherPattern) break;
  }

  addIfUnique(
    higherPattern,
    "higher-rate-class"
  );

  return {
    orchard,
    patterns:
      selectedPatterns,
    bestRejectedPattern: null,
    rejectedPatterns: [],
    capacityExceeded: false,
    totalTreeCapacity,
    maximumRate:
      totalTreeCapacity /
      input.acres
  };
}

/*
  Generate repeatable deployment plans.

  The direct-construction engine builds balanced
  mixed-gap patterns before auditing a few finalists.
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

  const estimatedRowLength =
    (
      input.acres * 43560
    ) /
    (
      input.rowSpacing *
      input.rows
    );

  const estimatedTreesPerRow =
    Math.max(
      1,
      Math.round(
        estimatedRowLength /
        input.treeSpacing
      )
    );

  const totalTreeCapacity =
    input.rows *
    estimatedTreesPerRow;

  if (
    input.targetDispensers >
    totalTreeCapacity
  ) {
    const maximumRate =
      totalTreeCapacity /
      input.acres;

    alert(
      `This block has approximately ${totalTreeCapacity} trees, so the requested total of ${input.targetDispensers} would require more than one dispenser on some trees. The maximum practical rate is approximately ${maximumRate.toFixed(1)} per acre.`
    );

    return;
  }

  const idealLayout =
  buildIdealLayout(input);

if (!idealLayout) {
  alert(
    "Unable to generate an ideal mathematical layout for this block."
  );

  return;
}

const engineResults =
  getBestPatterns(
    input,
    idealLayout,
    showClosest
  );

/*
  Save the closest rejected candidate so its audit
  failures can be shown directly on the results screen.
*/
currentRejectedPattern =
  engineResults.bestRejectedPattern ||
  null;

input.showingClosestPatterns =
  showClosest;

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
  if (
    plan.patternType ===
    "every-tree"
  ) {
    return "Place one dispenser on every tree. No staggered optimization is needed because the requested rate uses the full tree capacity of this block.";
  }

  if (
    plan.patternType ===
    "direct-mixed-gap"
  ) {
    const gapText =
      plan.gapSequence?.length
        ? plan.gapSequence.join(", ")
        : "the displayed mixed spacing";

    const rowText =
      plan.rowInterval === 1
        ? "every row"
        : `every ${ordinal(plan.rowInterval)} row`;

    return `Treat ${rowText}. Use the repeating within-row gap sequence ${gapText} trees, and shift the sequence on neighboring treated rows to maintain staggered coverage. Follow the map for the starting phase from the selected highest-pressure edge.`;
  }

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
  <br>
  Diagram spacing is scaled to the entered row and tree spacing.
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

  /*
    Draw the orchard using the entered physical
    proportions. For example, 12-foot rows and
    6-foot tree spacing display with twice as much
    distance across rows as between trees.
  */
  const overviewScale =
    className.includes(
      "overview-map"
    );

  const dotSize =
    overviewScale ? 5 : 13;

  const baseCenterDistance =
    overviewScale ? 7 : 18;

  const maximumCenterDistance =
    overviewScale ? 14 : 36;

  const smallestPhysicalSpacing =
    Math.min(
      input.rowSpacing,
      input.treeSpacing
    );

  function scaledCenterDistance(
    physicalSpacing
  ) {
    return Math.min(
      maximumCenterDistance,
      baseCenterDistance *
        physicalSpacing /
        smallestPhysicalSpacing
    );
  }

  const outerPhysicalSpacing =
    input.rowDirection ===
    "east-west"
      ? input.rowSpacing
      : input.treeSpacing;

  const innerPhysicalSpacing =
    input.rowDirection ===
    "east-west"
      ? input.treeSpacing
      : input.rowSpacing;

  const outerGap =
    Math.max(
      1,
      scaledCenterDistance(
        outerPhysicalSpacing
      ) -
      dotSize
    );

  const innerGap =
    Math.max(
      1,
      scaledCenterDistance(
        innerPhysicalSpacing
      ) -
      dotSize
    );

  orchardEl.style.gap =
    `${outerGap}px`;

  if (input.rowDirection === "east-west") {
    for (let rowIndex = rowStartIndex; rowIndex < rowStartIndex + rows; rowIndex++) {
      const treeLine = document.createElement("div");
      treeLine.className = "tree-line";
      treeLine.style.gap =
        `${innerGap}px`;

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
      treeLine.style.gap =
        `${innerGap}px`;

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
