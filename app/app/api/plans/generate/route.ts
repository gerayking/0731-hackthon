import { NextResponse } from "next/server";
import { planningInputSnapshotSchema } from "@/src/contracts/snapshots";
import { generatePlanResult } from "@/src/plan-explanation-agent/service/generate-plan";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      {
        error: "invalid_json",
        message: error instanceof Error ? error.message : "请求体不是合法 JSON。",
      },
      { status: 400 },
    );
  }

  const parsed = planningInputSnapshotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_input",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const result = generatePlanResult(parsed.data);

  return NextResponse.json(result);
}
