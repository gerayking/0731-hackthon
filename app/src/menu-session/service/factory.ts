/**
 * M1 service factory
 * RFC-0006: M1 菜单与组局模块实现
 *
 * 为 Route Handlers 和测试提供统一的服务层入口。
 */
import { MenuSessionService } from "./menu-session-service"
import {
  SqliteMenuRepository,
  SqliteSessionRepository,
} from "./sqlite-repository"

let serviceInstance: MenuSessionService | null = null

/** 获取默认 M1 服务实例 */
export function getMenuSessionService(): MenuSessionService {
  if (!serviceInstance) {
    serviceInstance = new MenuSessionService(
      new SqliteMenuRepository(),
      new SqliteSessionRepository(),
    )
  }

  return serviceInstance
}
