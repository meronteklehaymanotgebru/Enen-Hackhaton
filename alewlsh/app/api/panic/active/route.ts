import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

export async function GET() {

  const { data, error } = await supabase
    .from("panic_alerts")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    alerts: data
  })
}
