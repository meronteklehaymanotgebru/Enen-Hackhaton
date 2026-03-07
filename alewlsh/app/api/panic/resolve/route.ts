import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

export async function POST(req: Request) {

  const { alertId } = await req.json()

  if (!alertId) {
    return NextResponse.json(
      { error: "alertId required" },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from("panic_alerts")
    .update({ status: "resolved" })
    .eq("id", alertId)

  if (error) {
    return NextResponse.json({ error: error.message })
  }

  return NextResponse.json({
    success: true
  })
}
