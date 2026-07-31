/**
 * 菜单项 Zod 校验 schema
 * RFC-0006: M1 菜单与组局模块
 *
 * 覆盖必填字段、数字范围、数组默认值与布尔默认值。
 */
import { z } from "zod"

/** 菜单项输入校验 schema — 用于 POST /api/menu/items */
export const menuItemInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "菜品名称不能为空"),
  price: z.number().nonnegative("价格必须为非负数"),
  category: z.string().optional(),
  spiciness: z.string().optional(),
  ingredients: z.array(z.string()).default([]),
  containsPork: z.boolean().default(false),
  containsBeef: z.boolean().default(false),
  containsChicken: z.boolean().default(false),
  containsSeafood: z.boolean().default(false),
  containsPeanut: z.boolean().default(false),
  containsEgg: z.boolean().default(false),
  containsDairy: z.boolean().default(false),
  isVegetarian: z.boolean().default(false),
  suggestedServings: z.number().int().positive().default(1),
  confidence: z.number().min(0).max(1).default(0.5),
  confirmedFields: z.array(z.string()).default([]),
})

/** 菜单项更新校验 schema — 用于 PATCH /api/menu/items/:id，所有字段可选 */
export const menuItemUpdateSchema = z.object({
  name: z.string().min(1, "菜品名称不能为空").optional(),
  price: z.number().nonnegative("价格必须为非负数").optional(),
  category: z.string().nullable().optional(),
  spiciness: z.string().nullable().optional(),
  ingredients: z.array(z.string()).optional(),
  containsPork: z.boolean().optional(),
  containsBeef: z.boolean().optional(),
  containsChicken: z.boolean().optional(),
  containsSeafood: z.boolean().optional(),
  containsPeanut: z.boolean().optional(),
  containsEgg: z.boolean().optional(),
  containsDairy: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  suggestedServings: z.number().int().positive().optional(),
  confidence: z.number().min(0).max(1).optional(),
  confirmedFields: z.array(z.string()).optional(),
})

export type MenuItemInputParsed = z.infer<typeof menuItemInputSchema>
export type MenuItemUpdateParsed = z.infer<typeof menuItemUpdateSchema>
