"use client"

import { initializeApp } from "firebase/app"
import { getMessaging, getToken } from "firebase/messaging"

const firebaseConfig = {
  apiKey: "AIzaSyAh0ONE-hh73XlsGIKKpgWha0abELBeMgY",
  authDomain: "alewlsh.firebaseapp.com",
  projectId: "alewlsh",
  storageBucket: "alewlsh.firebasestorage.app",
  messagingSenderId: "700476976632",
  appId: "1:700476976632:web:e1b8b08b12a5b82d65ba0d"
}

const app = initializeApp(firebaseConfig)

export async function requestFCMToken() {

  if (typeof window === "undefined") return null

  try {

    const messaging = getMessaging(app)

    const permission = await Notification.requestPermission()

    if (permission !== "granted") return null

    const token = await getToken(messaging, {
      vapidKey: "BH4P0qqqW9C2SR1qCF6f9Qa_z4Q723kwNhjq_DRxpFaq1-Xn9RKETD5XxS-7jgnbjHmf9YZNu8JndLwIjTSiHbo"
    })

    console.log("FCM TOKEN:", token)

    return token

  } catch (error) {
    console.error(error)
    return null
  }
}
