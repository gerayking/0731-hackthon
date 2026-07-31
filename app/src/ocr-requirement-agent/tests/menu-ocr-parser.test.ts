import { describe, expect, it } from "vitest"
import { parseMenuOcr, parseMenuText } from "../parser/menu-ocr-parser"

describe("M2 menu OCR parser", () => {
  it("parses a fixed text menu into MenuCandidateSnapshot", () => {
    const snapshot = parseMenuText(`
      今日菜单
      宫保鸡丁饭 48 元 主食 微辣 鸡肉 花生 米饭
      番茄牛腩汤 ￥68 汤 不辣 番茄 牛腩 2人份
      青菜豆腐 28rmb 素菜 青菜 豆腐
    `)

    expect(snapshot.source).toBe("text")
    expect(snapshot.candidates).toHaveLength(3)
    expect(snapshot.candidates[0]).toEqual(
      expect.objectContaining({
        id: "ocr-candidate-001",
        name: "宫保鸡丁饭",
        price: 48,
        category: "主食",
        spiciness: "微辣",
        ingredients: ["鸡肉", "花生", "米饭"],
        containsChicken: true,
        containsPeanut: true,
        confidence: expect.any(Number),
        lowConfidenceFields: expect.not.arrayContaining(["price", "category", "spiciness", "ingredients"]),
      }),
    )
    expect(snapshot.candidates[1]).toEqual(
      expect.objectContaining({
        id: "ocr-candidate-002",
        name: "番茄牛腩汤",
        price: 68,
        category: "汤",
        spiciness: "不辣",
        ingredients: ["番茄", "牛腩"],
        containsBeef: true,
        suggestedServings: 2,
      }),
    )
    expect(snapshot.candidates[2]).toEqual(
      expect.objectContaining({
        id: "ocr-candidate-003",
        name: "青菜豆腐",
        price: 28,
        category: "素菜",
        ingredients: ["青菜", "豆腐"],
        isVegetarian: true,
      }),
    )
  })

  it("moves unrecognised fields into lowConfidenceFields", () => {
    const snapshot = parseMenuText("神秘菜 36 元")

    expect(snapshot.candidates[0]).toEqual(
      expect.objectContaining({
        name: "神秘菜",
        price: 36,
        lowConfidenceFields: ["category", "spiciness", "ingredients", "suggestedServings"],
      }),
    )
    expect(snapshot.candidates[0]?.confirmedFields).toEqual(expect.arrayContaining(["name", "price"]))
  })

  it("returns stable JSON for image OCR placeholder", () => {
    const snapshot = parseMenuOcr({ mode: "image", content: "fixture:image-menu-001" })

    expect(snapshot.source).toBe("ocr")
    expect(snapshot.candidates).toEqual([
      expect.objectContaining({
        id: "ocr-placeholder-001",
        name: "图片 OCR 占位菜品",
        price: 0,
        category: "待 OCR 识别",
        spiciness: "待 OCR 识别",
        ingredients: ["待 OCR 识别"],
        suggestedServings: 1,
        confidence: 0.2,
        confirmedFields: ["name", "category", "spiciness", "ingredients"],
        lowConfidenceFields: ["price", "suggestedServings"],
      }),
    ])
  })

  it("handles text mode through the shared parser", () => {
    const snapshot = parseMenuOcr({ mode: "text", content: "鱼香肉丝 32 元 热菜 中辣 猪肉" })

    expect(snapshot.source).toBe("text")
    expect(snapshot.candidates[0]).toEqual(
      expect.objectContaining({
        name: "鱼香肉丝",
        price: 32,
        category: "热菜",
        spiciness: "中辣",
        ingredients: ["猪肉"],
        containsPork: true,
      }),
    )
  })
})
