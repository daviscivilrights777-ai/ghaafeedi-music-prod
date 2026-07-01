/**
 * Ghaafeedi Music — Welcome Email (Enterprise Sign-Up)
 * Sends a luxury, cinematic branded welcome letter via Resend the moment
 * a new member account is created. Includes the member's full name and
 * their unique Ghaafeedi Music Member ID.
 */

import { getSecret } from "../orchestration/secrets";

const FROM = "Ghaafeedi Music <noreply@ghaafeedimusic.com>";
const REPLY_TO = "support@ghaafeedimusic.com";
const BRAND_GOLD = "#D4AF37";
const BRAND_GOLD2 = "#F4D06F";

function buildWelcomeHtml(opts: { fullName: string; memberId: string; onboardingUrl: string }): string {
  const { fullName, memberId, onboardingUrl } = opts;
  const firstName = fullName.trim().split(" ")[0] || fullName;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Welcome to Ghaafeedi Music</title>
  <style>
    body { margin:0; padding:0; background:#050B1A; font-family: 'Inter', Arial, sans-serif; }
    .wrap { max-width:600px; margin:0 auto; background:#071226; border-radius:16px; overflow:hidden; }
    .hero { background:linear-gradient(135deg,#071226 0%,#0D1B36 100%); padding:56px 40px 36px; text-align:center; border-bottom:1px solid rgba(212,175,55,0.2); }
    .crest { font-size:40px; margin-bottom:18px; letter-spacing:2px; color:${BRAND_GOLD}; }
    .hero-title { font-family: 'Playfair Display', Georgia, serif; font-size:30px; color:#FFFFFF; font-weight:700; margin:0 0 10px; }
    .hero-sub { font-size:15px; color:rgba(255,255,255,0.6); margin:0; font-style:italic; }
    .body { padding:40px 40px 12px; }
    .body p { color:rgba(255,255,255,0.85); font-size:15px; line-height:1.75; margin:0 0 18px; }
    .member-box { background:rgba(212,175,55,0.06); border:1px solid rgba(212,175,55,0.22); border-radius:14px; padding:26px 28px; margin:28px 0; text-align:center; }
    .member-box .label { font-size:11px; color:rgba(255,255,255,0.45); text-transform:uppercase; letter-spacing:2px; margin:0 0 10px; }
    .member-box .id { font-family:'Playfair Display', Georgia, serif; font-size:26px; color:${BRAND_GOLD}; font-weight:700; letter-spacing:1px; margin:0; }
    .cta-wrap { text-align:center; margin:34px 0 8px; }
    .cta { display:inline-block; background:linear-gradient(135deg,${BRAND_GOLD} 0%,${BRAND_GOLD2} 100%); color:#050B1A; font-weight:700; font-size:15px; padding:15px 38px; border-radius:40px; text-decoration:none; letter-spacing:0.5px; }
    .perks { padding:8px 40px 8px; }
    .perk-row { display:flex; align-items:flex-start; gap:12px; margin-bottom:14px; }
    .perk-dot { color:${BRAND_GOLD}; font-size:14px; margin-top:2px; }
    .perk-text { color:rgba(255,255,255,0.72); font-size:14px; line-height:1.5; }
    .divider { border:none; border-top:1px solid rgba(212,175,55,0.12); margin:32px 0 24px; }
    .footer { padding:0 40px 36px; text-align:center; }
    .footer p { color:rgba(255,255,255,0.35); font-size:12px; margin:4px 0; }
  </style>
</head>
<body>
  <div style="padding:24px 16px; background:#050B1A;">
    <span style="display:none;max-height:0;overflow:hidden;">Welcome to Ghaafeedi Music, ${firstName} — your legacy begins now.</span>
    <div class="wrap">
      <div class="hero">
        <div class="crest">✦ Ghaafeedi Music ✦</div>
        <h1 class="hero-title">Welcome, ${firstName}.</h1>
        <p class="hero-sub">Your Legacy Begins Now</p>
      </div>
      <div class="body">
        <p>Dear ${fullName},</p>
        <p>You have just stepped into Ghaafeedi Music — where memories are transformed into cinematic songs, films, and legacy experiences, powered by advanced AI storytelling. We are honored to have you.</p>
        <p>Every account here is treated as a singular story waiting to be told. Yours now carries its own permanent identity within our platform:</p>

        <div class="member-box">
          <p class="label">Your Ghaafeedi Music Member ID</p>
          <p class="id">${memberId}</p>
        </div>

        <p>Keep this ID — it is your key to every production, every conversation with Sophia (your AI companion), and every experience you create with us.</p>
      </div>

      <div class="cta-wrap">
        <a href="${onboardingUrl}" class="cta">Begin Your Story →</a>
      </div>

      <div class="perks">
        <div class="perk-row"><span class="perk-dot">✦</span><span class="perk-text">Access to all premium cinematic & music experiences</span></div>
        <div class="perk-row"><span class="perk-dot">✦</span><span class="perk-text">Sophia AI Concierge — your personal emotional storytelling guide</span></div>
        <div class="perk-row"><span class="perk-dot">✦</span><span class="perk-text">Full production tracking dashboard, from first word to final cut</span></div>
        <div class="perk-row"><span class="perk-dot">✦</span><span class="perk-text">Enterprise-grade privacy & consent protection on everything you share</span></div>
      </div>

      <hr class="divider" />
      <div class="footer">
        <p>© 2026 Ghaafeedi Music · <a href="https://ghaafeedimusic.com" style="color:${BRAND_GOLD};text-decoration:none;">ghaafeedimusic.com</a></p>
        <p>Questions? <a href="mailto:support@ghaafeedimusic.com" style="color:${BRAND_GOLD};text-decoration:none;">support@ghaafeedimusic.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = await getSecret("RESEND_API_KEY").catch(() => process.env.RESEND_API_KEY ?? "");
  if (!apiKey) {
    console.warn("[WelcomeEmail] RESEND_API_KEY not configured — skipping email");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      reply_to: REPLY_TO,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    console.error(`[WelcomeEmail] Resend error ${res.status}: ${err}`);
  } else {
    const data = await res.json().catch(() => ({})) as { id?: string };
    console.log(`[WelcomeEmail] Sent to ${opts.to} — id=${data.id ?? "N/A"}`);
  }
}

export async function sendWelcomeEmail(opts: {
  to: string;
  fullName: string;
  memberId: string;
  onboardingUrl?: string;
}): Promise<void> {
  const onboardingUrl = opts.onboardingUrl ?? "https://ghaafeedimusic.com/onboarding";
  const html = buildWelcomeHtml({ fullName: opts.fullName, memberId: opts.memberId, onboardingUrl });
  await sendEmail({
    to: opts.to,
    subject: `Welcome to Ghaafeedi Music, ${opts.fullName.trim().split(" ")[0] || opts.fullName} — Your Member ID is ${opts.memberId}`,
    html,
  }).catch(err => console.error("[WelcomeEmail] send failed:", err));
}
