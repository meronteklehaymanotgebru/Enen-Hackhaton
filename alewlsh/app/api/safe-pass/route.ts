import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPremium } from '@/lib/helpers'
import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if premium
    const premium = await isPremium(user.id)
    if (!premium) {
      return NextResponse.json(
        { error: 'Premium subscription required' },
        { status: 403 }
      )
    }

    const { startLat, startLng, endLat, endLng } = await req.json()

    if (!startLat || !startLng || !endLat || !endLng) {
      return NextResponse.json(
        { error: 'Start and end coordinates are required' },
        { status: 400 }
      )
    }

    // Basic risk calculation (placeholder - could use external APIs for crime data, etc.)
    const riskScore = Math.random() * 0.5 + 0.1 // 0.1 to 0.6

    let aiAnalysis: any = null

    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'Analyze the safety risk of walking this route based on general knowledge of urban safety, time of day, and population density. Provide a JSON response with risk factors and recommendations.'
            },
            {
              role: 'user',
              content: `Route from (${startLat}, ${startLng}) to (${endLat}, ${endLng}). Current time: ${new Date().toISOString()}.`
            }
          ],
          response_format: { type: 'json_object' }
        })

        aiAnalysis = JSON.parse(completion.choices[0].message.content || '{}')
      } catch (error) {
        console.error('OpenAI error:', error)
        // Continue without AI analysis
      }
    }

    // Insert safe pass route
    const { data, error } = await supabase
      .from('safe_pass_routes')
      .insert({
        user_id: user.id,
        start_loc: `POINT(${startLng} ${startLat})`,
        end_loc: `POINT(${endLng} ${endLat})`,
        risk_score: riskScore,
        ai_analysis: aiAnalysis,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      route: data,
      riskScore,
      aiAnalysis,
    })

  } catch (error) {
    console.error('Safe pass POST error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}