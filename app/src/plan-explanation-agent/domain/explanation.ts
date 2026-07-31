import type { ExplanationSnapshot } from "@/contracts/snapshots";

export type ExplanationInput = {
  selectedReasons: ExplanationSnapshot["selectedReasons"];
  memberRequirementStatus: ExplanationSnapshot["memberRequirementStatus"];
  excludedItems: ExplanationSnapshot["excludedItems"];
  budget: ExplanationSnapshot["budget"];
  conflicts: ExplanationSnapshot["conflicts"];
};

export type ExplanationSummary = {
  selectedCount: number;
  excludedCount: number;
  conflictCount: number;
  budgetPercent: number;
};
