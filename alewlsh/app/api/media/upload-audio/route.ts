import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"

export async function POST(req: Request) {
  try {

    const formData = await req.formData()
    const file = formData.get("audio") as File

    if (!file) {
      return NextResponse.json(
        { error: "Audio file required" },
        { status: 400 }
      )
    }

    const fileName = `${Date.now()}-${file.name}`

    const { error } = await supabase.storage
      .from("emergency-audio")
      .upload(fileName, file)

    if (error) throw error

    const { data } = supabase.storage
      .from("emergency-audio")
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      audioUrl: data.publicUrl
    })

  } catch (err) {
    return NextResponse.json({
      success: false
    })
  }
}
