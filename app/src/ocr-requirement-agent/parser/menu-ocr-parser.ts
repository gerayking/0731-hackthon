import {
  type MenuCandidateSnapshot,
  type MenuItemInput,
  type OcrInput,
  MenuCandidateSnapshotSchema,
  MenuItemInputSchema,
  OcrInputSchema,
} from "../domain"

/**
 * Menu OCR / text parser for M2.
 * RFC-0003: Parses text menus into MenuCandidateSnapshot candidates and keeps
 * image OCR behind a stable placeholder so API contracts do not change later.
 */

type ParsedToken = {
  raw: string
  price?: number
  category?: string
  spiciness?: string
  ingredients: string[]
  flags: Partial<Record<keyof Pick<MenuItemInput, "containsPork" | "containsBeef" | "containsChicken" | "containsSeafood" | "containsPeanut" | "containsEgg" | "containsDairy" | "isVegetarian">, boolean>>
  suggestedServings?: number
}

const PRICE_PATTERN = /(?<![\d.])(?:￥|¥|RMB\s*)?\d+(?:\.\d{1,2})?\s*(?:元|￥|¥|rmb|RMB)|(?:￥|¥|RMB)\s*\d+(?:\.\d{1,2})?(?![\d.])/i
const MENU_HEADER_LINES = ["菜单", "今日菜单", "菜名", "名称", "menu", "today menu"]
const CATEGORY_HINTS = ["主食", "热菜", "凉菜", "汤", "饮品", "小吃", "甜品", "蔬菜", "荤菜", "素菜"]
const SPICINESS_HINTS = ["不辣", "微辣", "中辣", "特辣", "麻辣", "香辣", "变态辣"]
const INGREDIENT_HINTS = [
  "番茄",
  "西红柿",
  "土豆",
  "牛肉",
  "牛腩",
  "羊肉",
  "猪肉",
  "鸡肉",
  "虾仁",
  "虾",
  "蟹",
  "海鲜",
  "花生",
  "鸡蛋",
  "蛋",
  "牛奶",
  "芝士",
  "奶油",
  "米饭",
  "面",
  "青菜",
  "豆腐",
]
const SEAFOOD_WORDS = ["虾仁", "虾", "蟹", "海鲜"]
const BOOLEAN_INGREDIENT_FLAGS: Array<{ words: readonly string[]; flag: keyof ParsedToken["flags"]; value: boolean }> = [
  { words: ["猪肉"], flag: "containsPork", value: true },
  { words: ["牛肉", "牛腩"], flag: "containsBeef", value: true },
  { words: ["鸡肉", "鸡丁"], flag: "containsChicken", value: true },
  { words: SEAFOOD_WORDS, flag: "containsSeafood", value: true },
  { words: ["花生"], flag: "containsPeanut", value: true },
  { words: ["鸡蛋", "蛋"], flag: "containsEgg", value: true },
  { words: ["牛奶", "芝士", "奶油"], flag: "containsDairy", value: true },
]
const SERVING_PATTERNS = [
  /(\d+)\s*人份/i,
  /(\d+)\s*份/i,
  /(\d+)\s* servings?/i,
]

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim()

const roundConfidence = (value: number): number => Math.round(value * 100) / 100

const parsePrice = (text: string): number | undefined => {
  const match = PRICE_PATTERN.exec(text)
  if (!match) {
    return undefined
  }

  const priceText = match[0].replace(/[^\d.]/g, "")
  const price = Number(priceText)
  return Number.isFinite(price) ? price : undefined
}

const parseSuggestedServings = (text: string): number | undefined => {
  for (const pattern of SERVING_PATTERNS) {
    const match = pattern.exec(text)
    if (!match) {
      continue
    }

    const servings = Number(match[1])
    if (Number.isInteger(servings) && servings > 0) {
      return servings
    }
  }

  return undefined
}

const parseCategory = (text: string): string | undefined => {
  const normalizedText = text.replace(/\s+/g, "")
  return CATEGORY_HINTS.find((category) => normalizedText.includes(category))
}

const parseSpiciness = (text: string): string | undefined => {
  const normalizedText = text.replace(/\s+/g, "")
  return SPICINESS_HINTS.find((spiciness) => normalizedText.includes(spiciness))
}

const parseIngredients = (text: string): string[] => {
  const uniqueIngredients = new Set<string>()

  for (const ingredient of INGREDIENT_HINTS) {
    if (text.includes(ingredient)) {
      uniqueIngredients.add(ingredient)
    }
  }

  return Array.from(uniqueIngredients)
}

const parseBooleanFlags = (text: string): ParsedToken["flags"] => {
  const flags: ParsedToken["flags"] = {}

  for (const { words, flag, value } of BOOLEAN_INGREDIENT_FLAGS) {
    if (words.some((word) => text.includes(word))) {
      flags[flag] = value
    }
  }

  if (text.includes("素") || text.includes("蔬菜")) {
    flags.isVegetarian = true
  }

  return flags
}

const splitMenuLines = (content: string): string[] =>
  content
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length > 0)
    .filter((line) => !MENU_HEADER_LINES.includes(line.toLowerCase()))

const parseLine = (line: string): ParsedToken => {
  const price = parsePrice(line)
  const category = parseCategory(line)
  const spiciness = parseSpiciness(line)
  const ingredients = parseIngredients(line)
  const flags = parseBooleanFlags(line)
  const suggestedServings = parseSuggestedServings(line)

  return {
    raw: line,
    price,
    category,
    spiciness,
    ingredients,
    flags,
    suggestedServings,
  }
}

const inferName = (line: string, price: number | undefined): string => {
  const priceMatch = PRICE_PATTERN.exec(line)
  const nameSegment = priceMatch?.index === undefined ? line : line.slice(0, priceMatch.index)
  const withoutNumbers = nameSegment.replace(/\d+/g, "")
  const cleaned = normalizeWhitespace(withoutNumbers).replace(/^(菜单|今日菜单|菜名|名称)\s*[:：]?\s*/i, "")
  const trimmed = cleaned.replace(/\s*(元|￥|¥|rmb|RMB)\s*$/i, "").trim()

  if (trimmed.length > 0) {
    return trimmed
  }

  return price === undefined ? "未识别菜名" : `菜单项 ${price} 元`
}

const buildLowConfidenceFields = (token: ParsedToken): string[] => {
  const fields: string[] = []

  if (token.price === undefined) {
    fields.push("price")
  }

  if (token.category === undefined) {
    fields.push("category")
  }

  if (token.spiciness === undefined) {
    fields.push("spiciness")
  }

  if (token.ingredients.length === 0) {
    fields.push("ingredients")
  }

  if (token.suggestedServings === undefined) {
    fields.push("suggestedServings")
  }

  return fields
}

const buildConfirmedFields = (token: ParsedToken, lowConfidenceFields: readonly string[]): string[] => {
  const confirmedFields = new Set<string>()

  if (token.raw.length > 0) {
    confirmedFields.add("name")
  }

  if (token.price !== undefined) {
    confirmedFields.add("price")
  }

  if (token.category !== undefined) {
    confirmedFields.add("category")
  }

  if (token.spiciness !== undefined) {
    confirmedFields.add("spiciness")
  }

  if (token.ingredients.length > 0) {
    confirmedFields.add("ingredients")
  }

  if (token.suggestedServings !== undefined) {
    confirmedFields.add("suggestedServings")
  }

  for (const [flag, value] of Object.entries(token.flags)) {
    if (value === true) {
      confirmedFields.add(flag)
    }
  }

  return Array.from(confirmedFields).filter((field) => !lowConfidenceFields.includes(field))
}

const buildCandidateFromLine = (line: string, lineIndex: number): MenuItemInput => {
  const token = parseLine(line)
  const price = token.price ?? 0
  const name = inferName(line, token.price)
  const lowConfidenceFields = buildLowConfidenceFields(token)
  const confirmedFields = buildConfirmedFields(token, lowConfidenceFields)
  const confidence = roundConfidence(0.55 + confirmedFields.length * 0.045 + lowConfidenceFields.length * 0.01)

  return MenuItemInputSchema.parse({
    id: `ocr-candidate-${String(lineIndex + 1).padStart(3, "0")}`,
    name,
    price,
    category: token.category,
    spiciness: token.spiciness,
    ingredients: token.ingredients.length > 0 ? token.ingredients : undefined,
    ...token.flags,
    suggestedServings: token.suggestedServings,
    confidence: Math.min(confidence, 0.99),
    confirmedFields,
    lowConfidenceFields,
  })
}

const buildImagePlaceholderCandidate = (): MenuItemInput =>
  MenuItemInputSchema.parse({
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
  })

const parseTextMenu = (input: OcrInput): MenuCandidateSnapshot => {
  const parsedInput = OcrInputSchema.parse(input)
  const lines = splitMenuLines(parsedInput.content)

  if (lines.length === 0) {
    return MenuCandidateSnapshotSchema.parse({
      source: "text",
      candidates: [
        {
          name: "未识别菜单文本",
          price: 0,
          confidence: 0.3,
          confirmedFields: ["name"],
          lowConfidenceFields: ["price", "category", "spiciness", "ingredients", "suggestedServings"],
        },
      ],
    })
  }

  const candidates = lines.map(buildCandidateFromLine)

  return MenuCandidateSnapshotSchema.parse({
    source: "text",
    candidates,
  })
}

const parseImageMenuPlaceholder = (input: OcrInput): MenuCandidateSnapshot => {
  OcrInputSchema.parse(input)
  const candidate = buildImagePlaceholderCandidate()

  return MenuCandidateSnapshotSchema.parse({
    source: "ocr",
    candidates: [candidate],
  })
}

export const parseMenuOcr = (input: OcrInput): MenuCandidateSnapshot => {
  const parsedInput = OcrInputSchema.parse(input)

  if (parsedInput.mode === "text") {
    return parseTextMenu(parsedInput)
  }

  return parseImageMenuPlaceholder(parsedInput)
}

export const parseMenuText = (content: string): MenuCandidateSnapshot => parseTextMenu(OcrInputSchema.parse({ mode: "text", content }))
