
import { generatePlanOptions } from "./modules/planner.js";
import { renderSummary, renderOptions, selectPlan } from "./modules/renderer.js";

const generateBtn = document.getElementById("generateBtn");

generateBtn.addEventListener("click", () => {
  const input = getInputs();
  const plans = generatePlanOptions(input);

  renderSummary(input, plans.targetDispensers, plans.totalTrees);

  renderOptions(plans.options, input, plans.targetDispensers, selectedPlan => {
    selectPlan(selectedPlan, input, plans.targetDispensers);
  });

  selectPlan(plans.options[0], input, plans.targetDispensers);
});
