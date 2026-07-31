/**
 * M1 SQLite repository 实现
 * RFC-0006: M1 菜单与组局模块实现
 *
 * 该实现只访问 SQLite repository 边界，不依赖 React 组件或 Route Handlers。
 */
import { desc, eq, sql } from "drizzle-orm"
import { getDb } from "../db"
import { mealSessions, menuItems, sessionMembers } from "../db/schema"
import type { MealSession, MenuItem, Member } from "../domain"
import type {
  MealSessionInputParsed,
  MealSessionUpdateParsed,
} from "../schemas"
import type { MenuItemInputParsed, MenuItemUpdateParsed } from "../schemas"
import type { MemberFactoryInput, MemberRepository, MenuRepository, SessionRepository } from "./repository"

const DEFAULT_SESSION_ID = "default"

function parseJsonArray<T>(value: string | null | undefined, fallback: T[]): T[] {
  if (!value) {
    return fallback
  }

  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? (parsed as T[]) : fallback
  } catch {
    return fallback
  }
}

function serializeStringArray(value: string[]): string {
  return JSON.stringify(value)
}

function mapMenuItem(row: (typeof menuItems.$inferSelect)): MenuItem {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    category: row.category ?? undefined,
    spiciness: row.spiciness ?? undefined,
    ingredients: parseJsonArray<string>(row.ingredients, []),
    containsPork: row.containsPork,
    containsBeef: row.containsBeef,
    containsChicken: row.containsChicken,
    containsSeafood: row.containsSeafood,
    containsPeanut: row.containsPeanut,
    containsEgg: row.containsEgg,
    containsDairy: row.containsDairy,
    isVegetarian: row.isVegetarian,
    suggestedServings: row.suggestedServings,
    confidence: row.confidence,
    confirmedFields: parseJsonArray<string>(row.confirmedFields, []),
  }
}

function mapMealSession(
  sessionRow: (typeof mealSessions.$inferSelect),
  memberRows: (typeof sessionMembers.$inferSelect)[],
): MealSession {
  return {
    id: sessionRow.id,
    budget: sessionRow.budget,
    memberCount: sessionRow.memberCount,
    members: memberRows.map((memberRow) => ({
      id: memberRow.id,
      name: memberRow.name,
      needsTakeout: memberRow.needsTakeout,
    })),
    promotions: parseJsonArray<string>(sessionRow.promotions, []),
  }
}

/** 菜单 SQLite repository */
export class SqliteMenuRepository implements MenuRepository {
  async create(input: MenuItemInputParsed): Promise<MenuItem> {
    const db = getDb()
    const [created] = await db
      .insert(menuItems)
      .values({
        id: input.id ?? crypto.randomUUID(),
        name: input.name,
        price: input.price,
        category: input.category,
        spiciness: input.spiciness,
        ingredients: serializeStringArray(input.ingredients),
        containsPork: input.containsPork,
        containsBeef: input.containsBeef,
        containsChicken: input.containsChicken,
        containsSeafood: input.containsSeafood,
        containsPeanut: input.containsPeanut,
        containsEgg: input.containsEgg,
        containsDairy: input.containsDairy,
        isVegetarian: input.isVegetarian,
        suggestedServings: input.suggestedServings,
        confidence: input.confidence,
        confirmedFields: serializeStringArray(input.confirmedFields),
      })
      .returning()

    if (!created) {
      throw new Error("创建菜单项后无法读取菜单项")
    }

    return mapMenuItem(created)
  }

  async update(id: string, input: MenuItemUpdateParsed): Promise<MenuItem | null> {
    const existing = await this.getById(id)
    if (!existing) {
      return null
    }

    const mergedInput: MenuItemInputParsed = {
      id: existing.id,
      name: input.name ?? existing.name,
      price: input.price ?? existing.price,
      category: input.category ?? existing.category,
      spiciness: input.spiciness ?? existing.spiciness,
      ingredients: input.ingredients ?? existing.ingredients,
      containsPork: input.containsPork ?? existing.containsPork,
      containsBeef: input.containsBeef ?? existing.containsBeef,
      containsChicken: input.containsChicken ?? existing.containsChicken,
      containsSeafood: input.containsSeafood ?? existing.containsSeafood,
      containsPeanut: input.containsPeanut ?? existing.containsPeanut,
      containsEgg: input.containsEgg ?? existing.containsEgg,
      containsDairy: input.containsDairy ?? existing.containsDairy,
      isVegetarian: input.isVegetarian ?? existing.isVegetarian,
      suggestedServings: input.suggestedServings ?? existing.suggestedServings,
      confidence: input.confidence ?? existing.confidence,
      confirmedFields: input.confirmedFields ?? existing.confirmedFields,
    }

    const db = getDb()
    const [updated] = await db
      .update(menuItems)
      .set({
        id: existing.id,
        name: mergedInput.name,
        price: mergedInput.price,
        category: mergedInput.category,
        spiciness: mergedInput.spiciness,
        ingredients: serializeStringArray(mergedInput.ingredients),
        containsPork: mergedInput.containsPork,
        containsBeef: mergedInput.containsBeef,
        containsChicken: mergedInput.containsChicken,
        containsSeafood: mergedInput.containsSeafood,
        containsPeanut: mergedInput.containsPeanut,
        containsEgg: mergedInput.containsEgg,
        containsDairy: mergedInput.containsDairy,
        isVegetarian: mergedInput.isVegetarian,
        suggestedServings: mergedInput.suggestedServings,
        confidence: mergedInput.confidence,
        confirmedFields: serializeStringArray(mergedInput.confirmedFields),
      })
      .where(eq(menuItems.id, id))
      .returning()

    if (!updated) {
      throw new Error("更新菜单项后无法读取菜单项")
    }

    return mapMenuItem(updated)
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb()
    const result = await db.delete(menuItems).where(eq(menuItems.id, id)).run()
    return result.changes > 0
  }

  async list(): Promise<MenuItem[]> {
    const db = getDb()
    const rows = await db.select().from(menuItems).orderBy(desc(menuItems.id))
    return rows.map((row) => mapMenuItem(row))
  }

  async getById(id: string): Promise<MenuItem | null> {
    const db = getDb()
    const [row] = await db.select().from(menuItems).where(eq(menuItems.id, id))
    return row ? mapMenuItem(row) : null
  }
}

/** 组局成员 SQLite repository */
export class SqliteMemberRepository implements MemberRepository {
  async create(input: MemberFactoryInput): Promise<Member> {
    const db = getDb()
    const [created] = await db
      .insert(sessionMembers)
      .values({
        id: input.id ?? crypto.randomUUID(),
        sessionId: input.sessionId,
        name: input.name,
        needsTakeout: input.needsTakeout,
      })
      .returning()

    if (!created) {
      throw new Error("创建成员后无法读取成员")
    }

    return {
      id: created.id,
      name: created.name,
      needsTakeout: created.needsTakeout,
    }
  }
}

/** 组局 SQLite repository */
export class SqliteSessionRepository implements SessionRepository {
  async create(input: MealSessionInputParsed): Promise<MealSession> {
    const db = getDb()
    const sessionId = DEFAULT_SESSION_ID

    db.transaction((tx) => {
      tx.delete(sessionMembers).where(eq(sessionMembers.sessionId, sessionId)).run()
      tx.delete(mealSessions).where(eq(mealSessions.id, sessionId)).run()
      tx.insert(mealSessions)
        .values({
          id: sessionId,
          budget: input.budget,
          memberCount: input.memberCount,
          promotions: serializeStringArray(input.promotions),
        })
        .run()

      for (const memberInput of input.members) {
        tx.insert(sessionMembers)
          .values({
            id: memberInput.id ?? crypto.randomUUID(),
            sessionId,
            name: memberInput.name,
            needsTakeout: memberInput.needsTakeout,
          })
          .run()
      }
    })

    return this.get(sessionId).then((session) => {
      if (!session) {
        throw new Error("创建组局后无法读取组局")
      }
      return session
    })
  }

  async update(id: string, input: MealSessionUpdateParsed): Promise<MealSession | null> {
    const existing = await this.get(id)
    if (!existing) {
      return null
    }

    const db = getDb()
    db.transaction((tx) => {
      tx.update(mealSessions)
        .set({
          budget: input.budget ?? existing.budget,
          memberCount: input.memberCount ?? existing.memberCount,
          promotions: input.promotions ? serializeStringArray(input.promotions) : serializeStringArray(existing.promotions),
        })
        .where(eq(mealSessions.id, id))
        .run()

      if (input.members) {
        tx.delete(sessionMembers).where(eq(sessionMembers.sessionId, id)).run()
        for (const memberInput of input.members) {
          tx.insert(sessionMembers)
            .values({
              id: memberInput.id ?? crypto.randomUUID(),
              sessionId: id,
              name: memberInput.name,
              needsTakeout: memberInput.needsTakeout,
            })
            .run()
        }
      }
    })

    return this.get(id)
  }

  async get(id = DEFAULT_SESSION_ID): Promise<MealSession | null> {
    const db = getDb()
    const [sessionRow] = await db.select().from(mealSessions).where(eq(mealSessions.id, id))

    if (!sessionRow) {
      return null
    }

    const memberRows = await db
      .select()
      .from(sessionMembers)
      .where(eq(sessionMembers.sessionId, id))
      .orderBy(sql`${sessionMembers.name}`)

    return mapMealSession(sessionRow, memberRows)
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb()
    const result = await db.delete(mealSessions).where(eq(mealSessions.id, id)).run()
    return result.changes > 0
  }
}
