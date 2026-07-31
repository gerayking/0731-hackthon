/**
 * Menu session snapshot Route Handler
 * RFC-0006: M1 菜单与组局模块
 *
 * 输出供 M3 消费的菜单与组局合并快照。
 */
import { getMenuSessionService } from "@/src/menu-session/service"
import { errorResponse, methodNotAllowedResponse, okResponse } from "@/src/menu-session/api/http"

export const runtime = "nodejs"

export async function GET() {
  try {
    return okResponse(await getMenuSessionService().getMenuSessionSnapshot())
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error : new Error("读取菜单组局快照失败"),
      "internal_error",
    )
  }
}

export function OPTIONS() {
  return methodNotAllowedResponse(["GET"])
}
