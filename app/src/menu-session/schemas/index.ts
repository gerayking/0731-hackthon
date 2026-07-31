/**
 * M1 Zod 校验 schema 导出入口
 * RFC-0006: M1 菜单与组局模块
 */
export {
  menuItemInputSchema,
  menuItemUpdateSchema,
  type MenuItemInputParsed,
  type MenuItemUpdateParsed,
} from "./menu-item.schema"

export {
  memberInputSchema,
  mealSessionInputSchema,
  mealSessionUpdateSchema,
  type MealSessionInputParsed,
  type MealSessionUpdateParsed,
  type MemberInputParsed,
} from "./meal-session.schema"

export {
  confirmMenuCandidateInputSchema,
  confirmMenuCandidatesBatchSchema,
  type ConfirmMenuCandidateInputParsed,
  type ConfirmMenuCandidatesBatchParsed,
} from "./confirm-candidate.schema"
