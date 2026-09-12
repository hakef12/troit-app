import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
export const BUCKET = 'uploads';

export const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  : null;

export async function ensureBucket() {
  if (!supabase) return;
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

export function publicUrl(filename) {
  return supabase.storage.from(BUCKET).getPublicUrl(filename).data.publicUrl;
}

export async function uploadFile(filename, buffer, contentType) {
  const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return publicUrl(filename);
}
