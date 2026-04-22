// app/api/admin/products/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { forwardRoute } from "../../../../../lib/forward-route";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "Slug gerekli." },
      { status: 400 }
    );
  }

  return forwardRoute(request, {
    pathname: "/api/products/get",
    method: "GET",
    searchParams: { slug },
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const body = await request.json().catch(() => null);

  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "Slug gerekli." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Geçersiz istek gövdesi." },
      { status: 400 }
    );
  }

  return forwardRoute(request, {
    pathname: "/api/products/update",
    method: "PUT",
    body: {
      slug,
      ...body,
    },
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "Slug gerekli." },
      { status: 400 }
    );
  }

  return forwardRoute(request, {
    pathname: "/api/products/delete",
    method: "DELETE",
    body: { slug },
  });
}