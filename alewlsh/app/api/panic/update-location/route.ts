import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

export async function POST(req: Request) {

  try {

    const { panicId, latitude, longitude } = await req.json()

    if (!panicId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("panic_locations")
      .insert({
        panic_id: panicId,
        latitude,
        longitude
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
