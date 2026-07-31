/**
 * Menu item detail Route Handler
 * RFC-0006: M1 菜单与组局模块
 *
 * 提供菜单项更新与删除入口，更新输入由服务层 zod schema 校验。
 */
import { NextRequest } from "next/server"
import { menuItemUpdateSchema } from "@/src/menu-session/schemas"
import { getMenuSessionService } from "@/src/menu-session/service"
import {
  errorResponse,
  methodNotAllowedResponse,
  okResponse,
  parseJsonBody,
} from "@/src/menu-session/api/http"

export const runtime = "nodejs"

export type MenuItemIdRouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(
  request: NextRequest,
  context: MenuItemIdRouteContext,
) {
  try {
    const { id } = await context.params
    const input = menuItemUpdateSchema.parse(await parseJsonBody<unknown>(request))
    const updated = await getMenuSessionService().updateMenuItem(id, input)

    if (!updated) {
      return errorResponse(new Error(`未找到菜单项：${id}`), "not_found")
    }

    return okResponse(updated)
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error : new Error("更新菜单项失败"),
      "bad_request",
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: MenuItemIdRouteContext,
) {
  try {
    const { id } = await context.params
    const deleted = await getMenuSessionService().deleteMenuItem(id)

    if (!deleted) {
      return errorResponse(new Error(`未找到菜单项：${id}`), "not_found")
    }

    return okResponse({ deleted: true, id })
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error : new Error("删除菜单项失败"),
      "internal_error",
    )
  }
}

export function OPTIONS() {
  return methodNotAllowedResponse(["PATCH", "DELETE"])
}
