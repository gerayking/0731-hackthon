import {
  ParseRequirementsInputSchema,
  ParseRequirementsOutputSchema,
  RequirementSchema,
  RequirementsSnapshotSchema,
  type ParseRequirementsInput,
  type ParseRequirementsOutput,
  type Requirement,
  type RequirementType,
  type RequirementsSnapshot,
} from "../domain"
import { buildParseRequirementsOutput } from "./agent-intent-builder"

/**
 * Rule-based requirement parser for M2 demo requirements.
 * RFC-0003: Parses natural-language member requirements into candidate
 * Requirement records without writing persistent requirement state.
 */

type RequirementMatch = {
  type: RequirementType
  value: string
  hardness: "hard" | "soft"
  sourceText: string
}

type RequirementMatchResult = {
  match: RequirementMatch
  remainder: string
}

const INGREDIENT_KEYWORDS = [
  "猪肉",
  "牛肉",
  "鸡肉",
  "羊肉",
  "鱼",
  "虾",
  "蟹",
  "海鲜",
  "花生",
  "坚果",
  "鸡蛋",
  "牛奶",
  "奶酪",
  "乳制品",
  "香菜",
  "葱",
  "蒜",
  "洋葱",
  "辣椒",
  "花椒",
] as const

const CATEGORY_KEYWORDS = [
  "热菜",
  "凉菜",
  "主食",
  "汤",
  "甜品",
  "饮品",
  "素菜",
  "荤菜",
  "烧烤",
  "火锅",
] as const

const SPICINESS_KEYWORDS = [
  "不辣",
  "微辣",
  "中辣",
  "特辣",
  "麻辣",
  "辣一点",
  "辣一些",
  "重辣",
  "清汤",
] as const

const HARD_EXCLUDE_PREFIXES = ["不吃", "别放", "不要", "不要放", "忌口", "过敏", "不能"]

/**
 * Parse one member's natural-language requirement text.
 * RFC-0003: T3 supports fixed demo phrases such as “不吃猪肉”, “花生过敏”,
 * “我可以吃微辣”, and “想吃辣一点”.
 */
export function parseRequirements(input: ParseRequirementsInput): ParseRequirementsOutput {
  const parsedInput = ParseRequirementsInputSchema.parse(input)
  const requirements: Requirement[] = []

  for (const sentence of splitSentences(parsedInput.text)) {
    const trimmedSentence = sentence.trim()
    if (trimmedSentence.length === 0) {
      continue
    }

    const match = parseRequirementSentence(trimmedSentence)
    if (match) {
      const requirement = RequirementSchema.parse({
        id: createRequirementId(parsedInput.memberId, requirements.length, match.match.type, match.match.value),
        memberId: parsedInput.memberId,
        type: match.match.type,
        value: match.match.value,
        hardness: match.match.hardness,
        sourceText: match.match.sourceText,
        status: "active",
      })
      requirements.push(requirement)
      continue
    }
  }

  const snapshot: RequirementsSnapshot = RequirementsSnapshotSchema.parse({
    requirementsByMember: requirements.length > 0 ? { [parsedInput.memberId]: requirements } : {},
  })

  return ParseRequirementsOutputSchema.parse(buildParseRequirementsOutput(parsedInput, snapshot))
}

/**
 * Build an empty snapshot for a member.
 * RFC-0003: M2 can expose a stable RequirementsSnapshot even when no rule matches.
 */
export function emptyRequirementsSnapshot(memberId: string): RequirementsSnapshot {
  return RequirementsSnapshotSchema.parse({
    requirementsByMember: { [memberId]: [] },
  })
}

function parseRequirementSentence(sentence: string): RequirementMatchResult | null {
  const normalizedSentence = normalizeText(sentence)

  const allergenMatch = parseAllergenSentence(normalizedSentence, sentence)
  if (allergenMatch) {
    return allergenMatch
  }

  const ingredientExcludeMatch = parseIngredientExcludeSentence(normalizedSentence, sentence)
  if (ingredientExcludeMatch) {
    return ingredientExcludeMatch
  }

  const spicinessMatch = parseSpicinessSentence(normalizedSentence, sentence)
  if (spicinessMatch) {
    return spicinessMatch
  }

  const categoryPreferMatch = parseCategoryPreferSentence(normalizedSentence, sentence)
  if (categoryPreferMatch) {
    return categoryPreferMatch
  }

  const categoryExcludeMatch = parseCategoryExcludeSentence(normalizedSentence, sentence)
  if (categoryExcludeMatch) {
    return categoryExcludeMatch
  }

  return null
}

function parseAllergenSentence(normalizedSentence: string, sourceText: string): RequirementMatchResult | null {
  for (const keyword of INGREDIENT_KEYWORDS) {
    if (!normalizedSentence.includes(keyword)) {
      continue
    }

    const isAllergy = /(过敏|不耐受|忌口|不能(吃|喝)?)/.test(normalizedSentence)
    const isExclusion = new RegExp(`(?:不吃|不要|别放|不要放|忌|避免).*${escapeRegExp(keyword)}`).test(normalizedSentence)
    if (!isAllergy && !isExclusion) {
      continue
    }

    return {
      match: {
        type: "exclude_ingredient",
        value: keyword,
        hardness: "hard",
        sourceText,
      },
      remainder: "",
    }
  }

  return null
}

function parseIngredientExcludeSentence(normalizedSentence: string, sourceText: string): RequirementMatchResult | null {
  for (const prefix of HARD_EXCLUDE_PREFIXES) {
    if (!normalizedSentence.includes(prefix)) {
      continue
    }

    const keyword = findKeyword(normalizedSentence, INGREDIENT_KEYWORDS)
    if (!keyword) {
      continue
    }

    return {
      match: {
        type: "exclude_ingredient",
        value: keyword,
        hardness: "hard",
        sourceText,
      },
      remainder: "",
    }
  }

  return null
}

function parseSpicinessSentence(normalizedSentence: string, sourceText: string): RequirementMatchResult | null {
  const keyword = findKeyword(normalizedSentence, SPICINESS_KEYWORDS)
  if (!keyword) {
    return null
  }

  if (/(不吃辣|不要辣|别放辣|清汤|不辣)/.test(normalizedSentence)) {
    return {
      match: {
        type: "spiciness_upper_bound",
        value: "不辣",
        hardness: "soft",
        sourceText,
      },
      remainder: "",
    }
  }

  if (/(可以|能接受|接受)/.test(normalizedSentence)) {
    return {
      match: {
        type: "spiciness_upper_bound",
        value: normalizeSpicinessValue(keyword),
        hardness: "soft",
        sourceText,
      },
      remainder: "",
    }
  }

  if (/(想吃|偏好|倾向|更喜欢|希望|辣一点|辣一些|重辣|麻辣|特辣|中辣|微辣)/.test(normalizedSentence)) {
    return {
      match: {
        type: keyword === "不辣" || keyword === "清汤" ? "spiciness_upper_bound" : "prefer_spicy",
        value: normalizeSpicinessValue(keyword),
        hardness: "soft",
        sourceText,
      },
      remainder: "",
    }
  }

  return null
}

function parseCategoryPreferSentence(normalizedSentence: string, sourceText: string): RequirementMatchResult | null {
  const keyword = findKeyword(normalizedSentence, CATEGORY_KEYWORDS)
  if (!keyword) {
    return null
  }

  if (/(想吃|偏好|倾向|更喜欢|希望|来点|来一些)/.test(normalizedSentence)) {
    return {
      match: {
        type: "prefer_category",
        value: keyword,
        hardness: "soft",
        sourceText,
      },
      remainder: "",
    }
  }

  return null
}

function parseCategoryExcludeSentence(normalizedSentence: string, sourceText: string): RequirementMatchResult | null {
  for (const prefix of HARD_EXCLUDE_PREFIXES) {
    if (!normalizedSentence.includes(prefix)) {
      continue
    }

    const keyword = findKeyword(normalizedSentence, CATEGORY_KEYWORDS)
    if (!keyword) {
      continue
    }

    return {
      match: {
        type: "exclude_category",
        value: keyword,
        hardness: "hard",
        sourceText,
      },
      remainder: "",
    }
  }

  return null
}

function splitSentences(text: string): string[] {
  return text.split(/[,，;；。！!？?]/)
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, "")
}

function findKeyword<T extends readonly string[]>(text: string, keywords: T): T[number] | null {
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      return keyword
    }
  }

  return null
}

function normalizeSpicinessValue(keyword: string): string {
  if (keyword === "辣一点" || keyword === "辣一些") {
    return "辣一点"
  }

  return keyword
}

function createRequirementId(memberId: string, index: number, type: RequirementType, value: string): string {
  const slug = `${type}-${value}`
    .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
  const stableSuffix = slug.length > 0 ? slug : "requirement"
  return `req-${memberId}-${index}-${stableSuffix}`
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
