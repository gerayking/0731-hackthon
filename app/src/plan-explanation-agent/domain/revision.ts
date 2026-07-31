import type { PlanChangeRequest } from "@/src/contracts/snapshots";

export type RevisionRequest = PlanChangeRequest;

export type RevisionDecision = {
  blocked: boolean;
  reason?: string;
};
