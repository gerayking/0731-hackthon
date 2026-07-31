/**
 * M1 前端 API client。
 *
 * T4 阶段先提供稳定契约：
 * - 当前实现使用 localStorage-backed mock 状态，保证 UI 可独立开发和验收。
 * - T3 Route Handlers 完成后，只需要把 mock 函数替换为真实 fetch。
 */
import type {
  MealSession,
  MealSessionInput,
  MealSessionUpdateInput,
  Member,
  MenuItem,
  MenuItemInput,
  MenuItemUpdateInput,
  MenuSessionSnapshot,
} from "../domain"

const MENU_STORAGE_KEY = "rfc0006.m1.menu-items"
const SESSION_STORAGE_KEY = "rfc0006.m1.meal-session"

type ApiClient = {
  listMenuItems: () => Promise<MenuItem[]>
  listMenuItemsSync: () => MenuItem[]
  createMenuItem: (input: MenuItemInput) => Promise<MenuItem>
  updateMenuItem: (id: string, input: MenuItemUpdateInput) => Promise<MenuItem | null>
  deleteMenuItem: (id: string) => Promise<boolean>
  createMealSession: (input: MealSessionInput) => Promise<MealSession>
  getMealSession: (id?: string) => Promise<MealSession | null>
  getMealSessionSync: (id?: string) => MealSession | null
  updateMealSession: (
    id: string,
    input: MealSessionUpdateInput,
  ) => Promise<MealSession | null>
  deleteMealSession: (id: string) => Promise<boolean>
  getSnapshot: () => Promise<MenuSessionSnapshot>
  getSnapshotSync: () => MenuSessionSnapshot
}

const seedMenuItems: MenuItem[] = [
  {
    id: "menu-1",
    name: "番茄牛腩饭",
    price: 42,
    category: "主食",
    spiciness: "微辣",
    ingredients: ["番茄", "牛腩", "米饭"],
    containsPork: false,
    containsBeef: true,
    containsChicken: false,
    containsSeafood: false,
    containsPeanut: false,
    containsEgg: false,
    containsDairy: false,
    isVegetarian: false,
    suggestedServings: 1,
    confidence: 0.9,
    confirmedFields: ["name", "price", "ingredients"],
  },
  {
    id: "menu-2",
    name: "宫保鸡丁",
    price: 36,
    category: "热菜",
    spiciness: "中辣",
    ingredients: ["鸡丁", "花生", "辣椒"],
    containsPork: false,
    containsBeef: false,
    containsChicken: true,
    containsSeafood: false,
    containsPeanut: true,
    containsEgg: false,
    containsDairy: false,
    isVegetarian: false,
    suggestedServings: 1,
    confidence: 0.85,
    confirmedFields: ["name", "price", "ingredients", "containsPeanut"],
  },
  {
    id: "menu-3",
    name: "蒜蓉西兰花",
    price: 24,
    category: "素菜",
    spiciness: "不辣",
    ingredients: ["西兰花", "蒜"],
    containsPork: false,
    containsBeef: false,
    containsChicken: false,
    containsSeafood: false,
    containsPeanut: false,
    containsEgg: false,
    containsDairy: false,
    isVegetarian: true,
    suggestedServings: 1,
    confidence: 0.95,
    confirmedFields: ["name", "price", "isVegetarian"],
  },
]

const seedMembers: Member[] = [
  { id: "member-a", name: "A", needsTakeout: false },
  { id: "member-b", name: "B", needsTakeout: false },
  { id: "member-c", name: "C", needsTakeout: true },
  { id: "member-d", name: "D", needsTakeout: false },
]

const clone = <T>(value: T): T => structuredClone(value)

function defaultSession(): MealSession {
  return {
    id: "default",
    budget: 250,
    memberCount: 4,
    members: clone(seedMembers),
    promotions: ["满 200 减 20"],
  }
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return clone(fallback)
  }

  try {
    const rawValue = window.localStorage.getItem(key)
    if (rawValue === null) {
      return clone(fallback)
    }

    const parsedValue = JSON.parse(rawValue) as unknown
    if (parsedValue === null) {
      return clone(fallback)
    }
    return parsedValue as T
  } catch {
    return clone(fallback)
  }
}

function writeStorage<T>(key: string, value: T | null) {
  if (typeof window === "undefined") {
    return
  }

  if (value === null) {
    window.localStorage.removeItem(key)
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  )
}

function normalizeMenuItem(value: unknown): MenuItem | null {
  if (typeof value !== "object" || value === null) {
    return null
  }

  const item = value as Record<string, unknown>
  if (typeof item.id !== "string" || typeof item.name !== "string") {
    return null
  }
  if (typeof item.price !== "number" || !Number.isFinite(item.price)) {
    return null
  }
  if (!isStringArray(item.ingredients)) {
    return null
  }

  const category = typeof item.category === "string" ? item.category : undefined
  const spiciness =
    typeof item.spiciness === "string" ? item.spiciness : undefined
  const suggestedServings =
    typeof item.suggestedServings === "number" && item.suggestedServings > 0
      ? item.suggestedServings
      : 1
  const confidence =
    typeof item.confidence === "number" &&
    Number.isFinite(item.confidence) &&
    item.confidence >= 0 &&
    item.confidence <= 1
      ? item.confidence
      : 0.5

  return {
    id: item.id,
    name: item.name,
    price: item.price,
    category,
    spiciness,
    ingredients: item.ingredients,
    containsPork: typeof item.containsPork === "boolean" ? item.containsPork : false,
    containsBeef: typeof item.containsBeef === "boolean" ? item.containsBeef : false,
    containsChicken:
      typeof item.containsChicken === "boolean" ? item.containsChicken : false,
    containsSeafood:
      typeof item.containsSeafood === "boolean" ? item.containsSeafood : false,
    containsPeanut:
      typeof item.containsPeanut === "boolean" ? item.containsPeanut : false,
    containsEgg: typeof item.containsEgg === "boolean" ? item.containsEgg : false,
    containsDairy:
      typeof item.containsDairy === "boolean" ? item.containsDairy : false,
    isVegetarian:
      typeof item.isVegetarian === "boolean" ? item.isVegetarian : false,
    suggestedServings,
    confidence,
    confirmedFields: isStringArray(item.confirmedFields)
      ? item.confirmedFields
      : [],
  }
}

function normalizeMember(value: unknown): Member | null {
  if (typeof value !== "object" || value === null) {
    return null
  }

  const member = value as Record<string, unknown>
  if (typeof member.id !== "string" || typeof member.name !== "string") {
    return null
  }

  return {
    id: member.id,
    name: member.name,
    needsTakeout:
      typeof member.needsTakeout === "boolean" ? member.needsTakeout : false,
  }
}

function normalizeMealSession(value: unknown): MealSession | null {
  if (typeof value !== "object" || value === null) {
    return null
  }

  const session = value as Record<string, unknown>
  if (typeof session.id !== "string") {
    return null
  }
  if (typeof session.budget !== "number" || !Number.isFinite(session.budget)) {
    return null
  }
  if (
    typeof session.memberCount !== "number" ||
    !Number.isFinite(session.memberCount)
  ) {
    return null
  }
  if (!Array.isArray(session.members)) {
    return null
  }

  const members = session.members
    .map((member) => normalizeMember(member))
    .filter((member): member is Member => member !== null)

  return {
    id: session.id,
    budget: session.budget,
    memberCount: session.memberCount,
    members,
    promotions: isStringArray(session.promotions) ? session.promotions : [],
  }
}

function readMenuItems(): MenuItem[] {
  const rawValue = readStorage<unknown>(MENU_STORAGE_KEY, null)
  if (!Array.isArray(rawValue)) {
    return clone(seedMenuItems)
  }

  const normalizedItems = rawValue
    .map((item) => normalizeMenuItem(item))
    .filter((item): item is MenuItem => item !== null)

  return normalizedItems.length > 0 ? normalizedItems : clone(seedMenuItems)
}

function readSession(): MealSession | null {
  const rawValue = readStorage<unknown>(SESSION_STORAGE_KEY, null)
  if (rawValue === null) {
    return null
  }

  return normalizeMealSession(rawValue)
}

function writeMenuItems(items: MenuItem[]) {
  writeStorage(MENU_STORAGE_KEY, items)
}

function writeSession(session: MealSession | null) {
  writeStorage(SESSION_STORAGE_KEY, session)
}

export function createMockMenuSessionApiClient(): ApiClient {
  let menuItems = readMenuItems()
  let session = readSession()

  return {
    async listMenuItems() {
      return clone(menuItems)
    },

    listMenuItemsSync() {
      return clone(menuItems)
    },

    async createMenuItem(input) {
      const created: MenuItem = {
        id: input.id ?? crypto.randomUUID(),
        name: input.name,
        price: input.price,
        category: input.category ?? "",
        spiciness: input.spiciness ?? "",
        ingredients: input.ingredients ?? [],
        containsPork: input.containsPork ?? false,
        containsBeef: input.containsBeef ?? false,
        containsChicken: input.containsChicken ?? false,
        containsSeafood: input.containsSeafood ?? false,
        containsPeanut: input.containsPeanut ?? false,
        containsEgg: input.containsEgg ?? false,
        containsDairy: input.containsDairy ?? false,
        isVegetarian: input.isVegetarian ?? false,
        suggestedServings: input.suggestedServings ?? 1,
        confidence: input.confidence ?? 0.5,
        confirmedFields: input.confirmedFields ?? [],
      }

      menuItems = [created, ...menuItems]
      writeMenuItems(menuItems)
      return clone(created)
    },

    async updateMenuItem(id, input) {
      const index = menuItems.findIndex((item) => item.id === id)
      const current = menuItems[index]
      if (!current) {
        return null
      }

      const updated: MenuItem = {
        id: current.id,
        name: input.name ?? current.name,
        price: input.price ?? current.price,
        category: input.category == null ? current.category : input.category || undefined,
        spiciness: input.spiciness == null ? current.spiciness : input.spiciness || undefined,
        ingredients: input.ingredients ?? current.ingredients,
        containsPork: input.containsPork ?? current.containsPork,
        containsBeef: input.containsBeef ?? current.containsBeef,
        containsChicken: input.containsChicken ?? current.containsChicken,
        containsSeafood: input.containsSeafood ?? current.containsSeafood,
        containsPeanut: input.containsPeanut ?? current.containsPeanut,
        containsEgg: input.containsEgg ?? current.containsEgg,
        containsDairy: input.containsDairy ?? current.containsDairy,
        isVegetarian: input.isVegetarian ?? current.isVegetarian,
        suggestedServings: input.suggestedServings ?? current.suggestedServings,
        confidence: input.confidence ?? current.confidence,
        confirmedFields: input.confirmedFields ?? current.confirmedFields,
      }

      menuItems = [
        ...menuItems.slice(0, index),
        updated,
        ...menuItems.slice(index + 1),
      ]
      writeMenuItems(menuItems)
      return clone(updated)
    },

    async deleteMenuItem(id) {
      const before = menuItems.length
      menuItems = menuItems.filter((item) => item.id !== id)
      if (menuItems.length !== before) {
        writeMenuItems(menuItems)
        return true
      }
      return false
    },

    async deleteMealSession() {
      session = null
      writeSession(null)
      return true
    },

    async createMealSession(input) {
      session = {
        id: "default",
        budget: input.budget,
        memberCount: input.memberCount,
        members: (input.members ?? []).map((member) => ({
          id: member.id ?? crypto.randomUUID(),
          name: member.name,
          needsTakeout: member.needsTakeout ?? false,
        })),
        promotions: input.promotions ?? [],
      }
      writeSession(session)
      return clone(session)
    },

    async getMealSession() {
      return clone(session)
    },

    getMealSessionSync() {
      return clone(session)
    },

    async updateMealSession(id, input) {
      if (id !== "default" || !session) {
        return null
      }

      session = {
        id: "default",
        budget: input.budget ?? session.budget,
        memberCount: input.memberCount ?? session.memberCount,
        members: (input.members ?? session.members).map((member) => ({
          id: member.id ?? crypto.randomUUID(),
          name: member.name,
          needsTakeout: member.needsTakeout ?? false,
        })),
        promotions: input.promotions ?? session.promotions,
      }
      writeSession(session)
      return clone(session)
    },

    async getSnapshot() {
      return this.getSnapshotSync()
    },

    getSnapshotSync() {
      return {
        menu: clone(menuItems),
        session: clone(session ?? defaultSession()),
      }
    },
  }
}
