import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

export async function POST(req: Request) {

  try {

    const { panicId, helperId } = await req.json()

    if (!panicId || !helperId) {
      return NextResponse.json(
        { error: "panicId and helperId required" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("panic_helpers")
      .insert({
        panic_id: panicId,
        helper_id: helperId,
        status: "accepted"
      })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )

  }
}
