import { NextResponse } from "next/server";
import { getMcp } from "@/lib/ecc-scanner";

export const dynamic = "force-static";

export async function GET() {
  try {
    const data = await getMcp();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read MCP catalog" },
      { status: 500 },
    );
  }
}
