import { NextResponse } from "next/server";
import { getFile, getArchitectureSections, NOTABLE_FILES } from "@/lib/ecc-scanner";

export const dynamic = "force-static";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");
    if (filePath) {
      const file = await getFile(filePath);
      if (!file) {
        return NextResponse.json({ error: "File not found or outside repo" }, { status: 404 });
      }
      return NextResponse.json(file);
    }
    // No path → return architecture sections + notable file index
    return NextResponse.json({
      sections: getArchitectureSections(),
      notableFiles: NOTABLE_FILES,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read file" },
      { status: 500 },
    );
  }
}
