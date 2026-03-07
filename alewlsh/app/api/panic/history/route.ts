import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const userId = url.searchParams.get("userId")?.trim()

  if (!userId) {
    return NextResponse.json(
      { error: "userId required" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("panic_alerts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message })
  }

  return NextResponse.json({
    history: data
  })
}
