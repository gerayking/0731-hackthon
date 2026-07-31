/**
 * M1 菜单与组局模块导出入口
 * RFC-0006: M1 菜单与组局模块
 */
export type {
  MenuItem,
  MenuItemInput,
  Member,
  MealSession,
  MenuSessionSnapshot,
  MenuCandidateSnapshot,
  ConfirmMenuCandidateInput,
} from "./domain"

export {
  menuItemInputSchema,
  menuItemUpdateSchema,
  memberInputSchema,
  mealSessionInputSchema,
  mealSessionUpdateSchema,
  confirmMenuCandidateInputSchema,
  confirmMenuCandidatesBatchSchema,
} from "./schemas"

export { getDb, getDbPath, schema } from "./db"
