import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

export async function POST(req: Request) {

  try {

    const { userId, latitude, longitude } = await req.json()

    if (!userId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      )
    }

    await supabase
      .from("helpers")
      .upsert({
        user_id: userId,
        is_active: true,
        location: `POINT(${longitude} ${latitude})`
      })

    return NextResponse.json({
      success: true
    })

  } catch (error) {

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    })

  }
}
