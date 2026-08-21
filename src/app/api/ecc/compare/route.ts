import { NextResponse } from "next/server";
import { getCompare } from "@/lib/ecc-scanner";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const a = searchParams.get("a");
    const b = searchParams.get("b");
    if (!a || !b) {
      return NextResponse.json(
        { error: "Missing 'a' or 'b' path parameter" },
        { status: 400 },
      );
    }
    const result = await getCompare(a, b);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to compare" },
      { status: 500 },
    );
  }
}
