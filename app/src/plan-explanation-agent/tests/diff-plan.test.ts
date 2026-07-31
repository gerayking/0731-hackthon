import { describe, expect, it } from "vitest";
import { planningSeed } from "../fixtures/planning-seed";
import { diffPlans } from "../service/diff-plan";
import { generatePlanResult } from "../service/generate-plan";
import { revisePlan } from "../service/revise-plan";

describe("diffPlans", () => {
  it("输出新增、移除和调整差异", () => {
    const before = {
      id: "before",
      items: [
        {
          dishId: "dish_001",
          dishName: "宫保鸡丁饭",
          quantity: 1,
          unitPrice: 48,
          subtotal: 48,
          sharedBy: ["member_a"],
        },
        {
          dishId: "dish_003",
          dishName: "番茄炒蛋饭",
          quantity: 1,
          unitPrice: 36,
          subtotal: 36,
          sharedBy: ["member_b"],
        },
      ],
      totalPrice: 84,
      budget: planningSeed.session.budget,
      status: "valid" as const,
    };
    const after = {
      ...before,
      id: "after",
      items: [
        before.items[0]!,
        {
          dishId: "dish_003",
          dishName: "番茄炒蛋饭",
          quantity: 2,
          unitPrice: 36,
          subtotal: 72,
          sharedBy: ["member_b", "member_c"],
        },
        {
          dishId: "dish_005",
          dishName: "清炒时蔬饭",
          quantity: 1,
          unitPrice: 32,
          subtotal: 32,
          sharedBy: ["member_d"],
        },
      ],
      totalPrice: 152,
    };

    const diff = diffPlans(before, after);

    expect(diff.addedItems.map((item) => item.dishId)).toEqual(["dish_005"]);
    expect(diff.removedItems.map((item) => item.dishId)).toEqual([]);
    expect(diff.changedItems).toEqual([
      {
        dishId: "dish_003",
        before: before.items[1],
        after: after.items[1],
      },
    ]);
    expect(diff.summary).toBe("新增 1 道菜，调整 1 道菜。");
  });
});

describe("revisePlan", () => {
  it("移除菜品后重算并返回差异", () => {
    const generated = generatePlanResult(planningSeed);

    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      throw new Error("fixture should generate a valid plan");
    }

    const revised = revisePlan({
      previousPlan: generated.plan,
      currentContext: planningSeed,
      requestedChanges: [
        {
          type: "remove_item",
          dishId: generated.plan.items[0]?.dishId ?? "dish_001",
        },
        {
          type: "change_strategy",
          strategy: "cheap",
        },
      ],
    });

    expect(revised.result.ok).toBe(true);
    expect(revised.diff.summary.length).toBeGreaterThan(0);
  });
});
