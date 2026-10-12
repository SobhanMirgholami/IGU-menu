// notify-order-ready
// Called by the staff screen right after an order is marked "ready".
// Sends a Web Push notification to every phone the student allowed notifications on,
// even when the app is closed.
//
// Secrets it needs (Supabase -> Edge Functions -> Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT   (from push-keys.local)
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// The message in the student's own language
const MESSAGES: Record<string, { title: (id: number) => string; body: string }> = {
  tr: { title: (id) => `#${id} siparişin hazır! ☕`, body: 'Numaranı tezgâhta göster.' },
  en: { title: (id) => `Order #${id} is ready! ☕`, body: 'Show your number at the counter.' },
  ar: { title: (id) => `طلبك #${id} جاهز! ☕`, body: 'أظهر رقمك عند الكاونتر.' },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { order_id } = await req.json()
    if (!Number.isInteger(order_id)) return json({ error: 'order_id is required' }, 400)

    const url = Deno.env.get('SUPABASE_URL')!

    // 1. Who is calling? Must be signed-in café staff or the manager.
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json({ error: 'Not signed in' }, 401)

    // The service role skips RLS, so it is used only after the checks above
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: role } = await admin.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
    if (!role || !['staff', 'manager'].includes(role.role)) return json({ error: 'Only staff can send this' }, 403)

    // 2. The order must really be ready, and not pushed before (claims it in one step)
    const { data: order } = await admin
      .from('orders')
      .update({ ready_push_sent_at: new Date().toISOString() })
      .eq('id', order_id)
      .eq('status', 'ready')
      .is('ready_push_sent_at', null)
      .select('id, user_id')
      .maybeSingle()

    if (!order) return json({ sent: 0, reason: 'Order is not ready, or was already notified' })

    // 3. Send to each of the student's phones
    const { data: subscriptions } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, lang')
      .eq('user_id', order.user_id)

    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT')!,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    )

    let sent = 0
    for (const sub of subscriptions ?? []) {
      const message = MESSAGES[sub.lang] ?? MESSAGES.tr
      const payload = JSON.stringify({ title: message.title(order.id), body: message.body, orderId: order.id })

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 30 * 60, urgency: 'high' } // after 30 minutes the message is useless
        )
        sent++
      } catch (error) {
        // 404/410: the phone unsubscribed or the app was removed, so forget it
        const status = (error as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error('push failed', status, (error as Error).message)
        }
      }
    }

    return json({ sent })
  } catch (error) {
    console.error(error)
    return json({ error: 'Something went wrong' }, 500)
  }
})
