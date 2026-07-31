/**
 * 组局 Zod 校验 schema
 * RFC-0006: M1 菜单与组局模块
 *
 * 覆盖预算、人数、成员数组与打包标记校验。
 */
import { z } from "zod"

/** 成员输入校验 */
export const memberInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "成员姓名不能为空"),
  needsTakeout: z.boolean().default(false),
})

/** 创建组局输入 schema — 用于 POST /api/session */
export const mealSessionInputSchema = z.object({
  budget: z.number().nonnegative("预算必须为非负数"),
  memberCount: z.number().int().positive("人数必须为正整数"),
  members: z.array(memberInputSchema).default([]),
  promotions: z.array(z.string()).default([]),
})

/** 更新组局 schema — 用于 PATCH /api/session/:id，所有字段可选 */
export const mealSessionUpdateSchema = z.object({
  budget: z.number().nonnegative("预算必须为非负数").optional(),
  memberCount: z.number().int().positive("人数必须为正整数").optional(),
  members: z.array(memberInputSchema).optional(),
  promotions: z.array(z.string()).optional(),
})

export type MealSessionInputParsed = z.infer<typeof mealSessionInputSchema>
export type MealSessionUpdateParsed = z.infer<typeof mealSessionUpdateSchema>
export type MemberInputParsed = z.infer<typeof memberInputSchema>
