// app/api/panic/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/services/supabase";
import { messaging } from "@/services/firebaseAdmin";
import { sendSMS } from "@/services/sms";

// Type definitions
type HelperRecord = { user_id: string };
type ContactRecord = { phone: string; name?: string };
type TokenRecord = { fcm_token: string };

const MAX_HELPERS = 3;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    // Parse required fields
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
    // 1. Upload One-Time Audio (Optional)
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
        audio_url: audioUrl,
        // Recording flags for interval recording
        recording_active: true,
        recording_started_at: new Date().toISOString()
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

      for (const contact of contacts as ContactRecord[]) {
        if (contact.phone && contact.phone.startsWith('+')) {
          try {
            await sendSMS(contact.phone, smsText);
            console.log(`✅ SMS sent to ${contact.phone}`);
          } catch (smsError) {
            console.error(`SMS error for ${contact.phone}:`, smsError);
          }
        }
      }
    }

    // -------------------------
    // 8. Frequent Alerts for Premium Users (Background Task)
    // -------------------------
    const { data: userData } = await supabase
      .from("users")
      .select("is_premium")
      .eq("id", userId)
      .single();

    if (userData?.is_premium) {
      // Start background task for frequent alerts
      // Note: In production, use a proper job queue (e.g., Upstash QStash, Inngest)
      const frequentAlertInterval = setInterval(async () => {
        try {
          // Check if alert is still active
          const { data: currentAlert } = await supabase
            .from("panic_alerts")
            .select("status")
            .eq("id", alertData.id)
            .single();

          if (currentAlert?.status === "active") {
            const locationLink = `https://maps.google.com/?q=${latitude},${longitude}`;
            const alertSummary = message 
              ? `Reminder: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`
              : "Reminder: Emergency SOS still active";

            // Notify helpers again
            if (helpers && helpers.length > 0) {
              const helperIds = (helpers as HelperRecord[]).map(h => h.user_id);
              const { data: tokensData } = await supabase
                .from("notification_tokens")
                .select("fcm_token")
                .in("user_id", helperIds);

              if (tokensData) {
                const tokens = (tokensData as TokenRecord[]).map(t => t.fcm_token).filter(Boolean);
                if (tokens.length > 0) {
                  await messaging.sendEachForMulticast({
                    tokens,
                    notification: {
                      title: "Emergency Reminder",
                      body: alertSummary,
                    },
                    data: {
                      alertId: alertData.id.toString(),
                      location: locationLink,
                    },
                  });
                }
              }
            }

            // Notify contacts again
            if (contacts && contacts.length > 0) {
              let smsText = `ALEWLSH REMINDER: Help still needed. Location: ${locationLink}`;
              if (message && message.trim()) {
                smsText += ` | Message: ${message.trim()}`;
              }

              for (const contact of contacts as ContactRecord[]) {
                if (contact.phone && contact.phone.startsWith('+')) {
                  await sendSMS(contact.phone, smsText);
                }
              }
            }
          } else {
            // Alert resolved, clear interval
            clearInterval(frequentAlertInterval);
          }
        } catch (err) {
          console.error("Frequent alert error:", err);
        }
      }, 60000); // Every 1 minute

      // Clean up interval after 30 minutes max
      setTimeout(() => clearInterval(frequentAlertInterval), 30 * 60 * 1000);
    }

    // -------------------------
    // 9. Return Success Response
    // -------------------------
    return NextResponse.json({
      success: true,
      alertId: alertData.id, // ← CRITICAL: Frontend needs this for interval recording
      notified: {
        helpers: helpers?.length || 0,
        contacts: contacts?.length || 0
      },
      location: { latitude, longitude },
      hasAudio: !!audioUrl,
      hasMessage: !!message?.trim(),
      recordingActive: true // ← Signal frontend to start interval recording
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