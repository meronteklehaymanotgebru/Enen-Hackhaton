importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js")

const firebaseConfig = {
  apiKey: "AIzaSyAh0ONE-hh73XlsGIKKpgWha0abELBeMgY",
  authDomain: "alewlsh.firebaseapp.com",
  projectId: "alewlsh",
  storageBucket: "alewlsh.firebasestorage.app",
  messagingSenderId: "700476976632",
  appId: "1:700476976632:web:e1b8b08b12a5b82d65ba0d"
}

firebase.initializeApp(firebaseConfig)

const messaging = firebase.messaging()
