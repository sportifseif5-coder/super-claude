import { NextResponse } from "next/server";
import { getHooksRaw } from "@/lib/ecc-scanner";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await getHooksRaw();
    return NextResponse.json({ content: raw, language: "json" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read raw hooks" },
      { status: 500 },
    );
  }
}
