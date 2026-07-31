import { describe, expect, it } from "vitest"
import {
  AddRequirementIntentSchema,
  AgentIntentSchema,
  ExtractMenuOutputSchema,
  MenuCandidateSnapshotSchema,
  OcrInputSchema,
  ParseRequirementsOutputSchema,
  ParseRequirementsInputSchema,
  RevokeRequirementIntentSchema,
  RequirementInputSchema,
  RequirementSchema,
  RequirementsSnapshotSchema,
} from "./index"

const validMenuItem = {
  id: "dish-001",
  name: "番茄牛腩",
  price: 48,
  category: "热菜",
  spiciness: "微辣",
  ingredients: ["番茄", "牛腩"],
  containsBeef: true,
  isVegetarian: false,
  suggestedServings: 2,
  confidence: 0.92,
  confirmedFields: ["name", "price"],
  lowConfidenceFields: ["ingredients"],
}

describe("M2 domain zod schemas", () => {
  it("accepts valid OcrInput for text and image modes", () => {
    expect(OcrInputSchema.parse({ mode: "text", content: "宫保鸡丁 38 元" })).toEqual({
      mode: "text",
      content: "宫保鸡丁 38 元",
    })

    expect(OcrInputSchema.parse({ mode: "image", content: "fixture:image-menu-001" })).toEqual({
      mode: "image",
      content: "fixture:image-menu-001",
    })
  })

  it("rejects invalid OcrInput", () => {
    expect(() => OcrInputSchema.parse({ mode: "pdf", content: "菜单" })).toThrow()
    expect(() => OcrInputSchema.parse({ mode: "text", content: "" })).toThrow()
  })

  it("accepts valid MenuCandidateSnapshot", () => {
    expect(MenuCandidateSnapshotSchema.parse({ source: "text", candidates: [validMenuItem] })).toEqual({
      source: "text",
      candidates: [validMenuItem],
    })
  })

  it("rejects invalid menu candidate fields", () => {
    expect(() =>
      MenuCandidateSnapshotSchema.parse({
        source: "text",
        candidates: [{ ...validMenuItem, price: -1 }],
      }),
    ).toThrow()

    expect(() =>
      MenuCandidateSnapshotSchema.parse({
        source: "text",
        candidates: [{ ...validMenuItem, confidence: 1.5 }],
      }),
    ).toThrow()
  })

  it("accepts valid RequirementInput and Requirement", () => {
    const requirementInput = {
      memberId: "member-001",
      text: "不吃猪肉",
    }
    const requirement = {
      id: "req-001",
      memberId: "member-001",
      type: "exclude_ingredient" as const,
      value: "猪肉",
      hardness: "hard" as const,
      sourceText: "不吃猪肉",
      status: "active" as const,
    }

    expect(RequirementInputSchema.parse(requirementInput)).toEqual(requirementInput)
    expect(RequirementSchema.parse(requirement)).toEqual(requirement)
  })

  it("rejects invalid requirement values", () => {
    expect(() =>
      RequirementSchema.parse({
        id: "req-001",
        memberId: "member-001",
        type: "exclude_ingredient",
        value: "",
        hardness: "hard",
        sourceText: "不吃猪肉",
        status: "active",
      }),
    ).toThrow()

    expect(() =>
      RequirementSchema.parse({
        id: "req-001",
        memberId: "member-001",
        type: "spiciness_upper_bound",
        value: "微辣",
        hardness: "firm",
        sourceText: "我可以吃微辣",
        status: "active",
      }),
    ).toThrow()
  })

  it("accepts valid RequirementsSnapshot", () => {
    const snapshot = {
      requirementsByMember: {
        "member-001": [
          {
            id: "req-001",
            memberId: "member-001",
            type: "exclude_ingredient" as const,
            value: "猪肉",
            hardness: "hard" as const,
            sourceText: "不吃猪肉",
            status: "active" as const,
          },
        ],
      },
    }

    expect(RequirementsSnapshotSchema.parse(snapshot)).toEqual(snapshot)
  })

  it("accepts the three AgentIntent action variants", () => {
    const addIntent = {
      action: "add_requirement" as const,
      memberId: "member-001",
      text: "不吃猪肉，花生过敏",
      requirements: [
        { memberId: "member-001", text: "不吃猪肉" },
        { memberId: "member-001", text: "花生过敏" },
      ],
      unresolvedTexts: [],
    }
    const revokeIntent = {
      action: "revoke_requirement" as const,
      requirementId: "req-001",
    }
    const overrideIntent = {
      action: "override_requirement" as const,
      memberId: "member-001",
      text: "我也可以吃微辣",
      previousRequirementId: "req-001",
      requirements: [{ memberId: "member-001", text: "我可以吃微辣" }],
    }

    expect(AddRequirementIntentSchema.parse(addIntent)).toEqual(addIntent)
    expect(RevokeRequirementIntentSchema.parse(revokeIntent)).toEqual(revokeIntent)
    expect(AgentIntentSchema.parse(addIntent).action).toBe("add_requirement")
    expect(AgentIntentSchema.parse(revokeIntent).action).toBe("revoke_requirement")
    expect(AgentIntentSchema.parse(overrideIntent).action).toBe("override_requirement")
  })

  it("rejects invalid AgentIntent variants", () => {
    expect(() =>
      AgentIntentSchema.parse({
        action: "add_requirement",
        memberId: "member-001",
        text: "不吃猪肉",
        requirements: [],
        unresolvedTexts: [],
      }),
    ).toThrow()

    expect(() =>
      AgentIntentSchema.parse({
        action: "revoke_requirement",
      }),
    ).toThrow()

    expect(() =>
      AgentIntentSchema.parse({
        action: "override_requirement",
        memberId: "member-001",
        text: "我可以吃微辣",
        previousRequirementId: "req-001",
        requirements: [],
      }),
    ).toThrow()
  })

  it("accepts M2 API parse and OCR output envelopes", () => {
    const parseInput = {
      memberId: "member-001",
      text: "不吃猪肉",
    }
    const parseOutput = {
      snapshot: {
        requirementsByMember: {
          "member-001": [
            {
              id: "req-001",
              memberId: "member-001",
              type: "exclude_ingredient" as const,
              value: "猪肉",
              hardness: "hard" as const,
              sourceText: "不吃猪肉",
              status: "active" as const,
            },
          ],
        },
      },
      intent: {
        action: "add_requirement" as const,
        memberId: "member-001",
        text: "不吃猪肉",
        requirements: [{ memberId: "member-001", text: "不吃猪肉" }],
        unresolvedTexts: [],
      },
    }
    const extractOutput = {
      snapshot: {
        source: "text" as const,
        candidates: [validMenuItem],
      },
    }

    expect(ParseRequirementsInputSchema.parse(parseInput)).toEqual(parseInput)
    expect(ParseRequirementsOutputSchema.parse(parseOutput)).toEqual(parseOutput)
    expect(ExtractMenuOutputSchema.parse(extractOutput)).toEqual(extractOutput)
  })
})
