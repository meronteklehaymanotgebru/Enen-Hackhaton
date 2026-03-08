import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { panicId, chunkNumber, storagePath, fileType } = await req.json()

    if (!panicId || !chunkNumber || !storagePath || !fileType) {
      return NextResponse.json(
        { error: 'Panic ID, chunk number, storage path, and file type are required' },
        { status: 400 }
      )
    }

    // Verify the panic alert belongs to the user
    const { data: alertData, error: alertError } = await supabase
      .from('panic_alerts')
      .select('id')
      .eq('id', panicId)
      .eq('user_id', user.id)
      .single()

    if (alertError || !alertData) {
      return NextResponse.json(
        { error: 'Panic alert not found or access denied' },
        { status: 404 }
      )
    }

    // Insert recording
    const { data, error } = await supabase
      .from('recordings')
      .insert({
        panic_id: panicId,
        chunk_number: chunkNumber,
        storage_path: storagePath,
        file_type: fileType,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ recording: data })

  } catch (error) {
    console.error('Recordings upload complete error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}