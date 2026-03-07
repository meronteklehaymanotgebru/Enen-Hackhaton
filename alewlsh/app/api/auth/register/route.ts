import { NextResponse } from "next/server"
import { supabase } from "@/services/supabase"
import bcrypt from "bcrypt"

type ContactType = {
  name: string
  phone: string
  relationship?: string
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      name,
      phone,
      password,
      contacts
    } = body

    // ---------- Input Validation ----------
    if (!name || !phone || !password) {
      return NextResponse.json(
        { error: "Name, phone and password are required" },
        { status: 400 }
      )
    }

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: "At least one emergency contact is required" },
        { status: 400 }
      )
    }

    // ---------- Check Duplicate Phone ----------
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: "Phone number already registered" },
        { status: 409 }
      )
    }

    // ---------- Hash Password ----------
    const hashedPassword = await bcrypt.hash(password, 10)

    // ---------- Insert User ----------
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert([
        {
          nickname: name,
          phone,
          password: hashedPassword
        }
      ])
      .select()
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: "User registration failed" },
        { status: 500 }
      )
    }

    const userId = userData.id

    // ---------- Save Emergency Contacts (Max 2) ----------
    const contactRows = (contacts as ContactType[])
      .slice(0, 2)
      .map((c) => ({
        user_id: userId,
        name: c.name,
        phone: c.phone,
        relationship: c.relationship
      }))

    if (contactRows.length > 0) {
      const { error: contactError } = await supabase
        .from("emergency_contacts")
        .insert(contactRows)

      if (contactError) {
        return NextResponse.json(
          { error: "Failed to save emergency contacts" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      message: "Registration successful",
      userId
    })

  } catch (error) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}
