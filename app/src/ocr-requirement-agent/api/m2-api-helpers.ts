import { z, type ZodSchema } from "zod"
import { NextResponse } from "next/server"

/**
 * Shared API helpers for M2 route handlers.
 * RFC-0003: Keeps /api/ocr and /api/requirements as read-only candidate APIs
 * with validated JSON input/output and no menu, order, or inventory mutation.
 */

export type M2ErrorPayload = {
  error: {
    code: "invalid_request" | "validation_failed" | "method_not_allowed" | "internal_error"
    message: string
    details?: z.ZodIssue[]
  }
}

export type JsonBody = Record<string, unknown>

const jsonContentType = "application/json; charset=utf-8"

export async function parseJsonBody(request: Request): Promise<JsonBody | null> {
  const contentType = request.headers.get("content-type")
  if (!contentType?.includes("application/json")) {
    return null
  }

  try {
    const body = (await request.json()) as unknown
    return typeof body === "object" && body !== null && !Array.isArray(body) ? (body as JsonBody) : null
  } catch {
    return null
  }
}

export async function parseRequestBody<TSchema extends ZodSchema>(request: Request, schema: TSchema): Promise<z.infer<TSchema>> {
  const body = await parseJsonBody(request)
  if (body === null) {
    throw createM2ApiError("invalid_request", "Request body must be a JSON object.")
  }

  try {
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createM2ApiError("validation_failed", "Request body failed M2 schema validation.", error.issues)
    }

    throw error
  }
}

export function jsonResponse<TPayload>(payload: TPayload, init?: ResponseInit): NextResponse<TPayload> {
  const headers = new Headers(init?.headers)
  headers.set("content-type", jsonContentType)

  return NextResponse.json(payload, {
    ...init,
    headers,
  })
}

export function methodNotAllowedResponse(allowedMethods: readonly string[]): NextResponse<M2ErrorPayload> {
  return jsonResponse(
    {
      error: {
        code: "method_not_allowed",
        message: `Method not allowed. Allowed methods: ${allowedMethods.join(", ")}.`,
      },
    },
    { status: 405, headers: { Allow: allowedMethods.join(", ") } },
  )
}

export function createM2ApiError(
  code: M2ErrorPayload["error"]["code"],
  message: string,
  details?: z.ZodIssue[],
): M2ErrorPayload {
  return {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  }
}

export function errorResponse(error: unknown): NextResponse<M2ErrorPayload> {
  if (isM2ApiError(error)) {
    const status = error.error.code === "method_not_allowed" ? 405 : 400
    return jsonResponse(error, { status })
  }

  console.error("M2 API handler failed", error)
  return jsonResponse(createM2ApiError("internal_error", "M2 API handler failed."), { status: 500 })
}

function isM2ApiError(error: unknown): error is M2ErrorPayload {
  return (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof error.error === "object" &&
    error.error !== null &&
    "code" in error.error &&
    "message" in error.error
  )
}
