import AfricasTalking from "africastalking"

const username = process.env.AFRICASTALKING_USERNAME!
const apiKey = process.env.AFRICASTALKING_API_KEY!

const africastalking = AfricasTalking({
  username,
  apiKey
})

const sms = africastalking.SMS

export async function sendSMS(
  phone: string,
  message: string
) {
  try {
    await sms.send({
      to: phone,
      from: "sandbox",
      message: message
    })

    console.log("SMS sent to", phone)

  } catch (error) {
    console.error("SMS error", error)
  }
}
