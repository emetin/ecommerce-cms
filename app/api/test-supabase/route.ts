import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("collections")
      .select("id, title, slug, status")
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "Supabase connection failed",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Supabase connection successful",
      data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 }
    );
  }
}