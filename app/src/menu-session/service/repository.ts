/**
 * M1 repository 抽象定义
 * RFC-0006: M1 菜单与组局模块实现
 *
 * 该文件只描述 M1 服务层需要的数据访问边界，不依赖 React 组件或 Route Handlers。
 */
import type { MealSession, MenuItem, Member } from "../domain"
import type {
  MealSessionInputParsed,
  MealSessionUpdateParsed,
  MemberInputParsed,
} from "../schemas"
import type { MenuItemInputParsed, MenuItemUpdateParsed } from "../schemas"

/** 菜单项 repository 接口 */
export interface MenuRepository {
  create(input: MenuItemInputParsed): Promise<MenuItem>
  update(id: string, input: MenuItemUpdateParsed): Promise<MenuItem | null>
  delete(id: string): Promise<boolean>
  list(): Promise<MenuItem[]>
  getById(id: string): Promise<MenuItem | null>
}

/** 组局 repository 接口 */
export interface SessionRepository {
  create(input: MealSessionInputParsed): Promise<MealSession>
  update(id: string, input: MealSessionUpdateParsed): Promise<MealSession | null>
  get(id?: string): Promise<MealSession | null>
  delete(id: string): Promise<boolean>
}

/** 成员输入转换为 Member 时的字段来源 */
export type MemberFactoryInput = MemberInputParsed & {
  sessionId: string
}

/** 成员仓库辅助接口 */
export interface MemberRepository {
  create(input: MemberFactoryInput): Promise<Member>
}
