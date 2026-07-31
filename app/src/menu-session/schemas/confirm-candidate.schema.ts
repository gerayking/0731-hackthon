/**
 * 菜单候选确认 Zod 校验 schema
 * RFC-0006: M1 菜单与组局模块
 *
 * 用于 POST /api/menu/candidates/confirm 接口。
 */
import { z } from "zod"
import { menuItemInputSchema } from "./menu-item.schema"

/** 确认单个菜单候选的输入 */
export const confirmMenuCandidateInputSchema = z.object({
  candidate: menuItemInputSchema,
  confirmedFields: z
    .array(z.string())
    .min(1, "至少需要确认一个字段"),
})

/** 批量确认菜单候选的输入 */
export const confirmMenuCandidatesBatchSchema = z.object({
  items: z
    .array(confirmMenuCandidateInputSchema)
    .min(1, "至少需要确认一个候选项"),
})

export type ConfirmMenuCandidateInputParsed = z.infer<
  typeof confirmMenuCandidateInputSchema
>
export type ConfirmMenuCandidatesBatchParsed = z.infer<
  typeof confirmMenuCandidatesBatchSchema
>
