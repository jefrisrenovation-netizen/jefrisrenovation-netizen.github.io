import { createClient } from "npm:@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "npm:jose@6";

const topic = "io.github.jefrisrenovation-netizen.suividesheures";

let providerToken: { value: string; expires: number } | undefined;

async function getProviderToken() {
  const now = Math.floor(Date.now() / 1000);
  if (providerToken && providerToken.expires > now) return providerToken.value;
  const key = await importPKCS8(Deno.env.get("ATTENDANCE_APNS_PRIVATE_KEY")!, "ES256");
  const value = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: Deno.env.get("ATTENDANCE_APNS_KEY_ID")! })
    .setIssuer("ZFF7B3HXTT").setIssuedAt(now).sign(key);
  providerToken = { value, expires: now + 3000 };
  return value;
}

async function collapseId(kind: string, id: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(kind + ":" + id));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  const secret = Deno.env.get("ATTENDANCE_PUSH_WORKER_SECRET");
  if (request.method !== "POST" || !secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const bearer = await getProviderToken();
    const { data: events } = await sb.from("attendance_push_events")
      .select("kind,record_id,owner_id,queued_at")
      .order("queued_at").limit(20).throwOnError();
    let deferred = 0;
    for (const event of events ?? []) {
      const expiration = Math.floor(new Date(event.queued_at).getTime() / 1000) + 900;
      const body = event.kind === "manual"
        ? "Novo dia de trabalho registrado."
        : event.kind === "entry" ? "Nova entrada GPS registrada." : "Nova saída GPS registrada.";
      let retry = false;
      if (expiration > Math.floor(Date.now() / 1000)) {
        const { data: devices } = await sb.from("attendance_push_devices")
          .select("token").eq("owner_id", event.owner_id).throwOnError();
        for (const { token } of devices ?? []) {
          const response = await fetch(`https://api.push.apple.com/3/device/${token}`, {
            method: "POST",
            signal: AbortSignal.timeout(5000),
            headers: {
              authorization: `bearer ${bearer}`,
              "content-type": "application/json",
              "apns-topic": topic,
              "apns-push-type": "alert",
              "apns-priority": "10",
              "apns-expiration": String(expiration),
              "apns-collapse-id": await collapseId(event.kind, event.record_id),
            },
            body: JSON.stringify({ aps: { alert: { title: "Suivi des heures Pro", body }, sound: "default" } }),
          }).catch(() => null);
          const failure = await response?.json().catch(() => null);
          if (response?.status === 410 || failure?.reason === "BadDeviceToken") {
            await sb.from("attendance_push_devices").delete().eq("token", token)
              .eq("owner_id", event.owner_id).throwOnError();
          } else if (!response?.ok) {
            retry = true;
            console.warn("Attendance alert delivery deferred", response?.status, failure?.reason);
          }
        }
      }
      if (retry) {
        deferred++;
      } else {
        await sb.from("attendance_push_events").delete()
          .eq("kind", event.kind).eq("record_id", event.record_id).throwOnError();
      }
    }
    return Response.json({ processed: events?.length ?? 0, deferred });
  } catch {
    return Response.json({ error: "Attendance delivery unavailable" }, { status: 503 });
  }
});
