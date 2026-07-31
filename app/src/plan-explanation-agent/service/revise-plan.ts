import { diffPlans } from "@/plan-explanation-agent/service/diff-plan";
import { generatePlan } from "@/plan-explanation-agent/service/generate-plan";
import type { PlanChangeRequest, PlanDiff, PlanResult, RevisionInputSnapshot } from "@/contracts/snapshots";

export type RevisePlanResponse = {
  result: PlanResult;
  diff: PlanDiff;
};

function applyChangeRequest(contextSnapshot: RevisionInputSnapshot["currentContext"], requestedChanges: PlanChangeRequest[]): {
  blockedDishIds: string[];
  forcedDishIds: string[];
  strategy?: RevisionInputSnapshot["currentContext"]["strategy"];
} {
  const blockedDishIds: string[] = [];
  const forcedDishIds: string[] = [];
  let strategy: RevisionInputSnapshot["currentContext"]["strategy"] = contextSnapshot.strategy;

  for (const change of requestedChanges) {
    switch (change.type) {
      case "remove_item":
        blockedDishIds.push(change.dishId);
        break;
      case "add_item":
        forcedDishIds.push(change.dishId);
        break;
      case "change_strategy":
        strategy = change.strategy;
        break;
    }
  }

  return {
    blockedDishIds,
    forcedDishIds,
    strategy,
  };
}

export function revisePlan(revision: RevisionInputSnapshot): RevisePlanResponse {
  const changes = applyChangeRequest(revision.currentContext, revision.requestedChanges);
  const nextContext = {
    ...revision.currentContext,
    strategy: changes.strategy,
  };
  const result = generatePlan(nextContext, {
    blockedDishIds: changes.blockedDishIds,
    forcedDishIds: changes.forcedDishIds,
  }).result;
  const diff = diffPlans(revision.previousPlan, result.ok ? result.plan : revision.previousPlan);

  return {
    result,
    diff,
  };
}
