import { NextResponse } from "next/server"
import { messaging } from "@/services/firebaseAdmin"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get("token")

  if (!token) {
    return NextResponse.json({ success: false, error: "No token provided" })
  }

  try {
    await messaging.send({
      token,
      notification: {
        title: "FCM Test",
        body: "Firebase Cloud Messaging working"
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: "Failed to send FCM" })
  }
}
