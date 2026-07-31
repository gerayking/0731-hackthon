/**
 * Menu candidate confirmation Route Handler
 * RFC-0006: M1 菜单与组局模块
 *
 * 将 M2/mock M2 的候选菜品逐项确认并写入真实菜单。
 */
import { NextRequest } from "next/server"
import { confirmMenuCandidatesBatchSchema } from "@/src/menu-session/schemas"
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
    const parsed = confirmMenuCandidatesBatchSchema.parse(
      await parseJsonBody<unknown>(request),
    )
    const created = await getMenuSessionService().confirmMenuCandidates(
      parsed.items,
    )

    return okResponse({ items: created })
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error : new Error("确认候选菜单失败"),
      "bad_request",
    )
  }
}

export function OPTIONS() {
  return methodNotAllowedResponse(["POST"])
}
