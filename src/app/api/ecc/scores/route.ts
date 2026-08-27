import { NextResponse } from "next/server";
import { getSkillScores } from "@/lib/ecc-scanner";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const scores = await getSkillScores();
    return NextResponse.json({ scores });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to compute scores" },
      { status: 500 },
    );
  }
}
