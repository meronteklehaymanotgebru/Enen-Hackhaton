import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

const TIME_MULTIPLIERS = [
  { start: 0, end: 6, factor: 2.0 },
  { start: 6, end: 18, factor: 1.0 },
  { start: 18, end: 24, factor: 1.5 }
]

function getTimeMultiplier(date: Date) {
  const hour = date.getHours()

  return TIME_MULTIPLIERS.find(
    t => hour >= t.start && hour < t.end
  )?.factor || 1
}

export async function GET() {
  try {

    const { data: alerts, error } = await supabase
      .from("panic_alerts")
      .select("latitude, longitude, created_at")

    if (error) throw error

    const heatmap = (alerts || []).map(a => ({
      lat: a.latitude,
      lng: a.longitude,
      risk: getTimeMultiplier(new Date(a.created_at))
    }))

    return NextResponse.json({ heatmap })

  } catch (err) {

    return NextResponse.json(
      { error: "Heatmap generation failed" },
      { status: 500 }
    )
  }
}
