import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

export async function GET(req: Request) {

  const url = new URL(req.url)
  const panicId = url.searchParams.get("panicId")?.trim()

  if (!panicId) {
    return NextResponse.json(
      { error: "panicId required" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("panic_helpers")
    .select("*")
    .eq("panic_id", panicId)

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    helpers: data
  })
}
