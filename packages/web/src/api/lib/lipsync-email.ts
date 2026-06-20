/**
 * Ghaafeedi Music — Lip Sync Email Notifications (Phase 8)
 * Sends cinematic branded emails via Resend when a lip_sync job completes or fails.
 */

import { getSecret } from "../orchestration/secrets";

const FROM = "Ghaafeedi Music <noreply@ghaafeedimusic.com>";
const REPLY_TO = "support@ghaafeedimusic.com";
const BRAND_GOLD = "#D4AF37";
const BRAND_DARK = "#050B1A";

// ─── HTML email builder ───────────────────────────────────────────────────────

function buildEmailHtml(opts: {
  title: string;
  preheader: string;
  heroIcon: string;
  heroColor: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote?: string;
}): string {
  const { title, preheader, heroIcon, heroColor, bodyHtml, ctaLabel, ctaUrl, footerNote } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#050B1A; font-family: 'Inter', Arial, sans-serif; }
    .wrap { max-width:600px; margin:0 auto; background:#071226; border-radius:16px; overflow:hidden; }
    .hero { background:linear-gradient(135deg,#071226 0%,#0D1B36 100%); padding:48px 40px 32px; text-align:center; border-bottom:1px solid rgba(212,175,55,0.2); }
    .hero-icon { font-size:56px; margin-bottom:16px; }
    .hero-title { font-family: 'Playfair Display', Georgia, serif; font-size:28px; color:#FFFFFF; font-weight:700; margin:0 0 8px; }
    .hero-sub { font-size:15px; color:rgba(255,255,255,0.6); margin:0; }
    .body { padding:36px 40px; }
    .body p { color:rgba(255,255,255,0.85); font-size:15px; line-height:1.7; margin:0 0 16px; }
    .cta-wrap { text-align:center; margin:32px 0; }
    .cta { display:inline-block; background:linear-gradient(135deg,${BRAND_GOLD} 0%,#F4D06F 100%); color:#050B1A; font-weight:700; font-size:15px; padding:14px 36px; border-radius:40px; text-decoration:none; letter-spacing:0.5px; }
    .divider { border:none; border-top:1px solid rgba(212,175,55,0.12); margin:28px 0; }
    .footer { padding:24px 40px 32px; text-align:center; }
    .footer p { color:rgba(255,255,255,0.35); font-size:12px; margin:4px 0; }
    .badge { display:inline-block; background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.25); color:${BRAND_GOLD}; font-size:11px; padding:4px 10px; border-radius:20px; margin:2px; }
    .status-box { background:rgba(212,175,55,0.06); border:1px solid rgba(212,175,55,0.18); border-radius:12px; padding:20px 24px; margin:20px 0; }
    .status-box .label { font-size:11px; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:1px; margin:0 0 6px; }
    .status-box .value { font-size:16px; color:#FFFFFF; font-weight:600; margin:0; }
    .error-box { background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); border-radius:12px; padding:20px 24px; margin:20px 0; }
    .error-box p { color:rgba(255,255,255,0.75); margin:0; font-size:14px; }
  </style>
</head>
<body>
  <div style="padding:24px 16px; background:#050B1A;">
    <!-- preheader (hidden) -->
    <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
    <div class="wrap">
      <div class="hero">
        <div class="hero-icon">${heroIcon}</div>
        <h1 class="hero-title">${title}</h1>
        <p class="hero-sub">Ghaafeedi Music · AI Storytelling Platform</p>
      </div>
      <div class="body">
        ${bodyHtml}
        <div class="cta-wrap">
          <a href="${ctaUrl}" class="cta">${ctaLabel}</a>
        </div>
        ${footerNote ? `<p style="font-size:13px;color:rgba(255,255,255,0.4);text-align:center;">${footerNote}</p>` : ""}
      </div>
      <hr class="divider" />
      <div class="footer">
        <p><span class="badge">ElevenLabs TTS</span> <span class="badge">FAL.ai LatentSync</span> <span class="badge">R2 CDN</span></p>
        <p style="margin-top:12px;">© 2026 Ghaafeedi Music · <a href="https://ghaafeedimusic.com" style="color:${BRAND_GOLD};text-decoration:none;">ghaafeedimusic.com</a></p>
        <p>Questions? <a href="mailto:support@ghaafeedimusic.com" style="color:${BRAND_GOLD};text-decoration:none;">support@ghaafeedimusic.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Send via Resend ──────────────────────────────────────────────────────────

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = await getSecret("RESEND_API_KEY").catch(() => process.env.RESEND_API_KEY ?? "");
  if (!apiKey) {
    console.warn("[LipSyncEmail] RESEND_API_KEY not configured — skipping email");
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
    console.error(`[LipSyncEmail] Resend error ${res.status}: ${err}`);
  } else {
    const data = await res.json().catch(() => ({})) as { id?: string };
    console.log(`[LipSyncEmail] Sent to ${opts.to} — id=${data.id ?? "N/A"}`);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface LipSyncEmailOptions {
  to: string;
  memberName: string;
  jobId: string;
  orderId?: string;
  productionTitle?: string;
  outputUrl?: string;
  errorMessage?: string;
  isEliteFree?: boolean;
}

/**
 * Send "Your Sophia Lip Sync is Ready" email
 */
export async function sendLipSyncCompleteEmail(opts: LipSyncEmailOptions): Promise<void> {
  const { to, memberName, jobId, productionTitle, outputUrl, isEliteFree } = opts;
  const firstName = memberName.split(" ")[0] || "there";
  const dashUrl = "https://ghaafeedimusic.com/dashboard?tab=deliverables";
  const title = productionTitle ? `"${productionTitle}"` : "Your Production";

  const bodyHtml = `
    <p>Hey ${firstName},</p>
    <p>Great news — your <strong style="color:${BRAND_GOLD};">Sophia AI Lip Sync</strong> video is complete and ready to view. Sophia's voice is now perfectly synchronized with your cinematic footage.</p>
    <div class="status-box">
      <p class="label">Production</p>
      <p class="value">${title}</p>
    </div>
    <div class="status-box">
      <p class="label">Job Reference</p>
      <p class="value" style="font-size:13px;font-family:monospace;">${jobId}</p>
    </div>
    ${isEliteFree ? `<p style="font-size:13px;color:rgba(212,175,55,0.8);">✦ Delivered free with your Elite membership.</p>` : `<p style="font-size:13px;color:rgba(255,255,255,0.5);">Charged: $29.00 add-on</p>`}
    <p>Click below to preview and download your lip sync video from your member dashboard.</p>
  `;

  const html = buildEmailHtml({
    title: "Your Sophia Lip Sync is Ready ✦",
    preheader: `${firstName}, your Sophia AI lip sync video is complete. Preview it now in your dashboard.`,
    heroIcon: "🎬",
    heroColor: BRAND_GOLD,
    bodyHtml,
    ctaLabel: "Preview My Lip Sync →",
    ctaUrl: outputUrl ?? dashUrl,
    footerNote: "You're receiving this because you requested a Sophia Lip Sync add-on.",
  });

  await sendEmail({
    to,
    subject: `✦ Your Sophia Lip Sync is Ready — Ghaafeedi Music`,
    html,
  });
}

/**
 * Send "Lip Sync Issue" email when job fails
 */
export async function sendLipSyncFailedEmail(opts: LipSyncEmailOptions): Promise<void> {
  const { to, memberName, jobId, productionTitle, errorMessage } = opts;
  const firstName = memberName.split(" ")[0] || "there";
  const supportUrl = "https://ghaafeedimusic.com/contact";
  const dashUrl = "https://ghaafeedimusic.com/dashboard?tab=deliverables";
  const title = productionTitle ? `"${productionTitle}"` : "Your Production";

  const bodyHtml = `
    <p>Hey ${firstName},</p>
    <p>We ran into an issue while processing your <strong style="color:${BRAND_GOLD};">Sophia AI Lip Sync</strong> for ${title}. Our team has been automatically notified and we're looking into it.</p>
    <div class="error-box">
      <p><strong>What happened:</strong> ${errorMessage ?? "An unexpected error occurred during lip sync processing."}</p>
    </div>
    <div class="status-box">
      <p class="label">Job Reference</p>
      <p class="value" style="font-size:13px;font-family:monospace;">${jobId}</p>
    </div>
    <p><strong>What happens next:</strong> You won't be charged for a failed job. You can retry from your dashboard or contact our support team and we'll personally re-run it for you.</p>
  `;

  const html = buildEmailHtml({
    title: "Lip Sync Issue — We're On It",
    preheader: `${firstName}, there was an issue with your lip sync job. No charge applied. We're on it.`,
    heroIcon: "⚠️",
    heroColor: "#F87171",
    bodyHtml,
    ctaLabel: "Contact Support →",
    ctaUrl: supportUrl,
    footerNote: `You can also retry directly from your <a href="${dashUrl}" style="color:${BRAND_GOLD}">member dashboard</a>.`,
  });

  await sendEmail({
    to,
    subject: `Sophia Lip Sync Issue — Ghaafeedi Music (ref: ${jobId.slice(0, 8)})`,
    html,
  });
}
