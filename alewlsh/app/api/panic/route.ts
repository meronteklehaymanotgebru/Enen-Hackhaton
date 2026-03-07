// app/api/panic/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/services/supabase";
import { messaging } from "@/services/firebaseAdmin";
import { sendSMS } from "@/services/sms";

// Type definitions for this route
type PanicRequestBody = {
  userId: string;
  latitude: number;
  longitude: number;
  message?: string | null;
  audio?: File | null;
};

type HelperRecord = {
  user_id: string;
};

type ContactRecord = {
  phone: string;
  name?: string;
};

type TokenRecord = {
  fcm_token: string;
};

const MAX_HELPERS = 3;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    // Parse and validate required fields
    const userId = formData.get("userId") as string;
    const latitudeStr = formData.get("latitude") as string;
    const longitudeStr = formData.get("longitude") as string;
    const message = formData.get("message") as string | null;
    const audioFile = formData.get("audio") as File | null;

    const latitude = parseFloat(latitudeStr);
    const longitude = parseFloat(longitudeStr);

    if (!userId || isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: "Missing required fields: userId, latitude, longitude" },
        { status: 400 }
      );
    }

    // -------------------------
    // 1. Upload Audio (Optional)
    // -------------------------
    let audioUrl: string | null = null;

    if (audioFile && audioFile.size > 0) {
      const fileName = `emergency-${Date.now()}-${audioFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      const { error: uploadError } = await supabase.storage
        .from("emergency-audio")
        .upload(fileName, audioFile, {
          contentType: audioFile.type || 'audio/wav',
          upsert: false
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("emergency-audio")
        .getPublicUrl(fileName);

      audioUrl = urlData?.publicUrl || null;
    }

    // -------------------------
    // 2. Save Panic Alert to Database
    // -------------------------
    const { data: alertData, error: insertError } = await supabase
      .from("panic_alerts")
      .insert({
        user_id: userId,
        latitude,
        longitude,
        status: "active",
        message: message?.trim() || null,
        audio_url: audioUrl
      })
      .select()
      .single();

    if (insertError || !alertData) {
      console.error("Database insert error:", insertError);
      throw insertError || new Error("Failed to create alert");
    }

    // -------------------------
    // 3. Find Nearby Helpers (via RPC)
    // -------------------------
    const { data: helpers, error: helpersError } = await supabase.rpc(
      "get_nearby_helpers",
      {
        panic_lat: latitude,
        panic_lng: longitude,
        max_helpers: MAX_HELPERS
      }
    );

    if (helpersError) {
      console.warn("Helpers query warning:", helpersError);
      // Continue anyway - helpers are optional
    }

    // -------------------------
    // 4. Get User's Emergency Contacts
    // -------------------------
    const { data: contacts, error: contactsError } = await supabase
      .from("emergency_contacts")
      .select("phone, name")
      .eq("user_id", userId);

    if (contactsError) {
      console.warn("Contacts query warning:", contactsError);
    }

    // -------------------------
    // 5. Prepare Notification Content
    // -------------------------
    const locationLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const alertSummary = message 
      ? `Alert: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`
      : audioUrl 
        ? "Alert: Voice message received" 
        : "Alert: Emergency SOS activated";

    // -------------------------
    // 6. Notify Helpers via FCM Push Notifications
    // -------------------------
    if (helpers && helpers.length > 0) {
      const helperIds = (helpers as HelperRecord[]).map(h => h.user_id);

      const { data: tokensData } = await supabase
        .from("notification_tokens")
        .select("fcm_token")
        .in("user_id", helperIds);

      const tokens = (tokensData as TokenRecord[])
        ?.map(t => t.fcm_token)
        .filter(Boolean) || [];

      if (tokens.length > 0) {
        try {
          await messaging.sendEachForMulticast({
            tokens,
            notification: {
              title: "🚨 Emergency Alert Nearby",
              body: alertSummary,
            },
            data: {
              alertId: alertData.id,
              latitude: latitude.toString(),
              longitude: longitude.toString(),
              audioUrl: audioUrl || '',
              locationLink,
              type: 'emergency_alert'
            }
          });
          console.log(`✅ FCM sent to ${tokens.length} helpers`);
        } catch (fcmError) {
          console.error("FCM send error:", fcmError);
          // Continue - FCM failure shouldn't block SMS
        }
      }
    }

    // -------------------------
    // 7. Send SMS to Emergency Contacts via Africa's Talking
    // -------------------------
    if (contacts && contacts.length > 0) {
      let smsText = `ALEWLSH ALERT: Help needed. Location: ${locationLink}`;
      
      if (message && message.trim()) {
        smsText += ` | Message: ${message.trim()}`;
      }
      if (audioUrl) {
        smsText += ` | Audio: ${audioUrl}`;
      }

      // Send to each contact
      for (const contact of contacts as ContactRecord[]) {
        if (contact.phone && contact.phone.startsWith('+')) {
          try {
            await sendSMS(contact.phone, smsText);
            console.log(`✅ SMS sent to ${contact.phone}`);
          } catch (smsError) {
            console.error(`SMS error for ${contact.phone}:`, smsError);
            // Continue to next contact
          }
        }
      }
    }

    // -------------------------
    // 8. Return Success Response
    // -------------------------
    return NextResponse.json({
      success: true,
      alertId: alertData.id,
      notified: {
        helpers: helpers?.length || 0,
        contacts: contacts?.length || 0
      },
      location: { latitude, longitude },
      hasAudio: !!audioUrl,
      hasMessage: !!message?.trim()
    }, { status: 200 });

  } catch (error) {
    console.error("❌ PANIC ROUTE ERROR:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}