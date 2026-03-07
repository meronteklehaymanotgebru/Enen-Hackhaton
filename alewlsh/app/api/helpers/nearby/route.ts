import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPremium } from '@/lib/helpers'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userLat = parseFloat(searchParams.get('lat') || '')
    const userLng = parseFloat(searchParams.get('lng') || '')

    if (isNaN(userLat) || isNaN(userLng)) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    // Get user's notification radius
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('notification_radius, is_premium')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const radius = profile.notification_radius // in meters

    // Query helpers within radius
    const { data: helpers, error: helpersError } = await supabase.rpc(
      'get_nearby_helpers',
      {
        user_lat: userLat,
        user_lng: userLng,
        radius_meters: radius,
      }
    )

    if (helpersError) {
      return NextResponse.json(
        { error: helpersError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ helpers: helpers || [] })

  } catch (error) {
    console.error('Helpers nearby error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}