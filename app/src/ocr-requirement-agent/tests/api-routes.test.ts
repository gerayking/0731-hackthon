import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { POST as extractMenuPost, PUT as extractMenuPut } from "../../../app/api/ocr/extract-menu/route"
import { GET as parseRequirementsGet, POST as parseRequirementsPost } from "../../../app/api/requirements/parse/route"

/**
 * M2 API route handler integration tests.
 * RFC-0003: T5 verifies the public JSON contracts and validation errors without
 * importing M1/M3 business state or mutating orders/inventory.
 */

const jsonHeaders = { "content-type": "application/json" } as const

function postRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
}

function expectObjectWithShape(value: unknown, shape: Record<string, unknown>): void {
  expect(value).toEqual(expect.objectContaining(shape))
}

describe("M2 API route handlers", () => {
  it("extracts a text menu candidate snapshot from POST /api/ocr/extract-menu", async () => {
    const response = await extractMenuPost(
      postRequest("http://localhost/api/ocr/extract-menu", {
        mode: "text",
        content: "宫保鸡丁饭 48 元 主食 微辣 鸡肉 花生 米饭",
      }),
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expectObjectWithShape(payload, {
      snapshot: {
        source: "text",
        candidates: expect.arrayContaining([
          expect.objectContaining({
            id: "ocr-candidate-001",
            name: "宫保鸡丁饭",
            price: 48,
            category: "主食",
            spiciness: "微辣",
            containsChicken: true,
            containsPeanut: true,
          }),
        ]),
      },
    })
  })

  it("returns a validated parse output from POST /api/requirements/parse", async () => {
    const response = await parseRequirementsPost(
      postRequest("http://localhost/api/requirements/parse", {
        memberId: "member-api-001",
        text: "不吃猪肉，我可以吃微辣",
      }),
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toMatchObject({
      snapshot: {
        requirementsByMember: {
          "member-api-001": expect.arrayContaining([
            expect.objectContaining({ type: "exclude_ingredient", value: "猪肉", hardness: "hard" }),
            expect.objectContaining({ type: "spiciness_upper_bound", value: "微辣", hardness: "soft" }),
          ]),
        },
      },
      intent: {
        action: "add_requirement",
        memberId: "member-api-001",
        requirements: [
          { memberId: "member-api-001", text: "不吃猪肉" },
          { memberId: "member-api-001", text: "我可以吃微辣" },
        ],
      },
    })
  })

  it("returns a clear validation error for invalid M2 input", async () => {
    const response = await parseRequirementsPost(postRequest("http://localhost/api/requirements/parse", {}))

    expect(response.status).toBe(400)
    const payload = await response.json()
    expectObjectWithShape(payload, {
      error: {
        code: "validation_failed",
        message: expect.any(String),
        details: expect.any(Array),
      },
    })
  })

  it("rejects unsupported methods with 405 responses", async () => {
    const parseGetResponse = await parseRequirementsGet()
    expect(parseGetResponse.status).toBe(405)
    expect(parseGetResponse.headers.get("allow")).toBe("POST")

    const extractPutResponse = await extractMenuPut()
    expect(extractPutResponse.status).toBe(405)
    expect(extractPutResponse.headers.get("allow")).toBe("POST")
  })
})
