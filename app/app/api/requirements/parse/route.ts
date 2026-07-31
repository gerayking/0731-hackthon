import { NextResponse, type NextRequest } from "next/server"
import { parseRequirements } from "@/src/ocr-requirement-agent/parser/requirement-parser"
import { ParseRequirementsInputSchema, ParseRequirementsOutputSchema } from "@/src/ocr-requirement-agent/domain"
import {
  errorResponse,
  jsonResponse,
  methodNotAllowedResponse,
  parseRequestBody,
} from "@/src/ocr-requirement-agent/api/m2-api-helpers"

/**
 * POST /api/requirements/parse route handler.
 * RFC-0003: T5 exposes requirement parsing as a validated M2 candidate API
 * and returns RequirementsSnapshot plus AgentIntent without writing state.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const input = parseRequestBody(request, ParseRequirementsInputSchema)
    const output = parseRequirements(input)
    const validatedOutput = ParseRequirementsOutputSchema.parse(output)

    return jsonResponse(validatedOutput)
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
