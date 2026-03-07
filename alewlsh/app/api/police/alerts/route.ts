import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if police
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_police')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_police) {
      return NextResponse.json(
        { error: 'Police access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const policeLat = parseFloat(searchParams.get('lat') || '')
    const policeLng = parseFloat(searchParams.get('lng') || '')

    if (isNaN(policeLat) || isNaN(policeLng)) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    // Get nearby active alerts (within 5km)
    const { data: alerts, error: alertsError } = await supabase
      .from('panic_alerts')
      .select(`
        id,
        location,
        created_at,
        status
      `)
      .eq('status', 'active')
      .filter('ST_DWithin(location, ST_Point(:lng, :lat)::geography, 5000)', 'eq', true)

    if (alertsError) {
      return NextResponse.json(
        { error: alertsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ alerts: alerts || [] })

  } catch (error) {
    console.error('Police alerts GET error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}