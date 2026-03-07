import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

export async function POST(req: Request) {

  const { userId, name, phone } = await req.json()

  if (!userId || !name || !phone) {
    return NextResponse.json(
      { error: "Missing fields" },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from("emergency_contacts")
    .insert({
      user_id: userId,
      name,
      phone
    })

  if (error) {
    return NextResponse.json({ error: error.message })
  }

  return NextResponse.json({
    success: true
  })
}
