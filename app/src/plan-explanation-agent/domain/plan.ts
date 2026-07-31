import type { BudgetExplanation, Conflict, ExcludedItemReason, ExplanationSnapshot, MemberRequirementStatus, Plan, PlanItem, PlanResult, SelectedReason } from "@/contracts/snapshots";

export type PlanServiceError = Conflict;

export type PlanGenerationOutcome =
  | { ok: true; plan: Plan }
  | { ok: false; conflicts: Conflict[]; suggestions: string[] };

export type PlanServiceResult = PlanResult;

export type RequirementMatch = {
  requirementId: string;
  memberId: string;
  reason: string;
};

export type ExclusionReason = {
  dishId: string;
  dishName: string;
  reasons: string[];
};

export type BudgetSummary = {
  used: number;
  budget: number;
  percent: number;
};

export type ExplanationParts = {
  selectedReasons: SelectedReason[];
  memberRequirementStatus: MemberRequirementStatus[];
  excludedItems: ExcludedItemReason[];
  budget: BudgetExplanation;
  conflicts: Conflict[];
};

export type PlanDiffInput = {
  before: Plan;
  after: Plan;
};

export type PlanDiffOutput = {
  addedItems: PlanItem[];
  removedItems: PlanItem[];
  changedItems: Array<{
    dishId: string;
    before: PlanItem;
    after: PlanItem;
  }>;
  summary: string;
};

export type ExplanationSnapshotWithPlan = ExplanationSnapshot & {
  plan: Plan;
};
