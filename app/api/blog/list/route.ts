import { NextResponse } from "next/server";
import { getSheetData } from "../../../../lib/sheets";

type BlogItem = Record<string, string>;

const ALLOWED_STATUS = ["published", "draft", "archived"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const statusParam = String(searchParams.get("status") || "")
      .trim()
      .toLowerCase();

    const posts = (await getSheetData("blog")) as BlogItem[];

    let items = posts.filter((item) => item && item.slug);

    if (statusParam) {
      if (!ALLOWED_STATUS.includes(statusParam)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid status filter.",
          },
          { status: 400 }
        );
      }

      items = items.filter(
        (item) =>
          String(item.status || "").trim().toLowerCase() === statusParam
      );
    }

    return NextResponse.json(
      {
        ok: true,
        total: items.length,
        items,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch blog posts.",
      },
      { status: 500 }
    );
  }
}