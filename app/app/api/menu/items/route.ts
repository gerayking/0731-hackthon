/**
 * Menu item collection Route Handler
 * RFC-0006: M1 菜单与组局模块
 *
 * 提供菜单项列表与创建入口，所有写入均经过服务层校验。
 */
import { NextRequest } from "next/server"
import { menuItemInputSchema } from "@/src/menu-session/schemas"
import { getMenuSessionService } from "@/src/menu-session/service"
import {
  errorResponse,
  methodNotAllowedResponse,
  okResponse,
  parseJsonBody,
} from "@/src/menu-session/api/http"

export const runtime = "nodejs"

export async function GET() {
  try {
    return okResponse(await getMenuSessionService().listMenuItems())
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error : new Error("读取菜单失败"),
      "internal_error",
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = menuItemInputSchema.parse(await parseJsonBody<unknown>(request))
    const created = await getMenuSessionService().createMenuItem(input)
    return okResponse(created)
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error : new Error("创建菜单项失败"),
      "bad_request",
    )
  }
}

export function OPTIONS() {
  return methodNotAllowedResponse(["GET", "POST"])
}
