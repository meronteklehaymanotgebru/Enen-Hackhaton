import admin from "firebase-admin"
import serviceAccount from "../firebase-service-account.json" assert { type: "json" }

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  })
}

export const messaging = admin.messaging()
