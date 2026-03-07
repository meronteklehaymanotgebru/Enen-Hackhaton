import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const R = 6371

  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2

  return 2 * R * Math.asin(Math.sqrt(a))
}

export async function GET(req: Request) {
  try {

    const url = new URL(req.url)

    const lat = parseFloat(url.searchParams.get("lat") || "")
    const lng = parseFloat(url.searchParams.get("lng") || "")

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "lat and lng required" },
        { status: 400 }
      )
    }

    const { data: alerts } = await supabase
      .from("panic_alerts")
      .select("latitude, longitude, created_at")

    let riskScore = 0

    for (const alert of alerts || []) {

      const dist = distanceKm(
        lat,
        lng,
        alert.latitude,
        alert.longitude
      )

      if (dist <= 1) {
        riskScore += 1
      }
    }

    let color = "green"

    if (riskScore >= 4) color = "red"
    else if (riskScore >= 2) color = "orange"

    return NextResponse.json({
      risk: riskScore,
      color
    })

  } catch {
    return NextResponse.json(
      { error: "Risk calculation failed" },
      { status: 500 }
    )
  }
}
