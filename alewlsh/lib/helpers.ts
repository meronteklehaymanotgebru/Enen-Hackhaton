import { createClient } from '@/lib/supabase/server'

export async function isPremium(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data?.is_premium || false
}

export function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

export async function getSignedUploadUrl(bucket: string, path: string): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path)

  if (error) throw error
  return data.signedUrl
}