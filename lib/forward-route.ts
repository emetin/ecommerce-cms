// lib/forward-route.ts
import type { NextRequest } from "next/server";

type ForwardOptions = {
  pathname: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  searchParams?: Record<string, string | undefined>;
  body?: unknown;
};

export async function forwardRoute(
  request: NextRequest,
  options: ForwardOptions
) {
  const { pathname, method = "GET", searchParams, body } = options;

  const url = new URL(pathname, request.url);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === "string" && value.length > 0) {
        url.searchParams.set(key, value);
      }
    }
  }

  const headers = new Headers();

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  headers.set("accept", "application/json");

  let payload: BodyInit | undefined;

  if (body !== undefined) {
    headers.set("content-type", "application/json");
    payload = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: payload,
    cache: "no-store",
  });

  const text = await response.text();
  const contentType =
    response.headers.get("content-type") || "application/json; charset=utf-8";

  return new Response(text, {
    status: response.status,
    headers: {
      "content-type": contentType,
    },
  });
}