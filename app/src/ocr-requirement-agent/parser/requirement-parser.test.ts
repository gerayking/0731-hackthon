import { describe, expect, it } from "vitest"
import { parseRequirements, emptyRequirementsSnapshot } from "./requirement-parser"

describe("M2 requirement parser", () => {
  it("parses hard ingredient exclusions and allergies", () => {
    const output = parseRequirements({ memberId: "member-001", text: "我不吃猪肉，花生过敏" })

    expect(output.snapshot).toEqual({
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
            id: "req-member-001-1-exclude_ingredient-花生",
            memberId: "member-001",
            type: "exclude_ingredient",
            value: "花生",
            hardness: "hard",
            sourceText: "花生过敏",
            status: "active",
          },
        ],
      },
    })
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
  })

  it("parses soft spiciness preferences", () => {
    const output = parseRequirements({ memberId: "member-002", text: "我可以吃微辣，想吃辣一点" })

    expect(output.snapshot.requirementsByMember["member-002"]).toEqual([
      {
        id: "req-member-002-0-spiciness_upper_bound-微辣",
        memberId: "member-002",
        type: "spiciness_upper_bound",
        value: "微辣",
        hardness: "soft",
        sourceText: "我可以吃微辣",
        status: "active",
      },
      {
        id: "req-member-002-1-prefer_spicy-辣一点",
        memberId: "member-002",
        type: "prefer_spicy",
        value: "辣一点",
        hardness: "soft",
        sourceText: "想吃辣一点",
        status: "active",
      },
    ])
  })

  it("parses category preferences and exclusions", () => {
    const output = parseRequirements({ memberId: "member-003", text: "想吃热菜，不吃凉菜" })

    expect(output.snapshot.requirementsByMember["member-003"]).toEqual([
      {
        id: "req-member-003-0-prefer_category-热菜",
        memberId: "member-003",
        type: "prefer_category",
        value: "热菜",
        hardness: "soft",
        sourceText: "想吃热菜",
        status: "active",
      },
      {
        id: "req-member-003-1-exclude_category-凉菜",
        memberId: "member-003",
        type: "exclude_category",
        value: "凉菜",
        hardness: "hard",
        sourceText: "不吃凉菜",
        status: "active",
      },
    ])
  })

  it("keeps unresolved texts when a sentence has no rule match", () => {
    const output = parseRequirements({ memberId: "member-004", text: "今天天气不错，花生过敏" })

    expect(output.snapshot.requirementsByMember["member-004"]).toEqual([
      {
        id: "req-member-004-0-exclude_ingredient-花生",
        memberId: "member-004",
        type: "exclude_ingredient",
        value: "花生",
        hardness: "hard",
        sourceText: "花生过敏",
        status: "active",
      },
    ])
    expect(output.intent.action).toBe("add_requirement")
    if (output.intent.action !== "add_requirement") {
      throw new Error("Expected add_requirement intent")
    }
    expect(output.intent.unresolvedTexts).toEqual(["今天天气不错"])
  })

  it("returns an empty snapshot for a member when nothing is understood", () => {
    const output = parseRequirements({ memberId: "member-005", text: "随便看看" })

    expect(output.snapshot).toEqual({ requirementsByMember: {} })
    expect(output.intent).toEqual({
      action: "add_requirement",
      memberId: "member-005",
      text: "随便看看",
      requirements: [],
      unresolvedTexts: ["随便看看"],
    })
  })

  it("builds an explicit empty RequirementsSnapshot", () => {
    expect(emptyRequirementsSnapshot("member-001")).toEqual({
      requirementsByMember: { "member-001": [] },
    })
  })

  it("normalizes whitespace and punctuation before parsing", () => {
    const output = parseRequirements({ memberId: "member-006", text: "我  不吃\n猪肉; 花生 过敏" })

    expect(output.snapshot.requirementsByMember["member-006"]).toHaveLength(2)
    expect(output.intent.action).toBe("add_requirement")
    if (output.intent.action !== "add_requirement") {
      throw new Error("Expected add_requirement intent")
    }
    expect(output.intent.unresolvedTexts).toEqual([])
  })
})
