import { NextResponse } from "next/server";
import { getItemDetail } from "@/lib/ecc-scanner";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    if (!path) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }
    const detail = await getItemDetail(path);
    if (!detail) {
      return NextResponse.json({ error: "File not found or outside repo" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read detail" },
      { status: 500 },
    );
  }
}
