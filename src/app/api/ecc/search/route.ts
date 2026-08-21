import { NextResponse } from "next/server";
import { getSearchIndex } from "@/lib/ecc-scanner";

export const dynamic = "force-static";

export async function GET() {
  try {
    const entries = await getSearchIndex();
    return NextResponse.json({ entries });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read search index" },
      { status: 500 },
    );
  }
}
