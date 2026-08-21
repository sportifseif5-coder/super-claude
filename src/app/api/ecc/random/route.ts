import { NextResponse } from "next/server";
import { getRandomItem } from "@/lib/ecc-scanner";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const item = await getRandomItem();
    if (!item) {
      return NextResponse.json({ error: "No items available" }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to pick random item" },
      { status: 500 },
    );
  }
}
