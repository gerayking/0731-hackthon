import { NextResponse } from "next/server";
import { explainPlanSnapshotSchema, planSchema, planningInputSnapshotSchema } from "@/contracts/snapshots";
import { explainPlan } from "@/plan-explanation-agent/service/explain-plan";

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

  const parsed = explainPlanSnapshotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_input",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const planningParsed = planningInputSnapshotSchema.safeParse(parsed.data.snapshot);
  if (!planningParsed.success) {
    return NextResponse.json(
      {
        error: "invalid_snapshot",
        issues: planningParsed.error.issues,
      },
      { status: 400 },
    );
  }

  const planParsed = planSchema.safeParse(parsed.data.plan);
  if (!planParsed.success) {
    return NextResponse.json(
      {
        error: "invalid_plan",
        issues: planParsed.error.issues,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(explainPlan(planningParsed.data, planParsed.data));
}
