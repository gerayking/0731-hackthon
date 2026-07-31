import type { PlanChangeRequest } from "@/contracts/snapshots";

export type RevisionRequest = PlanChangeRequest;

export type RevisionDecision = {
  blocked: boolean;
  reason?: string;
};
