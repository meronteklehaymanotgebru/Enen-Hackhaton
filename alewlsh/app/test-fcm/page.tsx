"use client"

import { useEffect } from "react"
import { requestFCMToken } from "@/services/firebaseClient"
import axios from "axios"

export default function TestFCM() {
  useEffect(() => {
    async function runTest() {
      const token = await requestFCMToken()
      if (!token) return

      console.log("Got token, sending test request...")

      await axios.get(`/api/test-fcm?token=${token}`)
      alert("FCM token registered, test sent!")
    }
    runTest()
  }, [])

  return <h2>Testing FCM...</h2>
}
