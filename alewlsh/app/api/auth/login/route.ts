import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"
import bcrypt from "bcrypt"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { phone, password } = body

    if (!phone || !password) {
      return NextResponse.json(
        { error: "Phone and password required" },
        { status: 400 }
      )
    }

    // Find user by phone
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: "Invalid phone or password" },
        { status: 401 }
      )
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    )

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid phone or password" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      message: "Login successful",
      userId: user.id
    })

  } catch {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}
