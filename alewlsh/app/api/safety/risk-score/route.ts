// app/api/safety/risk-score/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/services/supabase";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function buildEmpatheticPrompt(
  lat: number, 
  lng: number, 
  riskScore: number, 
  hour: number, 
  dayOfWeek: number,
  isWeekend: boolean,
  isNight: boolean
): string {
  const timeContext = isNight ? 'late night/early morning' : 'daytime';
  const dayContext = isWeekend ? 'weekend' : 'weekday';
  
  return `You are a compassionate safety assistant for women in Addis Ababa, Ethiopia.
  
Analyze the safety risk for a location at latitude ${lat}, longitude ${lng}.

Context:
• Time: ${timeContext} (hour ${hour})
• Day: ${dayContext} (day ${dayOfWeek})
• Historical alerts nearby: ${riskScore} incidents within 1km

Please provide a JSON response with EXACTLY this structure:
{
  "multiplier": number between 0.5 and 2.0,
  "reason": "brief, empathetic explanation in plain language",
  "confidence": number between 0.0 and 1.0,
  "safetyTip": "one practical, empowering safety suggestion"
}

Guidelines:
• Be empathetic, not alarming. Use "you" language.
• If risk is high, focus on actionable steps, not fear.
• If risk is low, acknowledge it but remind to stay aware.
• Keep reason under 150 characters.
• safetyTip should be specific to Addis Ababa context.

Example output:
{
  "multiplier": 1.4,
  "reason": "Evening commute + weekend crowds increase unpredictability",
  "confidence": 0.82,
  "safetyTip": "Stick to well-lit main roads like Bole Rd when possible"
}

Return ONLY valid JSON. No extra text.`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get("lat") || "");
    const lng = parseFloat(url.searchParams.get("lng") || "");
    const isPremium = url.searchParams.get("premium") === "true";

    if (!lat || !lng) {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    const { data: alerts } = await supabase
      .from("panic_alerts")
      .select("latitude, longitude, created_at");

    let baseRiskScore = 0;
    for (const alert of alerts || []) {
      const dist = distanceKm(lat, lng, alert.latitude, alert.longitude);
      if (dist <= 1) {
        baseRiskScore += 1;
      }
    }

    // Time-based factors
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isNight = hour < 6 || hour > 22;

    let aiRiskMultiplier = 1;
    let aiReason: string | undefined;
    let aiConfidence: number | undefined;
    let aiSafetyTip: string | undefined;

    if (isPremium) {
      try {
        const prompt = buildEmpatheticPrompt(lat, lng, baseRiskScore, hour, dayOfWeek, isWeekend, isNight);
        
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful, empathetic safety assistant. Always respond with valid JSON only." },
            { role: "user", content: prompt }
          ],
          max_tokens: 300,
          temperature: 0.3,
        });

        const aiContent = response.choices[0]?.message?.content?.trim() || "{}";
        
        let aiData;
        try {
          const cleanJson = aiContent.replace(/```json\n?|\n?```/g, '').trim();
          aiData = JSON.parse(cleanJson);
        } catch (parseError) {
          console.warn("AI JSON parse failed, using fallback:", parseError);
          aiData = {
            multiplier: 1.0,
            reason: "Unable to analyze context",
            confidence: 0.5,
            safetyTip: "Stay aware of your surroundings"
          };
        }
        
        const multiplier = Math.max(0.5, Math.min(2.0, aiData.multiplier || 1.0));
        const confidence = Math.max(0.0, Math.min(1.0, aiData.confidence || 0.5));
        
        aiRiskMultiplier = multiplier;
        aiReason = aiData.reason;
        aiConfidence = confidence;
        aiSafetyTip = aiData.safetyTip;
        
      } catch (aiError) {
        console.warn("AI risk analysis failed:", aiError);
        // Fallback to base risk
      }
    }

    const finalRisk = baseRiskScore * aiRiskMultiplier;
    let color: 'green' | 'orange' | 'red' = "green";
    if (finalRisk >= 4) color = "red";
    else if (finalRisk >= 2) color = "orange";

    return NextResponse.json({
      risk: Math.round(finalRisk * 10) / 10,
      color,
      aiMultiplier: isPremium ? aiRiskMultiplier : undefined,
      aiReason: isPremium ? aiReason : undefined,
      aiConfidence: isPremium ? aiConfidence : undefined,
      aiSafetyTip: isPremium ? aiSafetyTip : undefined
    });

  } catch (error) {
    console.error("Risk calculation error:", error);
    return NextResponse.json({ error: "Risk calculation failed" }, { status: 500 });
  }
}