import { NextResponse } from "next/server";
import { getOverview } from "@/lib/ecc-scanner";

export const dynamic = "force-static";

export async function GET() {
  try {
    const overview = await getOverview();
    return NextResponse.json(overview);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read overview" },
      { status: 500 },
    );
  }
}
