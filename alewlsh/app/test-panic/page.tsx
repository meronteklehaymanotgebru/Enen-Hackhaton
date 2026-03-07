"use client"

import axios from "axios"

export default function TestPanic() {

  async function triggerPanic() {

    try {

      const userId = "TEST_USER_ID"

      const response = await axios.post("/api/panic", {
        userId,
        latitude: 9.03,
        longitude: 38.74
      })

      alert("Panic triggered successfully")

      console.log(response.data)

    } catch (error) {
      alert("Panic test failed")
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Test Panic Button Backend</h2>

      <button
        onClick={triggerPanic}
        style={{
          padding: 20,
          background: "red",
          color: "white",
          borderRadius: 10
        }}
      >
        Trigger Panic Test
      </button>
    </div>
  )
}

