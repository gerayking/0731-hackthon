import { describe, expect, it } from "vitest";
import { planningSeed } from "../fixtures/planning-seed";
import { explainPlan } from "../service/explain-plan";
import { generatePlanResult } from "../service/generate-plan";

describe("explainPlan", () => {
  it("生成选择理由、成员覆盖和预算说明", () => {
    const result = generatePlanResult(planningSeed);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("fixture should generate a valid plan");
    }

    const explanation = explainPlan(planningSeed, result.plan);

    expect(explanation.selectedReasons.length).toBe(result.plan.items.length);
    expect(explanation.memberRequirementStatus).toHaveLength(planningSeed.session.members?.length ?? planningSeed.session.memberCount);
    expect(explanation.budget.used).toBe(result.plan.totalPrice);
    expect(explanation.budget.budget).toBe(planningSeed.session.budget);
    expect(explanation.budget.percent).toBe(Number(((result.plan.totalPrice / planningSeed.session.budget) * 100).toFixed(1)));
  });

  it("能解释不在菜单中的方案冲突", () => {
    const explanation = explainPlan(planningSeed, {
      ...planningSeed,
      id: "invalid_plan",
      items: [
        {
          dishId: "missing_dish",
          dishName: "不存在的菜",
          quantity: 1,
          unitPrice: 10,
          subtotal: 10,
        },
      ],
      totalPrice: 10,
      budget: planningSeed.session.budget,
      status: "needs_clarification",
    });

    expect(explanation.conflicts).toEqual([
      {
        code: "plan_item_not_in_menu",
        message: "方案中的菜品 不存在的菜 不在当前菜单中。",
        dishId: "missing_dish",
      },
    ]);
  });
});
