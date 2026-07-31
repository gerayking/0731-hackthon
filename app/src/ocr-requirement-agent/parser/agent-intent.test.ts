import { describe, expect, it } from "vitest"
import {
  AgentIntentSchema,
  RequirementsSnapshotSchema,
  type AgentIntent,
  type RequirementsSnapshot,
} from "../domain"
import {
  buildAddRequirementIntent,
  buildAddRequirementIntentFromSnapshot,
  buildAgentIntent,
  buildOverrideRequirementIntent,
  buildParseRequirementsOutput,
  buildRevokeRequirementIntent,
} from "./agent-intent-builder"
import { parseRequirements } from "./requirement-parser"

describe("M2 AgentIntent builder", () => {
  it("builds and validates an add_requirement intent", () => {
    const intent = buildAddRequirementIntent({
      memberId: "member-001",
      text: "我不吃猪肉，花生过敏",
      requirements: [
        { memberId: "member-001", text: "我不吃猪肉" },
        { memberId: "member-001", text: "花生过敏" },
      ],
      unresolvedTexts: [],
    })

    expect(intent).toEqual({
      action: "add_requirement",
      memberId: "member-001",
      text: "我不吃猪肉，花生过敏",
      requirements: [
        { memberId: "member-001", text: "我不吃猪肉" },
        { memberId: "member-001", text: "花生过敏" },
      ],
      unresolvedTexts: [],
    })
    expect(AgentIntentSchema.parse(intent).action).toBe("add_requirement")
  })

  it("builds and validates a revoke_requirement intent", () => {
    const intent = buildRevokeRequirementIntent({ requirementId: "req-member-001-0-exclude_ingredient-猪肉" })

    expect(intent).toEqual({
      action: "revoke_requirement",
      requirementId: "req-member-001-0-exclude_ingredient-猪肉",
    })
    expect(AgentIntentSchema.parse(intent).action).toBe("revoke_requirement")
  })

  it("builds and validates an override_requirement intent", () => {
    const intent = buildOverrideRequirementIntent({
      memberId: "member-002",
      text: "我也可以吃微辣",
      previousRequirementId: "req-member-002-0-spiciness_upper_bound-微辣",
      requirements: [{ memberId: "member-002", text: "我可以吃微辣" }],
    })

    expect(intent).toEqual({
      action: "override_requirement",
      memberId: "member-002",
      text: "我也可以吃微辣",
      previousRequirementId: "req-member-002-0-spiciness_upper_bound-微辣",
      requirements: [{ memberId: "member-002", text: "我可以吃微辣" }],
    })
    expect(AgentIntentSchema.parse(intent).action).toBe("override_requirement")
  })

  it("builds intents from the add/revoke/override union", () => {
    const addIntent = buildAgentIntent({
      memberId: "member-001",
      text: "不吃猪肉",
      requirements: [{ memberId: "member-001", text: "不吃猪肉" }],
      unresolvedTexts: [],
    })
    const revokeIntent = buildAgentIntent({ action: "revoke_requirement", requirementId: "req-001" })
    const overrideIntent = buildAgentIntent({
      memberId: "member-001",
      text: "我也可以吃微辣",
      previousRequirementId: "req-001",
      requirements: [{ memberId: "member-001", text: "我可以吃微辣" }],
    })

    expect((addIntent as Extract<AgentIntent, { action: "add_requirement" }>).action).toBe("add_requirement")
    expect((revokeIntent as Extract<AgentIntent, { action: "revoke_requirement" }>).action).toBe("revoke_requirement")
    expect((overrideIntent as Extract<AgentIntent, { action: "override_requirement" }>).action).toBe("override_requirement")
  })

  it("builds add_requirement intent from a RequirementsSnapshot", () => {
    const snapshot: RequirementsSnapshot = RequirementsSnapshotSchema.parse({
      requirementsByMember: {
        "member-001": [
          {
            id: "req-member-001-0-exclude_ingredient-猪肉",
            memberId: "member-001",
            type: "exclude_ingredient",
            value: "猪肉",
            hardness: "hard",
            sourceText: "我不吃猪肉",
            status: "active",
          },
          {
            id: "req-member-001-1-spiciness_upper_bound-微辣",
            memberId: "member-001",
            type: "spiciness_upper_bound",
            value: "微辣",
            hardness: "soft",
            sourceText: "我可以吃微辣",
            status: "active",
          },
        ],
      },
    })

    const intent = buildAddRequirementIntentFromSnapshot(
      { memberId: "member-001", text: "我不吃猪肉，我可以吃微辣" },
      snapshot,
    )

    expect(intent).toEqual({
      action: "add_requirement",
      memberId: "member-001",
      text: "我不吃猪肉，我可以吃微辣",
      requirements: [
        { memberId: "member-001", text: "我不吃猪肉" },
        { memberId: "member-001", text: "我可以吃微辣" },
      ],
      unresolvedTexts: [],
    })
  })

  it("detects unresolved text from source sentences not represented by requirements", () => {
    const output = parseRequirements({ memberId: "member-004", text: "今天天气不错，花生过敏" })
    const intent = buildParseRequirementsOutput({ memberId: "member-004", text: "今天天气不错，花生过敏" }, output.snapshot)

    expect(intent.intent).toEqual({
      action: "add_requirement",
      memberId: "member-004",
      text: "今天天气不错，花生过敏",
      requirements: [{ memberId: "member-004", text: "花生过敏" }],
      unresolvedTexts: ["今天天气不错"],
    })
  })

  it("keeps parser output compatible with the AgentIntent schema", () => {
    const output = parseRequirements({ memberId: "member-001", text: "我不吃猪肉，花生过敏" })

    expect(output.intent).toEqual({
      action: "add_requirement",
      memberId: "member-001",
      text: "我不吃猪肉，花生过敏",
      requirements: [
        { memberId: "member-001", text: "我不吃猪肉" },
        { memberId: "member-001", text: "花生过敏" },
      ],
      unresolvedTexts: [],
    })
    expect(AgentIntentSchema.parse(output.intent).action).toBe("add_requirement")
  })

  it("rejects invalid AgentIntent payloads", () => {
    expect(() =>
      buildAgentIntent({
        memberId: "member-001",
        text: "随便看看",
        requirements: [],
        unresolvedTexts: [],
      }),
    ).toThrow()

    expect(() => buildAgentIntent({ action: "revoke_requirement", requirementId: "" })).toThrow()

    expect(() =>
      buildAgentIntent({
        memberId: "member-001",
        text: "我可以吃微辣",
        previousRequirementId: "req-001",
        requirements: [],
      }),
    ).toThrow()
  })
})
