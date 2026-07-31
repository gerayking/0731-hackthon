/**
 * Meal session detail Route Handler
 * RFC-0006: M1 菜单与组局模块
 *
 * 更新或删除当前组局，输入由服务层 zod schema 校验。
 */
import { NextRequest } from "next/server"
import { mealSessionUpdateSchema } from "@/src/menu-session/schemas"
import { getMenuSessionService } from "@/src/menu-session/service"
import {
  errorResponse,
  methodNotAllowedResponse,
  okResponse,
  parseJsonBody,
} from "@/src/menu-session/api/http"

export const runtime = "nodejs"

export type SessionIdRouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(
  request: NextRequest,
  context: SessionIdRouteContext,
) {
  try {
    const { id } = await context.params
    const input = mealSessionUpdateSchema.parse(await parseJsonBody<unknown>(request))
    const updated = await getMenuSessionService().updateMealSession(id, input)

    if (!updated) {
      return errorResponse(new Error(`未找到组局：${id}`), "not_found")
    }

    return okResponse(updated)
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error : new Error("更新组局失败"),
      "bad_request",
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: SessionIdRouteContext,
) {
  try {
    const { id } = await context.params
    const deleted = await getMenuSessionService().deleteMealSession(id)

    if (!deleted) {
      return errorResponse(new Error(`未找到组局：${id}`), "not_found")
    }

    return okResponse({ deleted: true, id })
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error : new Error("删除组局失败"),
      "internal_error",
    )
  }
}

export function OPTIONS() {
  return methodNotAllowedResponse(["PATCH", "DELETE"])
}
