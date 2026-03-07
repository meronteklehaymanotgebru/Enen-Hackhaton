import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ users: data })

  } catch (err) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}
