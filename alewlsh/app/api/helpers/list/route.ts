// app/api/helpers/list/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/services/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("helpers")
      .select("id, user_id, is_active")
      .eq("is_active", true);

    if (error) throw error;

    return NextResponse.json({ helpers: data });
  } catch (err) {
    return NextResponse.json({ error: err}, { status: 500 });
  }
}
