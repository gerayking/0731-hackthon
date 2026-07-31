/**
 * M1 Route Handler API 通用工具
 * RFC-0006: M1 菜单与组局模块
 *
 * 统一 JSON 响应、结构化错误与 zod 解析错误格式。
 */
import { NextResponse } from "next/server"
import { ZodError } from "zod"

export type ApiSuccessBody<TData> = {
  ok: true
  data: TData
}

export type ApiErrorBody = {
  ok: false
  error: {
    code: "bad_request" | "not_found" | "method_not_allowed" | "internal_error"
    message: string
    issues: Array<{
      path: Array<string | number>
      message: string
    }>
  }
}

export type ApiResponse<TData> = ApiSuccessBody<TData> | ApiErrorBody

export function okResponse<TData>(data: TData): NextResponse<ApiResponse<TData>> {
  return NextResponse.json({ ok: true, data })
}

export function errorResponse(
  error: Error,
  status: ApiErrorBody["error"]["code"],
): NextResponse<ApiResponse<never>> {
  const statusCode = statusCodeForError(status)

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: status,
        message: error instanceof ZodError ? "请求参数校验失败" : error.message,
        issues: error instanceof ZodError ? flattenZodIssues(error) : [],
      },
    },
    { status: statusCode },
  )
}

export function methodNotAllowedResponse(
  allowedMethods: string[],
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "method_not_allowed",
        message: `不支持的 HTTP 方法，仅支持：${allowedMethods.join(", ")}`,
        issues: [],
      },
    },
    {
      status: 405,
      headers: {
        Allow: allowedMethods.join(", "),
      },
    },
  )
}

async function parseJsonBody<TBody>(request: Request): Promise<TBody> {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    throw new Error("请求体必须是 JSON")
  }

  try {
    return (await request.json()) as TBody
  } catch {
    throw new Error("JSON 请求体解析失败")
  }
}

function flattenZodIssues(error: ZodError): ApiErrorBody["error"]["issues"] {
  return error.issues.map((issue) => ({
    path: issue.path.map((pathItem) =>
      typeof pathItem === "number" ? pathItem : String(pathItem),
    ),
    message: issue.message,
  }))
}

function statusCodeForError(
  status: ApiErrorBody["error"]["code"],
): 400 | 404 | 405 | 500 {
  switch (status) {
    case "bad_request":
      return 400
    case "not_found":
      return 404
    case "method_not_allowed":
      return 405
    case "internal_error":
      return 500
  }
}

export { parseJsonBody }
