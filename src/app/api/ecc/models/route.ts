import { NextResponse } from "next/server";
import { getModelDistribution } from "@/lib/ecc-scanner";

export const dynamic = "force-static";

export async function GET() {
  try {
    const data = await getModelDistribution();
    return NextResponse.json({ distribution: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read model distribution" },
      { status: 500 },
    );
  }
}
