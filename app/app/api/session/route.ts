/**
 * Meal session collection Route Handler
 * RFC-0006: M1 菜单与组局模块
 *
 * 创建或替换当前组局，输入由服务层 zod schema 校验。
 */
import { NextRequest } from "next/server"
import { mealSessionInputSchema } from "@/src/menu-session/schemas"
import { getMenuSessionService } from "@/src/menu-session/service"
import {
  errorResponse,
  methodNotAllowedResponse,
  okResponse,
  parseJsonBody,
} from "@/src/menu-session/api/http"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const input = mealSessionInputSchema.parse(await parseJsonBody<unknown>(request))
    const created = await getMenuSessionService().createMealSession(input)
    return okResponse(created)
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error : new Error("创建组局失败"),
      "bad_request",
    )
  }
}

export function OPTIONS() {
  return methodNotAllowedResponse(["POST"])
}
