import { type NextRequest } from "next/server"
import { parseMenuOcr } from "@/src/ocr-requirement-agent/parser/menu-ocr-parser"
import { ExtractMenuOutputSchema, OcrInputSchema } from "@/src/ocr-requirement-agent/domain"
import {
  errorResponse,
  jsonResponse,
  methodNotAllowedResponse,
  parseRequestBody,
} from "@/src/ocr-requirement-agent/api/m2-api-helpers"

/**
 * POST /api/ocr/extract-menu route handler.
 * RFC-0003: T5 exposes menu OCR/text parsing as a validated M2 candidate API
 * without importing or mutating M1 menu, order, or inventory state.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const input = parseRequestBody(request, OcrInputSchema)
    const snapshot = parseMenuOcr(input)
    const output = ExtractMenuOutputSchema.parse({ snapshot })

    return jsonResponse(output)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function GET(): Promise<Response> {
  return methodNotAllowedResponse(["POST"])
}

export async function PUT(): Promise<Response> {
  return methodNotAllowedResponse(["POST"])
}

export async function PATCH(): Promise<Response> {
  return methodNotAllowedResponse(["POST"])
}

export async function DELETE(): Promise<Response> {
  return methodNotAllowedResponse(["POST"])
}

export async function OPTIONS(): Promise<Response> {
  return new NextResponse(null, { status: 204, headers: { Allow: "POST, OPTIONS" } })
}
