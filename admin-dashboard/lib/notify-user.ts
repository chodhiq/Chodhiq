import { supabase } from './supabase';

export type Audience = 'all' | 'customers' | 'providers' | 'user';

export async function sendNotification(args: { audience: Audience; userId?: string; title: string; body: string }) {
  const { data, error } = await supabase.rpc('admin_send_notification', {
    audience: args.audience,
    target_user_id: args.userId ?? null,
    message_title: args.title.trim(),
    message_body: args.body.trim(),
  });
  if (error) throw new Error(error.message);
  return Number(data) || 0;
}
