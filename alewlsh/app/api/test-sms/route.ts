import { NextResponse } from "next/server"
import { sendSMS } from "@/services/sms"

export async function GET() {
  await sendSMS(
    "TEST_PHONE_NUMBER",
    "Alewlsh SMS test successful"
  )

  return NextResponse.json({
    success: true
  })
}
