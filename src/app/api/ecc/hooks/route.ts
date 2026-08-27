import { NextResponse } from "next/server";
import { getHooks } from "@/lib/ecc-scanner";

export const dynamic = "force-static";

export async function GET() {
  try {
    const data = await getHooks();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read hooks" },
      { status: 500 },
    );
  }
}
