import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: { alertId: string } }
) {
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

    const alertId = params.alertId

    // Update alert to accepted
    const { data, error } = await supabase
      .from('panic_alerts')
      .update({
        status: 'accepted',
        police_accepted_by: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('status', 'active')
      .select(`
        *,
        profiles!panic_alerts_user_id_fkey (
          name,
          phone
        )
      `)
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Alert not found or already accepted' },
        { status: 404 }
      )
    }

    return NextResponse.json({ alert: data })

  } catch (error) {
    console.error('Police accept error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}