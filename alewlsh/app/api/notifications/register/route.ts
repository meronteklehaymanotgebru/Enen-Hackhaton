import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

export async function POST(req: Request) {

  const { userId, token } = await req.json()

  if (!userId || !token) {
    return NextResponse.json(
      { error: "Missing fields" },
      { status: 400 }
    )
  }

  await supabase
    .from("notification_tokens")
    .upsert({
      user_id: userId,
      fcm_token: token
    })

  return NextResponse.json({
    success: true
  })
}
