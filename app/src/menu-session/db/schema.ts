/**
 * M1 SQLite 表结构定义（Drizzle ORM）
 * RFC-0006: M1 菜单与组局模块
 *
 * 数据库 schema 与领域模型字段一致。
 * 使用 better-sqlite3 + drizzle-orm 组合。
 */
import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core"

/**
 * menu_items 表 — 系统真实可用的菜品
 *
 * JSON 字段使用 text mode 存储序列化数组。
 */
export const menuItems = sqliteTable("menu_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  price: real("price").notNull(),
  category: text("category"),
  spiciness: text("spiciness"),
  /** JSON 序列化的 string[] */
  ingredients: text("ingredients").notNull().default("[]"),
  containsPork: integer("contains_pork", { mode: "boolean" })
    .notNull()
    .default(false),
  containsBeef: integer("contains_beef", { mode: "boolean" })
    .notNull()
    .default(false),
  containsChicken: integer("contains_chicken", { mode: "boolean" })
    .notNull()
    .default(false),
  containsSeafood: integer("contains_seafood", { mode: "boolean" })
    .notNull()
    .default(false),
  containsPeanut: integer("contains_peanut", { mode: "boolean" })
    .notNull()
    .default(false),
  containsEgg: integer("contains_egg", { mode: "boolean" })
    .notNull()
    .default(false),
  containsDairy: integer("contains_dairy", { mode: "boolean" })
    .notNull()
    .default(false),
  isVegetarian: integer("is_vegetarian", { mode: "boolean" })
    .notNull()
    .default(false),
  suggestedServings: integer("suggested_servings").notNull().default(1),
  confidence: real("confidence").notNull().default(0.5),
  /** JSON 序列化的 string[] */
  confirmedFields: text("confirmed_fields").notNull().default("[]"),
})

/**
 * meal_sessions 表 — 组局状态
 *
 * 系统当前只保留最新的一个组局（单 session 模式）。
 * promotions 以 JSON 序列化 string[] 存储。
 */
export const mealSessions = sqliteTable("meal_sessions", {
  id: text("id").primaryKey(),
  budget: real("budget").notNull().default(0),
  memberCount: integer("member_count").notNull().default(1),
  /** JSON 序列化的 string[] */
  promotions: text("promotions").notNull().default("[]"),
})

/**
 * session_members 表 — 组局成员
 *
 * 通过 sessionId 关联 meal_sessions。
 */
export const sessionMembers = sqliteTable("session_members", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  name: text("name").notNull(),
  needsTakeout: integer("needs_takeout", { mode: "boolean" })
    .notNull()
    .default(false),
})
