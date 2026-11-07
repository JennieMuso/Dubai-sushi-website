import { afterEach, describe, expect, it, vi } from "vitest";
import { escapeHtml, handleReservation, parseReservation, validateReservation, type Env } from "../functions/api/reservations";

const env: Env = {
  RESEND_API_KEY: "re_test_key",
  TURNSTILE_SECRET_KEY: "turnstile_test_key",
  RESERVATION_TO_EMAIL: "reservations@example.com",
  RESERVATION_FROM_EMAIL: "JIN Reservations <reservations@example.com>",
  ALLOWED_HOSTNAMES: "jin.example.com,localhost"
};

function validForm(): FormData {
  const form = new FormData();
  form.set("name", "Amina Noor");
  form.set("email", "amina@example.com");
  form.set("phone", "+971 50 123 4567");
  form.set("occasion", "Counter dining");
  form.set("date", "18 / 12 / 2026");
  form.set("guests", "2");
  form.set("message", "Anniversary <table>");
  form.set("submission_id", "8ba79f8b-88c1-45fb-aef0-07e89a0534ea");
  form.set("cf-turnstile-response", "verified-token");
  form.set("company", "");
  return form;
}

function request(form = validForm()): Request {
  return new Request("https://jin.example.com/api/reservations", {
    method: "POST",
    headers: { Origin: "https://jin.example.com", Accept: "application/json" },
    body: form
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("reservation validation", () => {
  it("accepts a complete reservation and normalizes the email", () => {
    const payload = parseReservation(validForm());
    expect(payload.email).toBe("amina@example.com");
    expect(validateReservation(payload)).toEqual([]);
  });

  it("rejects invalid contact details and guest counts", () => {
    const form = validForm();
    form.set("email", "not-an-email");
    form.set("guests", "25");
    expect(validateReservation(parseReservation(form))).toEqual(expect.arrayContaining(["email", "guests"]));
  });

  it("escapes guest supplied HTML before email rendering", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });
});

describe("reservation endpoint", () => {
  it("verifies Turnstile and sends one idempotent Resend email", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ success: true, action: "reservation_enquiry", hostname: "jin.example.com" }))
      .mockResolvedValueOnce(Response.json({ id: "email_123" }, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleReservation(request(), env);
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const resendCall = fetchMock.mock.calls[1];
    expect(resendCall[0]).toBe("https://api.resend.com/emails");
    expect(resendCall[1].headers["Idempotency-Key"]).toContain("8ba79f8b-88c1-45fb-aef0-07e89a0534ea");
    const email = JSON.parse(resendCall[1].body);
    expect(email.reply_to).toBe("amina@example.com");
    expect(email.html).toContain("Anniversary &lt;table&gt;");
  });

  it("does not call external services for invalid input", async () => {
    const form = validForm();
    form.set("occasion", "Unknown experience");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await handleReservation(request(form), env);
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a Turnstile response issued for a different hostname", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ success: true, action: "reservation_enquiry", hostname: "attacker.example" }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await handleReservation(request(), env);
    expect(response.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
