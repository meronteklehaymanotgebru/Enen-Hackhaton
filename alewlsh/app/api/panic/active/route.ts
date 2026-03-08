// app/api/panic/active/route.ts
import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

export async function GET() {
  try {
    // ✅ Simpler query: join users table without specifying foreign key name
    const { data, error } = await supabase
      .from("panic_alerts")
      .select(`
        *,
        users!inner (
          nickname
        )
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Fetch active alerts error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      
      return NextResponse.json(
        { error: "Failed to fetch alerts. Please try again." },
        { status: 503 }
      )
    }

    // Transform data for frontend
    const alerts = (data || []).map(alert => ({
      id: alert.id,
      userId: alert.user_id,
      // ✅ Safe access to nested nickname
      nickname: alert.users?.nickname || 'Anonymous',
      latitude: alert.latitude,
      longitude: alert.longitude,
      message: alert.message,
      hasAudio: !!alert.audio_url,
      audioUrl: alert.audio_url,
      status: alert.status,
      createdAt: alert.created_at,
      recordingActive: alert.recording_active
    }))

    return NextResponse.json({ alerts })

  } catch (error) {
    console.error("Active alerts endpoint error:", error)
    
    if (error instanceof Error && error.message.includes('fetch failed')) {
      return NextResponse.json(
        { error: "Network error. Please check your connection and try again." },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}