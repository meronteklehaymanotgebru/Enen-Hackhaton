import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

export async function POST(req: Request) {

  try {

    const { panicId, helperId, status } = await req.json()

    if (!panicId || !helperId || !status) {
      return NextResponse.json(
        { error: "panicId, helperId and status required" },
        { status: 400 }
      )
    }

    const allowedStatuses = [
      "accepted",
      "responding",
      "arrived",
      "resolved"
    ]

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("panic_helpers")
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq("panic_id", panicId)
      .eq("helper_id", helperId)

    if (error) throw error

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
