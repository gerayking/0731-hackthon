import type { Plan, PlanChangeRequest, PlanningInputSnapshot } from "@/src/contracts/snapshots";

export type NacPlanAdviceIntent = "explain" | "revise";

export type NacPlanAdviceInput = {
  intent: NacPlanAdviceIntent;
  snapshot: PlanningInputSnapshot;
  plan: Plan;
  changeRequest?: PlanChangeRequest;
};

export type NacPlanAdviceOutput = {
  explanation?: string;
  suggestions: string[];
};

export interface NacPlanAdapter {
  explainPlanAdvice(input: NacPlanAdviceInput): Promise<NacPlanAdviceOutput>;
}

export function createNoopNacPlanAdapter(): NacPlanAdapter {
  return {
    explainPlanAdvice: async () => ({
      suggestions: [],
    }),
  };
}
