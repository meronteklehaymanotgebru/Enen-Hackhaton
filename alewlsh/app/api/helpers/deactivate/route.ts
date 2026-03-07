import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

export async function POST(req: Request) {

  const { userId } = await req.json()

  await supabase
    .from("helpers")
    .update({ is_active: false })
    .eq("user_id", userId)

  return NextResponse.json({
    success: true
  })
}
