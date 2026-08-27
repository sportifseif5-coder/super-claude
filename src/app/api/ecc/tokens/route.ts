import { NextResponse } from "next/server";
import { getTokenEstimate } from "@/lib/ecc-scanner";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const estimate = await getTokenEstimate();
    return NextResponse.json(estimate);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to estimate tokens" },
      { status: 500 },
    );
  }
}
