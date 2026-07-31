import { buildPlanningContext } from "@/src/plan-explanation-agent/domain/planning-context";
import { getDishMemberEligibility, getEligibleDishMap } from "@/src/plan-explanation-agent/service/plan-scoring";
import type { BudgetExplanation, Conflict, ExplanationSnapshot, ExcludedItemReason, MemberRequirementStatus, Plan, PlanningInputSnapshot, SelectedReason } from "@/src/contracts/snapshots";

export function explainPlan(snapshot: PlanningInputSnapshot, plan: Plan): ExplanationSnapshot {
  const context = buildPlanningContext(snapshot);
  const members = context.session.members && context.session.members.length > 0 ? context.session.members : Array.from({ length: context.session.memberCount }, (_, index) => ({ id: `member_${index + 1}`, name: `成员 ${index + 1}` }));
  const planItems = plan.items;
  const selectedReasons: SelectedReason[] = [];
  const excludedItems: ExcludedItemReason[] = [];
  const conflicts: Conflict[] = [];
  const memberRequirementStatus: MemberRequirementStatus[] = [];

  for (const item of planItems) {
    const dish = context.menu.find((menuItem) => menuItem.id === item.dishId);
    if (!dish) {
      conflicts.push({
        code: "plan_item_not_in_menu",
        message: `方案中的菜品 ${item.dishName} 不在当前菜单中。`,
        dishId: item.dishId,
      });
      continue;
    }

    const reasons = [`价格 ${dish.price} 元，在预算 ${plan.budget} 元内。`];

    if (dish.isVegetarian === true) {
      reasons.push("素食菜品，覆盖素食偏好。");
    }

    if (dish.spiciness && dish.spiciness !== "none") {
      reasons.push(`辣度为 ${dish.spiciness}，可满足想吃辣的成员。`);
    }

    if (item.sharedBy && item.sharedBy.length > 0) {
      reasons.push(`分配给 ${item.sharedBy.join("、")}。`);
    }

    selectedReasons.push({
      dishId: dish.id,
      dishName: dish.name,
      reasons,
    });
  }

  for (const member of members) {
    const memberDishes = planItems.filter((item) => item.sharedBy?.includes(member.id) ?? false);
    const eligibleDishes = getEligibleDishMap(context).get(member.id) ?? [];

    if (memberDishes.length > 0) {
      memberRequirementStatus.push({
        memberId: member.id,
        memberName: member.name,
        status: "satisfied",
        details: [`已分配 ${memberDishes.map((item) => item.dishName).join("、")}。`, `当前可选菜品 ${eligibleDishes.length} 道。`],
      });
      continue;
    }

    if (eligibleDishes.length > 0) {
      memberRequirementStatus.push({
        memberId: member.id,
        memberName: member.name,
        status: "partially_satisfied",
        details: [`未单独分配菜品，但存在 ${eligibleDishes.length} 道可点菜品。`],
      });
      continue;
    }

    memberRequirementStatus.push({
      memberId: member.id,
      memberName: member.name,
      status: "conflict",
      details: [`没有满足硬需求的可点菜品。`],
    });
  }

  for (const eligibility of getDishMemberEligibility(context)) {
    const selectedDishIds = planItems.map((item) => item.dishId);
    if (selectedDishIds.includes(eligibility.dish.id)) {
      continue;
    }

    const reasons = eligibility.ineligibleMembers.flatMap((ineligible) => ineligible.reasons);
    excludedItems.push({
      dishId: eligibility.dish.id,
      dishName: eligibility.dish.name,
      reasons: reasons.length > 0 ? reasons : [`未选择：${eligibility.eligibleMembers.length > 0 ? "可由 " + eligibility.eligibleMembers.map((member) => member.name).join("、") + " 食用，但当前策略未选中。" : "未命中当前方案策略。"}`],
    });
  }

  const budget: BudgetExplanation = {
    used: plan.totalPrice,
    budget: plan.budget,
    percent: plan.budget === 0 ? 0 : Number(((plan.totalPrice / plan.budget) * 100).toFixed(1)),
  };

  return {
    selectedReasons,
    memberRequirementStatus,
    excludedItems,
    budget,
    conflicts,
  };
}
