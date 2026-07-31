/**
 * M1 领域模型类型定义
 * RFC-0006: M1 菜单与组局模块
 *
 * 定义菜单项、组局、快照等核心业务实体。
 */

/** 系统真实可用的菜品 */
export type MenuItem = {
  id: string
  name: string
  price: number
  category: string | undefined
  spiciness: string | undefined
  ingredients: string[]
  containsPork: boolean
  containsBeef: boolean
  containsChicken: boolean
  containsSeafood: boolean
  containsPeanut: boolean
  containsEgg: boolean
  containsDairy: boolean
  isVegetarian: boolean
  suggestedServings: number
  confidence: number
  confirmedFields: string[]
}

/** 创建或更新菜单项时的输入契约 */
export type MenuItemInput = {
  id?: string | undefined
  name: string
  price: number
  category?: string | undefined
  spiciness?: string | undefined
  ingredients?: string[] | undefined
  containsPork?: boolean | undefined
  containsBeef?: boolean | undefined
  containsChicken?: boolean | undefined
  containsSeafood?: boolean | undefined
  containsPeanut?: boolean | undefined
  containsEgg?: boolean | undefined
  containsDairy?: boolean | undefined
  isVegetarian?: boolean | undefined
  suggestedServings?: number | undefined
  confidence?: number | undefined
  confirmedFields?: string[] | undefined
}

/** 更新菜单项时的输入契约 */
export type MenuItemUpdateInput = {
  name?: string | undefined
  price?: number | undefined
  category?: string | null | undefined
  spiciness?: string | null | undefined
  ingredients?: string[] | undefined
  containsPork?: boolean | undefined
  containsBeef?: boolean | undefined
  containsChicken?: boolean | undefined
  containsSeafood?: boolean | undefined
  containsPeanut?: boolean | undefined
  containsEgg?: boolean | undefined
  containsDairy?: boolean | undefined
  isVegetarian?: boolean | undefined
  suggestedServings?: number | undefined
  confidence?: number | undefined
  confirmedFields?: string[] | undefined
}

/** 组局成员 */
export type Member = {
  id: string
  name: string
  needsTakeout: boolean
}

/** 创建或更新组局成员时的输入契约 */
export type MemberInput = {
  id?: string | undefined
  name: string
  needsTakeout?: boolean | undefined
}

/** 当前组局状态 */
export type MealSession = {
  id: string
  budget: number
  memberCount: number
  members: Member[]
  promotions: string[]
}

/** 创建组局时的输入契约 */
export type MealSessionInput = {
  budget: number
  memberCount: number
  members?: MemberInput[] | undefined
  promotions?: string[] | undefined
}

/** 更新组局时的输入契约 */
export type MealSessionUpdateInput = {
  budget?: number | undefined
  memberCount?: number | undefined
  members?: MemberInput[] | undefined
  promotions?: string[] | undefined
}

/** M1 对外输出的集成快照，供 M3 消费 */
export type MenuSessionSnapshot = {
  menu: MenuItem[]
  session: MealSession
}

/** M2 或 mock M2 产生的候选菜品快照 */
export type MenuCandidateSnapshot = {
  source: "ocr" | "text" | "mock"
  candidates: MenuItemInput[]
}

/** 确认菜单候选的输入 */
export type ConfirmMenuCandidateInput = {
  candidate: MenuItemInput
  confirmedFields: string[]
}
