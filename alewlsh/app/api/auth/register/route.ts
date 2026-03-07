import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ContactType = {
  name: string
  phone: string
  relationship?: string
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, name, phone, birthDate, contacts } = body

    // Input validation
    if (!email || !password || !name || !phone || !birthDate) {
      return NextResponse.json(
        { error: 'Email, password, name, phone, and birth date are required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: 'At least one emergency contact is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone,
        },
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Registration failed' },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    // Insert profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        birth_date: birthDate,
      })

    if (profileError) {
      // Clean up auth user if profile insert fails
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      )
    }

    // Save emergency contacts (limit enforced by RLS)
    const contactRows = (contacts as ContactType[])
      .slice(0, 2) // Client-side limit, but RLS will enforce
      .map((c) => ({
        user_id: userId,
        name: c.name,
        phone: c.phone,
        relationship: c.relationship,
      }))

    if (contactRows.length > 0) {
      const { error: contactError } = await supabase
        .from('emergency_contacts')
        .insert(contactRows)

      if (contactError) {
        return NextResponse.json(
          { error: 'Failed to save emergency contacts' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      message: 'Registration successful',
      userId,
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
