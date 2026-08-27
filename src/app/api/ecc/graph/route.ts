import { NextResponse } from "next/server";
import { getGraphData } from "@/lib/ecc-scanner";

export const dynamic = "force-static";

export async function GET() {
  try {
    const data = await getGraphData();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read graph data" },
      { status: 500 },
    );
  }
}
