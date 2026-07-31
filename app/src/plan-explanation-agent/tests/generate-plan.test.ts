import { describe, expect, it } from "vitest";
import { createPlanningSeed, planningSeed } from "../fixtures/planning-seed";
import { generatePlanResult } from "../service/generate-plan";

describe("generatePlanResult", () => {
  it("生成预算内且不违反硬需求的方案", () => {
    const result = generatePlanResult(planningSeed);

    expect(result.ok).toBe(true);
    expect(result.ok).toBeTruthy();

    if (result.ok) {
      expect(result.plan.totalPrice).toBeLessThanOrEqual(planningSeed.session.budget);
      expect(result.plan.items.every((item) => item.dishId !== "dish_002")).toBe(true);
      expect(result.plan.items.some((item) => item.sharedBy?.includes("member_a"))).toBe(true);
      expect(result.plan.items.some((item) => item.sharedBy?.includes("member_b"))).toBe(true);
      expect(result.plan.items.some((item) => item.sharedBy?.includes("member_c"))).toBe(true);
      expect(result.plan.items.some((item) => item.sharedBy?.includes("member_d"))).toBe(true);
    }
  });

  it("预算不足时返回冲突", () => {
    const result = generatePlanResult(createPlanningSeed({ budget: 1 }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.conflicts.some((conflict) => conflict.code === "budget_exceeded")).toBe(true);
    }
  });
});
