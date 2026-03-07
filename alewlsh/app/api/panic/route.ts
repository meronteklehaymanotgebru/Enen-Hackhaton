import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSignedUploadUrl } from '@/lib/helpers'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { latitude, longitude, message } = await req.json()

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    // Create panic alert
    const { data: alertData, error: insertError } = await supabase
      .from('panic_alerts')
      .insert({
        user_id: user.id,
        location: `POINT(${longitude} ${latitude})`, // Note: lng lat for PostGIS
        status: 'active',
      })
      .select()
      .single()

    if (insertError || !alertData) {
      return NextResponse.json(
        { error: 'Failed to create panic alert' },
        { status: 500 }
      )
    }

    // Generate signed upload URLs for 15-second chunks (assume up to 10 chunks)
    const uploadUrls: { url: string; path: string; chunkNumber: number }[] = []
    const bucket = 'recordings'

    for (let i = 1; i <= 10; i++) {
      const path = `panic-${alertData.id}/chunk-${i}.webm` // or appropriate format
      try {
        const signedUrl = await getSignedUploadUrl(bucket, path)
        uploadUrls.push({ url: signedUrl, path, chunkNumber: i })
      } catch (error) {
        console.error(`Failed to generate URL for chunk ${i}:`, error)
        // Continue with available URLs
      }
    }

    // TODO: Send notifications to helpers and contacts (similar to existing logic, but update to use new client)

    return NextResponse.json({
      alertId: alertData.id,
      uploadUrls,
    })

  } catch (error) {
    console.error('Panic POST error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}