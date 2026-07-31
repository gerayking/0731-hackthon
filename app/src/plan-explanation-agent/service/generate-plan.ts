import { buildPlanningContext } from "@/plan-explanation-agent/domain/planning-context";
import { createConflict, createPlanItem, getEligibleDishMap, getPlanTotalPrice, getStrategyLabel, type GeneratePlanOptions } from "@/plan-explanation-agent/service/plan-scoring";
import type { Conflict, Plan, PlanItem, PlanResult, PlanningInputSnapshot, Strategy } from "@/contracts/snapshots";

export type GeneratePlanResponse = PlanResult;

export type GeneratePlanWithDetails = {
  result: PlanResult;
  assignments: Map<string, string[]>;
  selectedDishIds: string[];
};

function buildAssignments(context: ReturnType<typeof buildPlanningContext>, options: GeneratePlanOptions): {
  assignments: Map<string, string[]>;
  conflicts: Conflict[];
} {
  const members = context.session.members && context.session.members.length > 0 ? context.session.members : Array.from({ length: context.session.memberCount }, (_, index) => ({ id: `member_${index + 1}`, name: `成员 ${index + 1}` }));
  const eligibleByMember = getEligibleDishMap(context);
  const forcedDishIds = new Set(options.forcedDishIds ?? []);
  const blockedDishIds = new Set(options.blockedDishIds ?? []);
  const assignments = new Map<string, string[]>();
  const conflicts: Conflict[] = [];

  for (const forcedDishId of forcedDishIds) {
    if (blockedDishIds.has(forcedDishId)) {
      conflicts.push(createConflict("forced_dish_blocked", `用户要求加入的菜品 ${forcedDishId} 同时被移除，无法生成方案。`, forcedDishId));
    }

    const dish = context.menu.find((item) => item.id === forcedDishId);
    if (!dish) {
      conflicts.push(createConflict("forced_dish_not_found", `用户要求加入的菜品 ${forcedDishId} 不存在。`, forcedDishId));
      continue;
    }

    const eligibleMembers = eligibleByMember.get(members[0]?.id ?? "")?.filter((candidate) => candidate.dish.id === forcedDishId) ?? [];
    if (eligibleMembers.length === 0) {
      conflicts.push(createConflict("forced_dish_violates_hard_requirements", `用户要求加入的菜品 ${dish.name} 不满足任何成员的硬需求，已拒绝。`, dish.id));
    }
  }

  for (const member of members) {
    const eligibleDishes = eligibleByMember.get(member.id) ?? [];
    const availableDishes = eligibleDishes.filter((candidate) => !blockedDishIds.has(candidate.dish.id));

    if (availableDishes.length === 0) {
      conflicts.push(createConflict("member_has_no_eligible_dish", `${member.name} 没有满足硬需求的可点菜品。`, undefined, member.id));
      continue;
    }

    const forcedDish = availableDishes.find((candidate) => forcedDishIds.has(candidate.dish.id));
    const selectedDish = forcedDish?.dish ?? availableDishes[0]?.dish;

    if (!selectedDish) {
      continue;
    }

    const assignedMembers = assignments.get(selectedDish.id) ?? [];
    assignedMembers.push(member.id);
    assignments.set(selectedDish.id, assignedMembers);
  }

  return {
    assignments,
    conflicts,
  };
}

function createPlanFromAssignments(context: ReturnType<typeof buildPlanningContext>, assignments: Map<string, string[]>): {
  items: PlanItem[];
  selectedDishIds: string[];
} {
  const items: PlanItem[] = [];
  const selectedDishIds: string[] = [];

  for (const [dishId, memberIds] of assignments.entries()) {
    const dish = context.menu.find((item) => item.id === dishId);
    if (!dish) {
      continue;
    }

    items.push(createPlanItem(dish, 1, memberIds));
    selectedDishIds.push(dish.id);
  }

  items.sort((left, right) => left.dishName.localeCompare(right.dishName, "zh-Hans-CN"));

  return {
    items,
    selectedDishIds,
  };
}

function buildPlan(snapshot: PlanningInputSnapshot, context: ReturnType<typeof buildPlanningContext>, options: GeneratePlanOptions): {
  items: PlanItem[];
  selectedDishIds: string[];
  conflicts: Conflict[];
} {
  const assignmentResult = buildAssignments(context, options);
  const { items, selectedDishIds } = createPlanFromAssignments(context, assignmentResult.assignments);
  const totalPrice = getPlanTotalPrice(items);
  const conflicts = [...assignmentResult.conflicts];

  if (totalPrice > context.session.budget) {
    const cheapContext = buildPlanningContext({
      ...snapshot,
      strategy: "cheap",
    });
    const cheapAssignments = buildAssignments(cheapContext, {
      ...options,
      forcedDishIds: [],
    });
    const cheapPlan = createPlanFromAssignments(cheapContext, cheapAssignments.assignments);
    const cheapTotalPrice = getPlanTotalPrice(cheapPlan.items);

    if (cheapTotalPrice <= context.session.budget && cheapAssignments.conflicts.length === 0) {
      return {
        ...cheapPlan,
        conflicts: cheapAssignments.conflicts,
      };
    }

    conflicts.push(createConflict("budget_exceeded", `当前可选方案最低总价 ${cheapTotalPrice} 元，超过预算 ${context.session.budget} 元。`));
  }

  return {
    items,
    selectedDishIds,
    conflicts,
  };
}

export function generatePlan(snapshot: PlanningInputSnapshot, options: GeneratePlanOptions = {}): GeneratePlanWithDetails {
  const context = buildPlanningContext(snapshot);
  const planBuild = buildPlan(snapshot, context, options);
  const conflicts = planBuild.conflicts;

  if (conflicts.length > 0) {
    return {
      result: {
        ok: false,
        conflicts,
        suggestions: [
          "提高预算或减少用餐人数。",
          "放宽软偏好，例如辣度或品类偏好。",
          "请成员补充可替代忌口或可接受菜品。",
        ],
      },
      assignments: planBuild.items.reduce((map, item) => {
        map.set(item.dishId, item.sharedBy ?? []);
        return map;
      }, new Map<string, string[]>()),
      selectedDishIds: planBuild.selectedDishIds,
    };
  }

  const strategy: Strategy = snapshot.strategy ?? "balanced";
  const plan: Plan = {
    id: `plan_${strategy}_${planBuild.selectedDishIds.join("_")}`,
    items: planBuild.items,
    totalPrice: getPlanTotalPrice(planBuild.items),
    budget: context.session.budget,
    status: "valid",
  };

  return {
    result: {
      ok: true,
      plan,
    },
    assignments: planBuild.items.reduce((map, item) => {
      map.set(item.dishId, item.sharedBy ?? []);
      return map;
    }, new Map<string, string[]>()),
    selectedDishIds: planBuild.selectedDishIds,
  };
}

export function generatePlanResult(snapshot: PlanningInputSnapshot, options: GeneratePlanOptions = {}): PlanResult {
  return generatePlan(snapshot, options).result;
}

export function generatePlanSummary(snapshot: PlanningInputSnapshot, options: GeneratePlanOptions = {}): string {
  const result = generatePlan(snapshot, options).result;

  if (!result.ok) {
    return `方案生成失败：${result.conflicts.map((conflict) => conflict.message).join("；")}`;
  }

  const strategyLabel = getStrategyLabel(result.plan.budget === 0 ? "balanced" : snapshot.strategy ?? "balanced");
  return `已生成${strategyLabel}方案，共 ${result.plan.items.length} 道菜，总价 ${result.plan.totalPrice} 元，预算 ${result.plan.budget} 元。`;
}
