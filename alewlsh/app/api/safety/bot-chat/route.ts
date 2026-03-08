// app/api/safety/bot-chat/route.ts
import { NextResponse } from "next/server";
import OpenAI, { APIError, APIConnectionError, RateLimitError } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// === Type Definitions ===

interface BotChatRequest {
  message: string;
  location?: { lat: number; lng: number };
  isPremium: boolean;
}

interface BotChatResponse {
  reply: string;
  source: 'faq' | 'ai' | 'fallback'; // ← Track which layer responded
}

interface FAQEntry {
  keywords: string[];
  question: string;
  answer: string;
  answerPremium?: string; // Different answer for premium users
}

// === FAQ Knowledge Base (Layer 1) ===
// Add your specific Q&A pairs here

const FAQ_DATABASE: FAQEntry[] = [
  {
    keywords: ["sos", "emergency", "panic", "help", "danger"],
    question: "How do I use the SOS feature?",
    answer: "Tap the big red SOS button on the Emergency page. It instantly sends your location to your emergency contacts via SMS. Hold it for 3 seconds to avoid accidental triggers. 💜",
    answerPremium: "Tap the SOS button to alert unlimited contacts with continuous location tracking. Premium users also get auto-voice evidence recording. 💜"
  },
    {
    keywords: ["risk score", "risk calculated", "how risk", "risk number", "how do you know", "risk level", "safety score"],
    question: "How is risk score calculated?",
    answer: "Risk = alerts within 1km + time of day (night=higher) + AI context (weekends/holidays). Score 1-5: 1=low, 5=high. Real data, updated live. 💜",
    answerPremium: "Risk = real panic alerts within 1km + time multiplier (night/weekend) + AI analysis of crowds/holidays. Premium gets real-time AI updates as conditions change. 💜"
  },
  {
    keywords: ["contact", "contacts", "emergency contact", "add contact"],
    question: "How do I add emergency contacts?",
    answer: "Go to Settings → Emergency Contacts. Free users can add 2 contacts. They'll receive your location via SMS when you trigger SOS. 💜",
    answerPremium: "Go to Settings → Emergency Contacts. Premium users can add unlimited contacts with continuous location tracking every 60 seconds. 💜"
  },
  {
    keywords: ["premium", "upgrade", "pay", "price", "cost", "subscription"],
    question: "What do I get with Premium?",
    answer: "Premium (99 ETB/month) includes: unlimited emergency contacts, AI-powered Safe Path, 5km helper radius, continuous location tracking, and 90-day audio storage. Less than one macchiato! ☕💜",
    answerPremium: "You're already Premium! Enjoy unlimited contacts, AI Safe Path, 5km helper radius, and priority support. Thank you for supporting women's safety! 💜"
  },
  {
    keywords: ["safe path", "route", "safe route", "navigation"],
    question: "How does Safe Path work?",
    answer: "Safe Path shows you the safest route avoiding high-risk zones. Click Start → End on the map, then 'Find Safe Path'. Premium users get AI-powered risk analysis with real-time updates. 💜",
    answerPremium: "Your Premium Safe Path uses AI to analyze time, day, crowds, and historical alerts. It dynamically reroutes you away from high-risk zones. Open Safe Path to plan your journey! 💜"
  },
  {
    keywords: ["audio", "recording", "evidence", "record"],
    question: "Does the app record audio automatically?",
    answer: "Yes! When you trigger SOS, the app automatically records 15-second audio clips and saves them securely for 7 days (free) or 90 days (premium). This can be used as evidence. 💜",
    answerPremium: "Yes! Premium users get 90-day audio storage with high-quality recording. All audio is encrypted and only accessible to you and authorities if you file a report. 💜"
  },
  {
    keywords: ["police", "authorities", "report", "file"],
    question: "Can police see my alerts?",
    answer: "Yes! We're partnering with local police stations. When you trigger SOS, nearby police can receive alerts through their portal. Your name and location are shared for faster response. 💜",
    answerPremium: "Yes! Premium users get priority police notification with detailed evidence packages (audio, location history, timeline). We're piloting with Addis Ababa police stations. 💜"
  },
  {
    keywords: ["free", "cost", "money", "pay"],
    question: "Is Alewlsh free to use?",
    answer: "Core safety features (SOS, 2 contacts, basic alerts) are FREE forever. Premium (99 ETB/month) unlocks advanced features like unlimited contacts and AI Safe Path. 💜",
    answerPremium: "You're enjoying Premium! Core safety is always free for all users. Your Premium subscription supports our mission to keep Ethiopian women safe. 💜"
  },
  {
    keywords: ["location", "tracking", "share location", "gps"],
    question: "How does location sharing work?",
    answer: "When you trigger SOS, your exact GPS location is sent to emergency contacts via SMS with a Google Maps link. Free users: one-time share. Premium: continuous tracking every 60 seconds. 💜",
    answerPremium: "Your location is shared in real-time with all emergency contacts, updating every 60 seconds during an active alert. You can stop sharing anytime. 💜"
  },
  {
    keywords: ["delete", "account", "remove", "cancel"],
    question: "How do I delete my account?",
    answer: "Go to Settings → Account → Delete Account. All your data will be permanently removed within 30 days. Your safety is your choice. 💜",
    answerPremium: "Go to Settings → Account → Delete Account. Your Premium subscription will be cancelled and all data removed within 30 days. Contact support for refund questions. 💜"
  },
  {
    keywords: ["followed", "stalk", "stalking", "harass", "harassment"],
    question: "What should I do if I feel followed?",
    answer: "1) Go to a busy, well-lit place immediately. 2) Call a trusted contact. 3) Use Alewlsh SOS if you feel threatened. 4) Note landmarks and descriptions. You deserve to feel safe. 💜",
    answerPremium: "1) Go to a busy place now. 2) Trigger SOS for instant alerts. 3) Your location is tracked continuously. 4) Audio evidence is automatically recorded. Help is on the way. 💜"
  }
];

// === Type Guards ===

function isOpenAIError(error: unknown): error is APIError {
  return (
    error instanceof APIError ||
    (typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      'code' in error)
  );
}

function isErrorWithProperties(error: unknown): error is Record<string, unknown> {
  return typeof error === 'object' && error !== null;
}

// === Layer 1: FAQ Matching ===

function findFAQMatch(message: string, isPremium: boolean): string | null {
  const lower = message.toLowerCase();
  
  for (const faq of FAQ_DATABASE) {
    // Check if any keyword matches
    const hasMatch = faq.keywords.some(keyword => 
      lower.includes(keyword.toLowerCase())
    );
    
    if (hasMatch) {
      console.log('✅ FAQ match found:', faq.question);
      return isPremium && faq.answerPremium ? faq.answerPremium : faq.answer;
    }
  }
  
  return null;
}

// === Layer 2: OpenAI Dynamic Prompt ===

function buildEmpatheticPrompt(
  message: string,
  location?: { lat: number; lng: number },
  isPremium?: boolean
): string {
  const locationContext = location 
    ? `User is near latitude ${location.lat}, longitude ${location.lng} in Addis Ababa.`
    : "User is in Addis Ababa, Ethiopia.";

  const premiumContext = isPremium 
    ? "User has Premium access: you can provide detailed, personalized advice."
    : "User is on Free tier: keep advice general and encourage Premium for personalized help.";

  return `You are Safety Sister, a compassionate, empowering AI assistant for women in Ethiopia.

${locationContext}
${premiumContext}

User asked: "${message}"

Respond with:
• Empathetic, warm tone (use "you", "love", "sister" naturally)
• Practical, actionable safety advice
• If risk-related, mention Alewlsh features (SOS, Safe Path, contacts)
• If Premium: give specific, location-aware advice
• If Free: give general advice + gently mention Premium benefits
• Keep response under 300 characters
• End with a supportive emoji 💜✨

Your reply:`;
}

// === Layer 3: Minimal Fallback ===

function getMinimalFallbackResponse(message: string, isPremium: boolean): string {
  // This is ONLY used when OpenAI API is unavailable
  const baseReply = "I'm here to help you stay safe 💜 ";
  
  if (message.toLowerCase().includes("sos") || message.toLowerCase().includes("emergency")) {
    return baseReply + "If you're in immediate danger, please tap the SOS button now. Your location will be sent to emergency contacts instantly. ✨";
  }
  
  if (message.toLowerCase().includes("premium") || message.toLowerCase().includes("upgrade")) {
    return isPremium
      ? baseReply + "You're already a Premium member! Enjoy AI-powered insights and unlimited contacts. ✨"
      : baseReply + "Premium (99 ETB/month) unlocks AI risk analysis and unlimited emergency contacts. Upgrade anytime in Settings. ✨";
  }
  
  return baseReply + "For personalized safety advice, I use AI analysis. If I'm not responding perfectly, it may be a temporary connection issue. Try again, or use the SOS button if you need immediate help. ✨";
}

// === Main Handler ===

export async function POST(req: Request): Promise<NextResponse<BotChatResponse | { error: string }>> {
  try {
    const body: BotChatRequest = await req.json();
    const { message, location, isPremium } = body;

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // === LAYER 1: FAQ Match (Instant, No API Cost) ===
    const faqAnswer = findFAQMatch(message, isPremium);
    if (faqAnswer) {
      return NextResponse.json<BotChatResponse>({ 
        reply: faqAnswer,
        source: 'faq'
      });
    }

    // === LAYER 2: OpenAI Dynamic Prompt (Flexible) ===
    try {
      const prompt = buildEmpatheticPrompt(message, location, isPremium);

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are Safety Sister: warm, empowering, practical. Always respond concisely with empathy." },
          { role: "user", content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      const reply: string | undefined = response.choices[0]?.message?.content?.trim();
      
      if (reply) {
        return NextResponse.json<BotChatResponse>({ 
          reply,
          source: 'ai'
        });
      }
      
      throw new Error("Empty response from OpenAI");
      
    } catch (openaiError: unknown) {
      // Handle OpenAI errors gracefully
      let errorCode: string | null = null;
      let errorStatus: number | null = null;
      
      if (isOpenAIError(openaiError)) {
        errorCode = openaiError.code ?? null;
        errorStatus = openaiError.status ?? null;
      } else if (isErrorWithProperties(openaiError)) {
        errorCode = typeof openaiError.code === 'string' ? openaiError.code : null;
        errorStatus = typeof openaiError.status === 'number' ? openaiError.status : null;
      }
      
      console.warn("OpenAI error (using fallback):", {
        code: errorCode,
        status: errorStatus
      });
      
      // Fall through to Layer 3
    }

    // === LAYER 3: Minimal Fallback (When OpenAI Fails) ===
    console.log('⚠️ Using fallback response (OpenAI unavailable)');
    const reply: string = getMinimalFallbackResponse(message, isPremium);
    return NextResponse.json<BotChatResponse>({ 
      reply,
      source: 'fallback'
    });

  } catch (error: unknown) {
    console.error("Bot chat unexpected error:", error);
    
    return NextResponse.json<BotChatResponse>({ 
      reply: "I'm here for you 💜 If you're in immediate danger, please use the SOS button or call 911. For general safety questions, try again in a moment. ✨",
      source: 'fallback'
    });
  }
}