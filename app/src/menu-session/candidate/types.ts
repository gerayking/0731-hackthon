/**
 * 本地 mock M2/M3 候选菜单模型。
 *
 * T5 只负责前端/客户端路径：mock M2 输出结构化候选，用户逐项确认后由
 * mock client 调用 M1 mock client 写入菜单状态，并保留候选快照供 M3 预览。
 */
import type {
  MenuItem,
  MenuItemInput,
  MenuSessionSnapshot,
} from "../domain"

export type MenuCandidateSource = "ocr" | "text" | "mock"
export type CandidateStatus = "pending" | "confirmed"

export type CandidateFieldKey =
  | "name"
  | "price"
  | "category"
  | "spiciness"
  | "ingredients"
  | "containsPork"
  | "containsBeef"
  | "containsChicken"
  | "containsSeafood"
  | "containsPeanut"
  | "containsEgg"
  | "containsDairy"
  | "isVegetarian"
  | "suggestedServings"
  | "confidence"

export type MenuCandidateRecord = MenuItemInput & {
  candidateId: string
  status: CandidateStatus
  confirmedFields: CandidateFieldKey[]
  createdAt: string
  updatedAt: string
  confirmedAt?: string | undefined
  createdItemId?: string | undefined
}

export type MockMenuCandidateSnapshot = {
  source: MenuCandidateSource
  candidates: MenuCandidateRecord[]
  updatedAt: string
}

export type PlanningConstraintSnapshot = {
  budget: number
  memberCount: number
  members: Array<{
    id: string
    name: string
    needsTakeout: boolean
  }>
  promotions: string[]
}

export type PlanningInputSnapshot = {
  source: "mock-m2-m3-local"
  generatedAt: string
  menuSessionSnapshot: MenuSessionSnapshot
  candidateSnapshot: MockMenuCandidateSnapshot
  confirmedCandidateIds: string[]
  pendingCandidateIds: string[]
  constraints: PlanningConstraintSnapshot
  planRequest: {
    mode: "mock-preview"
    goal: string
    includeUnconfirmedCandidates: boolean
  }
}

export type PlanResultPreview = {
  status: "mock-preview"
  summary: string
  selectedCandidateIds: string[]
  selectedItems: Array<{
    candidateId: string
    name: string
    price: number
  }>
  warnings: string[]
}

export type ConfirmCandidateResult = {
  candidateId: string
  createdItem: MenuItem
}

export const candidateFieldKeys: CandidateFieldKey[] = [
  "name",
  "price",
  "category",
  "spiciness",
  "ingredients",
  "containsPork",
  "containsBeef",
  "containsChicken",
  "containsSeafood",
  "containsPeanut",
  "containsEgg",
  "containsDairy",
  "isVegetarian",
  "suggestedServings",
  "confidence",
]

export const booleanCandidateFieldLabels: Array<{
  key: Exclude<CandidateFieldKey, "name" | "price" | "category" | "spiciness" | "ingredients" | "suggestedServings" | "confidence">
  label: string
}> = [
  { key: "containsPork", label: "猪肉" },
  { key: "containsBeef", label: "牛肉" },
  { key: "containsChicken", label: "鸡肉" },
  { key: "containsSeafood", label: "海鲜" },
  { key: "containsPeanut", label: "花生" },
  { key: "containsEgg", label: "鸡蛋" },
  { key: "containsDairy", label: "乳制品" },
  { key: "isVegetarian", label: "素食" },
]

export const editableCandidateFieldLabels: Array<{
  key: CandidateFieldKey
  label: string
  type: "text" | "number"
}> = [
  { key: "name", label: "菜品名称", type: "text" },
  { key: "price", label: "价格", type: "number" },
  { key: "category", label: "分类", type: "text" },
  { key: "spiciness", label: "辣度", type: "text" },
  { key: "ingredients", label: "食材，逗号分隔", type: "text" },
  { key: "suggestedServings", label: "建议份数", type: "number" },
  { key: "confidence", label: "置信度，0-1", type: "number" },
]

export const defaultMockText = [
  "番茄牛腩饭, 42, 主食, 微辣, 番茄,牛腩,米饭, 牛肉",
  "宫保鸡丁, 36, 热菜, 中辣, 鸡丁,花生,辣椒, 花生,鸡肉",
  "蒜蓉西兰花, 24, 素菜, 不辣, 西兰花,蒜, 素食",
  "虾仁炒饭, 38, 主食, 不辣, 虾仁,鸡蛋,米饭, 海鲜,鸡蛋",
].join("\n")

const STORAGE_KEY = "rfc0006.t5.menu-candidate-snapshot"

export function createMockMenuCandidateSnapshot(
  source: MenuCandidateSource,
  candidates: MenuCandidateRecord[],
): MockMenuCandidateSnapshot {
  return {
    source,
    candidates,
    updatedAt: new Date().toISOString(),
  }
}

export function createEmptyCandidateSnapshot(): MockMenuCandidateSnapshot {
  return createMockMenuCandidateSnapshot("mock", [])
}

export function readCandidateSnapshot(): MockMenuCandidateSnapshot {
  if (typeof window === "undefined") {
    return createEmptyCandidateSnapshot()
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)
    if (rawValue === null) {
      return createEmptyCandidateSnapshot()
    }

    return normalizeCandidateSnapshot(JSON.parse(rawValue) as unknown)
  } catch {
    return createEmptyCandidateSnapshot()
  }
}

export function writeCandidateSnapshot(snapshot: MockMenuCandidateSnapshot) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

export function removeCandidateSnapshot() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
}

export function parseCandidateText(
  rawText: string,
  source: MenuCandidateSource,
): MockMenuCandidateSnapshot {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))

  const candidates = lines.map((line) => parseCandidateLine(line, source))

  return createMockMenuCandidateSnapshot(source, candidates)
}

export function normalizeCandidateSnapshot(
  value: unknown,
): MockMenuCandidateSnapshot {
  if (typeof value !== "object" || value === null) {
    return createEmptyCandidateSnapshot()
  }

  const snapshot = value as Record<string, unknown>
  const source = isMenuCandidateSource(snapshot.source) ? snapshot.source : "mock"
  const rawCandidates = Array.isArray(snapshot.candidates)
    ? snapshot.candidates
    : []
  const candidates = rawCandidates
    .map((candidate) => normalizeCandidateRecord(candidate))
    .filter((candidate): candidate is MenuCandidateRecord => candidate !== null)
  const updatedAt =
    typeof snapshot.updatedAt === "string" ? snapshot.updatedAt : new Date().toISOString()

  return {
    source,
    candidates,
    updatedAt,
  }
}

function parseCandidateLine(
  line: string,
  source: MenuCandidateSource,
): MenuCandidateRecord {
  const parts = parseLineParts(line)
  const name = parts[0]?.trim() ?? `候选菜品 ${Math.floor(Math.random() * 1000)}`
  const price = parseNumber(parts[1], 0)
  const category = parts[2]?.trim()
  const spiciness = parts[3]?.trim()
  const ingredients = parseCsv(parts[4] ?? "")
  const allergyText = parts.slice(5).join(",")
  const now = new Date().toISOString()

  return {
    candidateId: `candidate-${crypto.randomUUID()}`,
    name: name.trim(),
    price,
    category: category?.trim() || undefined,
    spiciness: spiciness?.trim() || undefined,
    ingredients,
    containsPork: allergyText.includes("猪") || allergyText.includes("培根"),
    containsBeef: allergyText.includes("牛") || allergyText.includes("牛腩"),
    containsChicken: allergyText.includes("鸡"),
    containsSeafood:
      allergyText.includes("虾") ||
      allergyText.includes("鱼") ||
      allergyText.includes("蟹") ||
      allergyText.includes("贝") ||
      allergyText.includes("海鲜"),
    containsPeanut: allergyText.includes("花生"),
    containsEgg: allergyText.includes("蛋"),
    containsDairy: allergyText.includes("奶") || allergyText.includes("芝士"),
    isVegetarian: allergyText.includes("素") || allergyText.includes("vegan"),
    suggestedServings: 1,
    confidence: confidenceForSource(source),
    confirmedFields: [],
    status: "pending",
    createdAt: now,
    updatedAt: now,
  }
}

function parseLineParts(line: string): string[] {
  const delimiter = ["|", "；", ";", "/"].find((candidate) =>
    line.includes(candidate),
  )
  if (delimiter) {
    return line
      .split(delimiter)
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
  }

  return line.split(",")
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback
  }

  const parsed = Number(value.replace(/[^\d.]/g, ""))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function confidenceForSource(source: MenuCandidateSource): number {
  switch (source) {
    case "ocr":
      return 0.62
    case "text":
      return 0.78
    case "mock":
      return 0.85
  }
}

function normalizeCandidateRecord(value: unknown): MenuCandidateRecord | null {
  if (typeof value !== "object" || value === null) {
    return null
  }

  const candidate = value as Record<string, unknown>
  const name = typeof candidate.name === "string" ? candidate.name : ""
  const price =
    typeof candidate.price === "number" && Number.isFinite(candidate.price)
      ? candidate.price
      : 0
  const category =
    typeof candidate.category === "string" ? candidate.category : undefined
  const spiciness =
    typeof candidate.spiciness === "string" ? candidate.spiciness : undefined
  const ingredients = isStringArray(candidate.ingredients)
    ? candidate.ingredients
    : []
  const suggestedServings =
    typeof candidate.suggestedServings === "number" &&
    candidate.suggestedServings > 0
      ? candidate.suggestedServings
      : 1
  const confidence =
    typeof candidate.confidence === "number" &&
    candidate.confidence >= 0 &&
    candidate.confidence <= 1
      ? candidate.confidence
      : 0.5
  const confirmedFields = isStringArray(candidate.confirmedFields)
    ? candidate.confirmedFields.filter(isCandidateFieldKey)
    : []
  const status = isCandidateStatus(candidate.status) ? candidate.status : "pending"
  const now = new Date().toISOString()

  return {
    candidateId:
      typeof candidate.candidateId === "string"
        ? candidate.candidateId
        : `candidate-${crypto.randomUUID()}`,
    name,
    price,
    category,
    spiciness,
    ingredients,
    containsPork: typeof candidate.containsPork === "boolean" ? candidate.containsPork : false,
    containsBeef: typeof candidate.containsBeef === "boolean" ? candidate.containsBeef : false,
    containsChicken:
      typeof candidate.containsChicken === "boolean" ? candidate.containsChicken : false,
    containsSeafood:
      typeof candidate.containsSeafood === "boolean" ? candidate.containsSeafood : false,
    containsPeanut:
      typeof candidate.containsPeanut === "boolean" ? candidate.containsPeanut : false,
    containsEgg: typeof candidate.containsEgg === "boolean" ? candidate.containsEgg : false,
    containsDairy:
      typeof candidate.containsDairy === "boolean" ? candidate.containsDairy : false,
    isVegetarian:
      typeof candidate.isVegetarian === "boolean" ? candidate.isVegetarian : false,
    suggestedServings,
    confidence,
    confirmedFields,
    status,
    createdAt:
      typeof candidate.createdAt === "string" ? candidate.createdAt : now,
    updatedAt:
      typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    confirmedAt:
      typeof candidate.confirmedAt === "string" ? candidate.confirmedAt : undefined,
    createdItemId:
      typeof candidate.createdItemId === "string" ? candidate.createdItemId : undefined,
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isMenuCandidateSource(value: unknown): value is MenuCandidateSource {
  return value === "ocr" || value === "text" || value === "mock"
}

function isCandidateStatus(value: unknown): value is CandidateStatus {
  return value === "pending" || value === "confirmed"
}

function isCandidateFieldKey(value: string): value is CandidateFieldKey {
  return (candidateFieldKeys as readonly string[]).includes(value)
}
