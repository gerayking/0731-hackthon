import { describe, expect, it } from "vitest";
import { buildPlanningInputSnapshotFromM2Outputs } from "../adapters/m2-planning-input-adapter";
import { generatePlanResult } from "../service/generate-plan";
import { explainPlan } from "../service/explain-plan";

describe("M2 planning snapshot adapter", () => {
  it("builds a PlanningInputSnapshot from M2 menu and requirement outputs", () => {
    const snapshot = buildPlanningInputSnapshotFromM2Outputs({
      menuSnapshot: {
        source: "text",
        candidates: [
          {
            name: "清炒时蔬饭",
            price: 32,
            category: "主食",
            spiciness: "不辣",
            ingredients: ["青菜", "米饭"],
            isVegetarian: true,
            confidence: 0.9,
            confirmedFields: ["name", "price"],
            lowConfidenceFields: ["category", "spiciness", "ingredients"],
          },
          {
            name: "鱼香肉丝饭",
            price: 42,
            category: "主食",
            spiciness: "微辣",
            ingredients: ["猪肉", "米饭"],
            containsPork: true,
            confidence: 0.88,
          },
        ],
      },
      requirementsSnapshot: {
        requirementsByMember: {
          "member-a": [
            {
              id: "req-member-a-0-exclude_ingredient-猪肉",
              memberId: "member-a",
              type: "exclude_ingredient",
              value: "猪肉",
              hardness: "hard",
              sourceText: "A 不吃猪肉",
              status: "active",
            },
            {
              id: "req-member-a-1-prefer_category-热菜",
              memberId: "member-a",
              type: "prefer_category",
              value: "热菜",
              hardness: "soft",
              sourceText: "A 想吃热菜",
              status: "active",
            },
          ],
        },
      },
      session: {
        id: "session_m2_m3",
        budget: 100,
        memberCount: 1,
        members: [{ id: "member-a", name: "A" }],
        promotions: [],
      },
      strategy: "cheap",
    });

    expect(snapshot.menu).toHaveLength(2);
    expect(snapshot.menu[0]?.id).toMatch(/^m2-/);
    expect(snapshot.requirementsByMember["member-a"]).toHaveLength(2);
  });

  it("accepts M2 overridden and unknown requirement variants without breaking M3 planning", () => {
    const snapshot = buildPlanningInputSnapshotFromM2Outputs({
      menuSnapshot: {
        source: "text",
        candidates: [
          {
            id: "dish-unknown",
            name: "未知菜",
            price: 20,
            category: "其他",
            confidence: 0.4,
          },
        ],
      },
      requirementsSnapshot: {
        requirementsByMember: {
          "member-b": [
            {
              id: "req-overridden",
              memberId: "member-b",
              type: "unknown",
              value: "今天天气不错",
              hardness: "soft",
              sourceText: "今天天气不错",
              status: "overridden",
            },
          ],
        },
      },
      session: {
        id: "session_m2_m3_overridden",
        budget: 100,
        memberCount: 1,
        members: [{ id: "member-b", name: "B" }],
        promotions: [],
      },
    });

    const planResult = generatePlanResult(snapshot);
    expect(planResult.ok).toBe(true);

    if (planResult.ok) {
      const explanation = explainPlan(snapshot, planResult.plan);
      expect(explanation.conflicts).toEqual([]);
      expect(explanation.memberRequirementStatus[0]?.status).toBe("satisfied");
    }
  });
});
