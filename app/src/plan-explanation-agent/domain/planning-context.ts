import type { MealSession, MenuItem, PlanningInputSnapshot, Requirement, Strategy } from "@/contracts/snapshots";

export type ActiveRequirement = Requirement & {
  status: "active";
};

export type PlanningContext = {
  menu: MenuItem[];
  session: MealSession;
  activeRequirementsByMember: Record<string, ActiveRequirement[]>;
  strategy: Strategy;
};

export function buildPlanningContext(snapshot: PlanningInputSnapshot): PlanningContext {
  const activeRequirementsByMember: Record<string, ActiveRequirement[]> = {};

  for (const [memberId, requirements] of Object.entries(snapshot.requirementsByMember)) {
    activeRequirementsByMember[memberId] = requirements.filter((requirement) => requirement.status === "active") as ActiveRequirement[];
  }

  return {
    menu: snapshot.menu,
    session: snapshot.session,
    activeRequirementsByMember,
    strategy: snapshot.strategy ?? "balanced",
  };
}

export function getMemberName(context: PlanningContext, memberId: string): string | undefined {
  return context.session.members?.find((member) => member.id === memberId)?.name;
}
