import { NextResponse } from "next/server";
import { revisionInputSnapshotSchema } from "@/contracts/snapshots";
import { revisePlan } from "@/plan-explanation-agent/service/revise-plan";

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

  const parsed = revisionInputSnapshotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_input",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(revisePlan(parsed.data));
}
