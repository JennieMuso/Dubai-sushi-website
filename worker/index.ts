export interface Env {
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  RESERVATION_TO_EMAIL: string;
  RESERVATION_FROM_EMAIL: string;
  ALLOWED_HOSTNAMES: string;
}

export interface ReservationPayload {
  name: string;
  email: string;
  phone: string;
  occasion: string;
  preferredDate: string;
  guests: number | null;
  message: string;
  submissionId: string;
  turnstileToken: string;
  company: string;
}

const allowedOccasions = new Set([
  "Counter dining",
  "Private dining",
  "Full counter experience",
  "Opening updates"
]);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+\d][\d\s().-]{5,29}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function parseReservation(form: FormData): ReservationPayload {
  const guestsText = text(form, "guests");
  return {
    name: text(form, "name"),
    email: text(form, "email").toLowerCase(),
    phone: text(form, "phone"),
    occasion: text(form, "occasion"),
    preferredDate: text(form, "date"),
    guests: guestsText ? Number(guestsText) : null,
    message: text(form, "message"),
    submissionId: text(form, "submission_id"),
    turnstileToken: text(form, "cf-turnstile-response"),
    company: text(form, "company")
  };
}

export function validateReservation(payload: ReservationPayload): string[] {
  const errors: string[] = [];
  if (payload.name.length < 2 || payload.name.length > 100) errors.push("name");
  if (payload.email.length > 254 || !emailPattern.test(payload.email)) errors.push("email");
  if (payload.phone && !phonePattern.test(payload.phone)) errors.push("phone");
  if (!allowedOccasions.has(payload.occasion)) errors.push("occasion");
  if (payload.preferredDate.length > 20) errors.push("date");
  if (payload.guests !== null && (!Number.isInteger(payload.guests) || payload.guests < 1 || payload.guests > 20)) errors.push("guests");
  if (payload.message.length > 2000) errors.push("message");
  if (!uuidPattern.test(payload.submissionId)) errors.push("submission_id");
  if (!payload.turnstileToken || payload.turnstileToken.length > 2048) errors.push("security_check");
  return errors;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character] ?? character);
}

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function configuredHosts(env: Env): Set<string> {
  return new Set(env.ALLOWED_HOSTNAMES.split(",").map((host) => host.trim().toLowerCase()).filter(Boolean));
}

async function verifyTurnstile(request: Request, env: Env, payload: ReservationPayload): Promise<boolean> {
  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: payload.turnstileToken,
    idempotency_key: payload.submissionId
  });
  const visitorIp = request.headers.get("CF-Connecting-IP");
  if (visitorIp) body.set("remoteip", visitorIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean; action?: string; hostname?: string };
  const hosts = configuredHosts(env);
  const requestHost = new URL(request.url).hostname.toLowerCase();
  return result.success === true
    && result.action === "reservation_enquiry"
    && typeof result.hostname === "string"
    && (result.hostname.toLowerCase() === requestHost || hosts.has(result.hostname.toLowerCase()));
}

function buildEmail(payload: ReservationPayload): { subject: string; text: string; html: string } {
  const rows = [
    ["Name", payload.name],
    ["Email", payload.email],
    ["Phone", payload.phone || "Not provided"],
    ["Experience", payload.occasion],
    ["Preferred date", payload.preferredDate || "Not provided"],
    ["Guests", payload.guests?.toString() || "Not provided"],
    ["Message", payload.message || "Not provided"]
  ];
  const plainRows = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  const htmlRows = rows.map(([label, value]) => `<tr><th align="left" style="padding:10px 14px;border-bottom:1px solid #eaded4;color:#650815;vertical-align:top">${escapeHtml(label)}</th><td style="padding:10px 14px;border-bottom:1px solid #eaded4;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`).join("");
  return {
    subject: `New JIN enquiry — ${payload.occasion}`,
    text: `A new reservation enquiry was submitted through the JIN website.\n\n${plainRows}\n\nSubmission ID: ${payload.submissionId}`,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>New JIN reservation enquiry</title></head><body style="margin:0;background:#f9f5ef;color:#471f22;font-family:Arial,sans-serif"><main style="max-width:680px;margin:0 auto;padding:36px 20px"><h1 style="font-family:Georgia,serif;font-size:34px;font-weight:400;color:#650815">New reservation enquiry</h1><p>A guest submitted an enquiry through the JIN website.</p><table role="presentation" style="width:100%;border-collapse:collapse;background:#fff">${htmlRows}</table><p style="font-size:12px;color:#77585a;margin-top:24px">Submission ID: ${escapeHtml(payload.submissionId)}</p></main></body></html>`
  };
}

async function sendReservation(env: Env, payload: ReservationPayload): Promise<boolean> {
  const content = buildEmail(payload);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `jin-reservation/${payload.submissionId}`
    },
    body: JSON.stringify({
      from: env.RESERVATION_FROM_EMAIL,
      to: [env.RESERVATION_TO_EMAIL],
      reply_to: payload.email,
      subject: content.subject,
      text: content.text,
      html: content.html
    })
  });
  return response.ok;
}

export async function handleReservation(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed." }, 405);
  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > 30_000) return json({ ok: false, message: "The enquiry is too large." }, 413);

  const origin = request.headers.get("Origin");
  if (!origin) return json({ ok: false, message: "Unable to verify the submission origin." }, 403);
  let originHost = "";
  try { originHost = new URL(origin).hostname.toLowerCase(); } catch { return json({ ok: false, message: "Unable to verify the submission origin." }, 403); }
  const requestHost = new URL(request.url).hostname.toLowerCase();
  const hosts = configuredHosts(env);
  if (originHost !== requestHost && !hosts.has(originHost)) return json({ ok: false, message: "Unable to verify the submission origin." }, 403);

  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.includes("multipart/form-data") && !contentType.includes("application/x-www-form-urlencoded")) {
    return json({ ok: false, message: "Unsupported submission format." }, 415);
  }

  let form: FormData;
  try { form = await request.formData(); } catch { return json({ ok: false, message: "We could not read the enquiry." }, 400); }
  const payload = parseReservation(form);
  if (payload.company) return json({ ok: true, message: "Your enquiry has been received." });
  const errors = validateReservation(payload);
  if (errors.length) return json({ ok: false, message: "Please check the highlighted details and try again.", fields: errors }, 400);

  if (!await verifyTurnstile(request, env, payload)) {
    return json({ ok: false, message: "The security check expired. Please try again." }, 403);
  }
  if (!await sendReservation(env, payload)) {
    return json({ ok: false, message: "We could not send your enquiry. Please try again shortly." }, 502);
  }
  return json({ ok: true, message: "Your enquiry has been sent." });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/reservations") return handleReservation(request, env);
    return new Response("Not found", { status: 404 });
  }
};
