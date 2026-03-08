import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, email, first_name, last_name, plan } = body;

    const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
    
    // Generate unique transaction reference
    const tx_ref = `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    console.log('Sending to Chapa:', {
      amount,
      email,
      first_name,
      last_name,
      tx_ref
    });

    // Call Chapa API
    const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'ETB',
        email: email,
        first_name: first_name,
        last_name: last_name,
        tx_ref: tx_ref,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/verify`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
      }),
    });

    const data = await response.json();
    console.log('Chapa response:', data);

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}