import { NextResponse, type NextRequest } from "next/server";
import {
  searchOsIndex,
  type OsSearchCategory,
} from "@/lib/os/search";

const CATEGORIES: OsSearchCategory[] = [
  "client",
  "instructor",
  "material",
  "video",
  "case",
  "event",
];

function isCategory(value: string): value is OsSearchCategory {
  return (CATEGORIES as string[]).includes(value);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q") ?? "";
    const categoryParam = searchParams.get("category");
    const category =
      categoryParam && isCategory(categoryParam) ? categoryParam : undefined;

    const results = searchOsIndex(q, {
      categories: category ? [category] : undefined,
      limit: 24,
    });

    return NextResponse.json({ results, query: q });
  } catch (error) {
    console.error("[api/os/search]", error);
    return NextResponse.json(
      { error: "検索に失敗しました" },
      { status: 500 },
    );
  }
}
