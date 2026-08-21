import { NextResponse } from "next/server";
import { getCatalog, type CatalogType } from "@/lib/ecc-scanner";

export const dynamic = "force-static";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as CatalogType | null;
    const catalog = await getCatalog();
    if (type && type in catalog) {
      return NextResponse.json({ items: catalog[type] });
    }
    return NextResponse.json(catalog);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read catalog" },
      { status: 500 },
    );
  }
}
