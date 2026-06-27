import { motion } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { Link, useParams } from "wouter";
import { LEGAL_DOCS } from "./legal";

const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as any } },
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* DOCUMENT CONTENT */
/* ─────────────────────────────────────────────────────────────────────────── */

type DocSection = { heading: string; body: string | string[] };

const DOCS: Record<string, { intro: string; sections: DocSection[] }> = {
  "privacy-policy": {
    intro: "This Privacy Policy describes how Ghaafeedi Music ('we', 'us', or 'our') collects, uses, and protects your personal information when you use our platform, services, and products. Effective Date: June 1, 2026.",
    sections: [
      { heading: "1. Information We Collect", body: ["Identity Information: Name, email address, profile photo, billing address.", "Account Data: Login credentials (stored hashed), account preferences, subscription tier.", "Content Data: Story submissions, uploaded media, voice samples, emotional inputs you provide during onboarding and production.", "Payment Data: We use Whop and Dodo Payments as processors. We do not store raw payment card data.", "Usage Data: Device type, browser, IP address (truncated), pages visited, feature interactions, error logs.", "Communications: Support tickets, chat transcripts, feedback forms."] },
      { heading: "2. How We Use Your Information", body: ["Delivering and improving our AI-powered storytelling services.", "Processing payments and managing subscriptions.", "Personalizing your production experience.", "Sending service communications (receipts, updates, support responses).", "Marketing communications (opt-in only, unsubscribe anytime).", "Fraud prevention, security monitoring, and abuse detection.", "Compliance with legal obligations."] },
      { heading: "3. Data Sharing", body: "We do not sell your personal data. We share data only with: (a) Service Providers acting on our behalf (payment processors, cloud infrastructure, AI model providers) under data processing agreements; (b) Law Enforcement when required by valid legal process; (c) Business Transfers in the event of merger, acquisition, or asset sale, with notice to you." },
      { heading: "4. Data Retention", body: "We retain account data for the duration of your active subscription plus 90 days. On account deletion, personal data is purged within 30 days. Backups containing your data are purged within 90 days. Aggregated, anonymized analytics data may be retained indefinitely." },
      { heading: "5. Your Rights", body: ["Access: Request a full export of your data.", "Correction: Update inaccurate data via account settings.", "Deletion: Request complete erasure (subject to legal hold requirements).", "Portability: Receive your data in machine-readable format.", "Objection: Object to certain processing activities.", "Withdrawal of Consent: Withdraw AI training consent at any time.", "To exercise rights: privacy@ghaafeedimusic.com"] },
      { heading: "6. Cookies", body: "We use essential cookies for authentication and security, analytics cookies (opt-in) for product improvement, and no third-party advertising cookies. See our Cookie Policy for details." },
      { heading: "7. International Transfers", body: "Your data is processed in the United States. If you are located outside the US, your data will be transferred to and processed in the US. We employ Standard Contractual Clauses for transfers involving EU personal data." },
      { heading: "8. Children's Privacy", body: "Our services are not directed to individuals under 18. We do not knowingly collect personal data from minors. If you believe a minor has submitted data, contact us immediately at privacy@ghaafeedimusic.com." },
      { heading: "9. Changes to This Policy", body: "We will notify you of material changes via email and in-platform notification at least 14 days before they take effect. Continued use after the effective date constitutes acceptance." },
      { heading: "10. Contact", body: "Privacy questions: privacy@ghaafeedimusic.com | Ghaafeedi Music | United States" },
    ],
  },
  "terms-of-service": {
    intro: "These Terms of Service govern your access to and use of Ghaafeedi Music's platform, products, and services. By accessing our platform, you agree to these terms. Effective Date: June 1, 2026.",
    sections: [
      { heading: "1. Acceptance of Terms", body: "By creating an account or using any Ghaafeedi Music service, you acknowledge that you are 18 years of age or older and agree to be bound by these Terms and our Privacy Policy." },
      { heading: "2. Services Provided", body: "Ghaafeedi Music provides AI-powered personal storytelling services including but not limited to: cinematic song creation, story video production, voice cloning, dream visualization, legacy vault storage, and AI companion services. Service features may change with notice." },
      { heading: "3. Account Responsibilities", body: ["Maintain the confidentiality of your account credentials.", "Notify us immediately of unauthorized access.", "Provide accurate, current billing and identity information.", "Not share account access with third parties.", "Not use the platform for prohibited purposes (see Section 7)."] },
      { heading: "4. Subscriptions and Billing", body: "Subscriptions are billed monthly or annually as selected. Prices are in USD. Taxes may apply based on your location. You authorize us to charge your payment method on a recurring basis. Subscription changes take effect at the start of the next billing cycle." },
      { heading: "5. Content Ownership", body: "You retain ownership of all personal content you provide (stories, photos, memories). For AI-generated outputs produced using our platform, you are granted a perpetual, non-exclusive, worldwide license for personal and commercial use. We retain no ownership claim over your completed productions. See our User Content Policy and AI Generated Content Policy for full details." },
      { heading: "6. Platform License", body: "We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the platform for its intended purpose. You may not reverse engineer, resell, sublicense, or create derivative works of our platform without written consent." },
      { heading: "7. Prohibited Uses", body: ["Creating content without the consent of depicted individuals.", "Generating deepfakes, disinformation, or fraudulent identity material.", "Harassment, hate speech, or threatening content.", "Uploading malware, scrapers, or automated bots.", "Circumventing rate limits, access controls, or paywalls.", "Commercial resale of AI-generated outputs in violation of our license terms."] },
      { heading: "8. Termination", body: "We may suspend or terminate accounts that violate these Terms, with or without notice for severe violations. You may cancel your account at any time. Termination does not entitle you to a refund except as provided in our Refund Policy." },
      { heading: "9. Limitation of Liability", body: "To the maximum extent permitted by law, Ghaafeedi Music's total liability to you for any claim arising out of these Terms or your use of our services shall not exceed the amount you paid us in the 3 months preceding the claim." },
      { heading: "10. Disputes", body: "These Terms are governed by the laws of the United States. Disputes will first be addressed through our support escalation process. Binding arbitration applies to claims that cannot be resolved informally." },
      { heading: "11. Contact", body: "Legal queries: legal@ghaafeedimusic.com" },
    ],
  },
  "refund-policy": {
    intro: "We stand behind the quality of our work. This policy describes when refunds are available, when they are not, and how to request them. Effective Date: June 1, 2026.",
    sections: [
      { heading: "1. Eligible Refunds", body: ["Full refund within 48 hours of initial subscription purchase if no production has been started.", "Full refund for any production demonstrably failing to meet the quality standard described in your product brief, after one revision attempt.", "Full refund if a technical error on our end results in a production that cannot be completed after 14 days."] },
      { heading: "2. Non-Refundable Services", body: ["Productions that have entered the AI generation phase and have been delivered.", "Voice cloning models once created and delivered (due to the resource-intensive nature of voice synthesis).", "Legacy Vault annual subscriptions after the 48-hour window, where your vault has been activated and content uploaded.", "Add-ons and one-time production upgrades once processing has begun."] },
      { heading: "3. Subscription Cancellations", body: "You may cancel your subscription at any time. Cancellation stops future billing but does not refund the current billing period. Your access continues until the end of the paid period. To avoid charges for the next cycle, cancel at least 24 hours before your renewal date." },
      { heading: "4. Production Stage Limitations", body: "Our productions go through multiple stages: Brief Capture → Story Analysis → AI Generation → Human Review → Delivery. Once a production enters the AI Generation stage, the computational resources have been committed. Refunds at this stage are evaluated on a case-by-case basis. A production credit toward a future order is always available as an alternative." },
      { heading: "5. How to Request a Refund", body: "Contact our support team at support@ghaafeedimusic.com with your order ID and reason. We respond within 24 business hours. Approved refunds are processed within 5–10 business days to your original payment method." },
      { heading: "6. Exceptions and Good Faith", body: "We handle edge cases with good faith. If your situation is not covered here, contact us. Our goal is a resolution you're satisfied with." },
    ],
  },
  "cookie-policy": {
    intro: "This Cookie Policy explains what cookies are, how Ghaafeedi Music uses them, and how you can control your preferences. Effective Date: June 1, 2026.",
    sections: [
      { heading: "1. What Are Cookies", body: "Cookies are small text files stored on your device by a website. They allow websites to remember information about your visit, such as login state or preferences." },
      { heading: "2. Cookies We Use", body: ["Essential Cookies (Required): Authentication tokens, CSRF protection, security session data. These cannot be disabled without breaking core functionality.", "Analytics Cookies (Optional): Anonymous usage metrics to improve product quality. Opt-in via Cookie Preferences.", "Preference Cookies (Optional): Stores your UI preferences such as theme and language.", "No advertising or third-party tracking cookies are used."] },
      { heading: "3. Managing Cookie Preferences", body: "You can manage cookie preferences through your Account Settings > Privacy > Cookie Preferences. You may also use your browser's built-in cookie controls to block or delete cookies, though this may affect platform functionality." },
      { heading: "4. Third-Party Cookies", body: "Our embedded payment processors (Whop, Dodo Payments) may set cookies necessary for payment security. These are covered by their respective cookie policies." },
      { heading: "5. Cookie Duration", body: "Session cookies expire when you close your browser. Persistent cookies (authentication, preferences) expire within 30–90 days and are renewed on active sessions." },
      { heading: "6. Contact", body: "Cookie questions: privacy@ghaafeedimusic.com" },
    ],
  },
  "data-protection": {
    intro: "This Data Protection Policy describes the technical and organizational measures Ghaafeedi Music employs to protect personal data. Effective Date: June 1, 2026.",
    sections: [
      { heading: "1. Encryption", body: "All data in transit is encrypted using TLS 1.3. All data at rest is encrypted using AES-256. Database backups are encrypted before storage. Voice samples and media files are stored in encrypted object storage with customer-scoped encryption keys." },
      { heading: "2. Access Controls", body: "Access to production systems is limited to authorized personnel on a need-to-know basis. All admin access requires multi-factor authentication. Access is reviewed quarterly and revoked immediately upon role change or departure." },
      { heading: "3. Network Security", body: "Production infrastructure is protected by firewall rules, DDoS mitigation, and intrusion detection systems. Internal services operate on private networks with no direct internet exposure." },
      { heading: "4. Incident Response", body: "We maintain a documented security incident response plan. In the event of a data breach affecting your personal data, we will notify you within 72 hours of discovery, consistent with applicable regulatory requirements." },
      { heading: "5. Third-Party Risk Management", body: "All sub-processors handling personal data are vetted for security posture before onboarding and reviewed annually. Data Processing Agreements are executed with all sub-processors." },
      { heading: "6. Employee Training", body: "All staff with access to personal data complete annual data protection training. Our Data Protection Officer oversees compliance and is available at dpo@ghaafeedimusic.com." },
      { heading: "7. Data Minimization", body: "We apply data minimization principles across all systems. We do not collect data we do not need, and we delete data once its purpose is fulfilled." },
    ],
  },
  "voice-cloning-consent": {
    intro: "Voice Cloning is a powerful capability with significant responsibility attached. This document explains exactly how your voice samples are used, stored, and protected, and what rights you retain. Effective Date: June 1, 2026.",
    sections: [
      { heading: "1. Explicit Consent Required", body: "Before any voice cloning activity begins, you must provide explicit, informed, written consent through our platform's Consent Modal. This consent is version-stamped, time-stamped, and cryptographically logged. We will not clone your voice without this consent." },
      { heading: "2. How Voice Samples Are Used", body: ["Your samples are processed by our voice synthesis model (Sunor.cc API) to create a personalized voice model.", "The voice model is used exclusively to generate productions you explicitly request.", "Your voice model is never shared with other users, sold, or used for any purpose outside your productions."] },
      { heading: "3. Storage Practices", body: "Raw voice samples are encrypted and stored in isolated storage scoped to your account. Samples are retained for as long as your voice model is active. If you revoke consent or delete your account, both raw samples and the derived voice model are permanently deleted within 7 business days." },
      { heading: "4. Your Rights", body: ["Access: View the consent record and storage status of your voice samples at any time.", "Revocation: Withdraw consent at any time via Account Settings > Voice Cloning > Revoke Consent.", "Deletion: Request deletion of all voice data independent of account status.", "Usage Log: View a log of all productions that used your voice model."] },
      { heading: "5. Revocation Process", body: "Revocation is immediate for future productions. Any production already in the AI Generation phase will complete before revocation takes effect. On revocation: the voice model is flagged for deletion within 7 business days, and a deletion confirmation is emailed to you." },
      { heading: "6. Ownership Limitations", body: "Your voice model is derived from your unique biometric data. While you own the underlying data rights, the derived model is licensed to Ghaafeedi Music solely for your requested productions. You may not transfer, sell, or license your voice model to third parties through our platform." },
      { heading: "7. Third-Party Voice Cloning", body: "If you upload audio samples of other individuals for voice cloning purposes, you represent and warrant that you have obtained their explicit, informed consent. Uploading third-party voice samples without consent is a violation of these Terms and applicable law." },
    ],
  },
  "user-content-policy": {
    intro: "This policy governs the content you create, upload, and generate using the Ghaafeedi Music platform. Effective Date: June 1, 2026.",
    sections: [
      { heading: "1. Content You Own", body: "You retain full ownership of all personal content you upload to our platform: photos, written stories, memories, voice recordings, and other original materials. By uploading, you grant us a limited license to process this content solely to deliver your productions." },
      { heading: "2. AI-Generated Outputs", body: "You are granted a perpetual, non-exclusive, worldwide license for personal and commercial use of all AI-generated content produced for you through our platform. See our AI Generated Content Policy for full ownership details." },
      { heading: "3. Prohibited Content", body: ["Non-consensual sexual content.", "Content depicting minors in any sexual or harmful context.", "Content designed to harass, threaten, or defame individuals.", "Fraudulent identity content or unauthorized use of real people's likenesses.", "Content that infringes third-party intellectual property rights."] },
      { heading: "4. Content Moderation", body: "We reserve the right to remove content that violates this policy without notice. Repeat violations result in account termination." },
      { heading: "5. User Representations", body: "By submitting content, you represent that you have all rights necessary to grant the licenses above, and that your content does not violate any applicable law or third-party rights." },
    ],
  },
  "copyright-policy": {
    intro: "This Copyright Policy explains how copyright applies to content created on and through Ghaafeedi Music's platform. Effective Date: June 1, 2026.",
    sections: [
      { heading: "1. AI-Generated Content and Copyright", body: "The copyright status of AI-generated content is an evolving area of law. Ghaafeedi Music uses commercially licensed AI models for all generation. We do not knowingly use models trained on unlicensed copyrighted data. We provide productions to you with the understanding that copyright ownership may depend on the degree of human creative input you provide." },
      { heading: "2. Music and Lyrics", body: "AI-generated melodies and lyrics produced for you on our platform are provided under a broad commercial license. If you incorporate third-party copyrighted music samples, you are responsible for obtaining appropriate licensing." },
      { heading: "3. Uploaded Content", body: "You represent that all content you upload is either owned by you or properly licensed for the intended use. Uploading copyrighted material without authorization violates our Terms of Service and may expose you to legal liability." },
      { heading: "4. Platform Assets", body: "Ghaafeedi Music's brand assets, platform code, proprietary AI models, and platform design are protected by copyright and may not be reproduced, modified, or distributed without written consent." },
    ],
  },
  "dmca-policy": {
    intro: "Ghaafeedi Music respects intellectual property rights and responds to valid DMCA takedown notices. Effective Date: June 1, 2026.",
    sections: [
      { heading: "1. Filing a DMCA Notice", body: "To report copyright infringement, send a written notice to dmca@ghaafeedimusic.com containing: (a) identification of the copyrighted work; (b) identification of the allegedly infringing material and its location on our platform; (c) your contact information; (d) a statement of good faith belief that the use is unauthorized; (e) a statement under penalty of perjury that the notice is accurate; (f) your physical or electronic signature." },
      { heading: "2. Our Response", body: "On receipt of a valid DMCA notice, we will: (a) remove or disable access to the allegedly infringing content within 48 hours; (b) notify the user who posted the content; (c) forward the notice to the user." },
      { heading: "3. Counter-Notice", body: "If you believe content was removed in error, you may submit a DMCA counter-notice to dmca@ghaafeedimusic.com. If a valid counter-notice is received and the complainant does not initiate legal action within 10 business days, we may restore the content." },
      { heading: "4. Repeat Infringers", body: "We maintain a policy of terminating accounts of repeat copyright infringers in appropriate circumstances." },
      { heading: "5. Contact", body: "DMCA Agent: dmca@ghaafeedimusic.com" },
    ],
  },
  "ai-generated-content": {
    intro: "This policy governs disclosures, ownership, and permitted uses of content produced by artificial intelligence through Ghaafeedi Music's platform. Effective Date: June 1, 2026.",
    sections: [
      { heading: "1. Disclosure of AI Generation", body: "All creative outputs produced through Ghaafeedi Music are AI-generated or AI-assisted. We clearly label AI-generated elements in your production portal. We do not misrepresent AI output as human-created work." },
      { heading: "2. Ownership of AI Outputs", body: "Completed productions (songs, films, visualizations) are delivered to you with a perpetual, worldwide, non-exclusive commercial license. You may use these productions for personal and commercial purposes including streaming, sharing, publication, and sale." },
      { heading: "3. What We Retain", body: "We retain a limited license to display your productions in our portfolio and marketing materials unless you opt out via Account Settings > Privacy > Portfolio Opt-Out. We do not claim copyright ownership over your completed productions." },
      { heading: "4. Model Provenance", body: "We use commercially licensed foundation models including OpenAI GPT-4 series, FAL.ai video generation, and Sunor.cc audio synthesis. These models are operated under their respective commercial licenses." },
      { heading: "5. Limitations", body: "AI-generated content is provided as-is. We cannot guarantee that AI outputs are free from all third-party intellectual property claims. We indemnify you against claims arising from our model selection to the extent of our own liability under applicable law." },
      { heading: "6. Prohibited Downstream Use", body: "You may not use Ghaafeedi Music AI-generated content to: train competing AI models, create non-consensual intimate imagery, produce fraudulent or defamatory material about real individuals." },
    ],
  },
  "community-standards": {
    intro: "Ghaafeedi Music is built on personal stories. These standards exist to protect the dignity of every person whose story is told on our platform. Effective Date: June 1, 2026.",
    sections: [
      { heading: "1. Respect and Dignity", body: "Every production must respect the dignity of all individuals depicted or described. Dehumanizing content, regardless of format, is prohibited." },
      { heading: "2. Consent-First Culture", body: "If your story involves other people, their portrayal must reflect truth or clearly disclose that it is a creative interpretation. Creating productions that could foreseeably harm another person's reputation without basis is prohibited." },
      { heading: "3. No Hate or Discrimination", body: "Content that promotes hatred based on race, ethnicity, nationality, gender, sexual orientation, religion, disability, or any other protected characteristic is strictly prohibited." },
      { heading: "4. No Violence or Threats", body: "Content that threatens harm to individuals, glorifies violence, or is designed to intimidate is prohibited." },
      { heading: "5. Safe Space for Healing", body: "Ghaafeedi Music supports emotional healing through storytelling. We do not tolerate content that exploits grief, trauma, or vulnerability for harmful purposes." },
      { heading: "6. Reporting Violations", body: "To report a violation: support@ghaafeedimusic.com with 'Community Standards Report' in the subject line. We review all reports within 24 hours." },
      { heading: "7. Consequences", body: "Violations may result in content removal, production suspension, temporary restriction, or permanent account termination depending on severity." },
    ],
  },
  "accessibility": {
    intro: "Ghaafeedi Music is committed to making our platform accessible to everyone, regardless of ability or disability. This statement reflects our current status and ongoing commitments. Effective Date: June 1, 2026.",
    sections: [
      { heading: "1. Our Commitment", body: "We are committed to achieving and maintaining conformance with WCAG 2.1 Level AA for our web platform. Accessibility is not an add-on — it is built into our design and engineering process." },
      { heading: "2. Current Status", body: "Our platform currently supports: keyboard navigation for all core features, screen reader compatibility for primary user flows, sufficient color contrast ratios (minimum 4.5:1 for normal text), text scaling up to 200% without loss of content, and descriptive alt text for images." },
      { heading: "3. Known Limitations", body: "Some AI-generated video content does not yet include auto-generated captions. We are actively developing automated captioning for all video productions. Some complex interactive features may have limited screen reader support — we are addressing these in our Q3 2026 accessibility sprint." },
      { heading: "4. Assistive Technology", body: "Our platform is tested with: NVDA + Chrome on Windows, VoiceOver + Safari on macOS/iOS, TalkBack on Android. We welcome reports of compatibility issues with other assistive technologies." },
      { heading: "5. Feedback and Support", body: "If you encounter accessibility barriers, contact us at accessibility@ghaafeedimusic.com. We aim to respond within 2 business days. Alternative format requests (audio descriptions, simplified language versions) will be accommodated within 5 business days." },
      { heading: "6. Third-Party Content", body: "Some third-party features (payment processors, embedded media) may not fully conform to accessibility standards. We advocate for accessibility compliance in our vendor selection process." },
    ],
  },
};

/* ─────────────────────────────────────────────────────────────────────────── */

export default function LegalDocPage() {
  const { doc } = useParams<{ doc: string }>();
  const meta = LEGAL_DOCS.find(d => d.slug === doc);
  const content = DOCS[doc ?? ""];

  if (!meta || !content) {
    return (
      <div style={{ background: "#0A0B0F", minHeight: "100vh" }}>
        <Navbar />
        <div style={{ padding: "120px 40px", textAlign: "center" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", color: "#FFFFFF", fontSize: 40, marginBottom: 20 }}>Document Not Found</h1>
          <Link href="/legal"><a style={{ color: "#D4A574", fontFamily: "Inter, sans-serif" }}>← Back to Legal Center</a></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const allDocs = LEGAL_DOCS;
  const currentIndex = allDocs.findIndex(d => d.slug === doc);
  const prevDoc = allDocs[currentIndex - 1];
  const nextDoc = allDocs[currentIndex + 1];

  return (
    <div style={{ background: "#0A0B0F", minHeight: "100vh", overflowX: "hidden" }}>
      <Navbar />

      {/* Breadcrumb */}
      <div style={{ padding: "80px 40px 0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
            <Link href="/legal"><a style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", fontFamily: "Inter, sans-serif", textDecoration: "none" }}>Legal Center</a></Link>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>›</span>
            <span style={{ fontSize: 13, color: "#D4A574", fontFamily: "Inter, sans-serif" }}>{meta.title}</span>
          </div>

          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}>
            <motion.div variants={FADE_UP} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <span style={{ fontSize: 44 }}>{meta.icon}</span>
              <div>
                <div style={{
                  fontSize: 10, color: "#D4A574", fontFamily: "Inter, sans-serif",
                  fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8,
                }}>{meta.category}</div>
                <h1 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(28px, 4vw, 54px)", fontWeight: 800,
                  color: "#FFFFFF", lineHeight: 1.1,
                }}>{meta.title}</h1>
              </div>
            </motion.div>

            <motion.div variants={FADE_UP} style={{
              display: "flex", gap: 20, alignItems: "center",
              paddingBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.07)",
              marginBottom: 48, flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.35)", fontFamily: "Inter, sans-serif" }}>Last updated: {meta.updated}</span>
              <span style={{
                fontSize: 11, color: "#D4A574", fontFamily: "Inter, sans-serif",
                fontWeight: 600, letterSpacing: "0.12em",
                background: "rgba(212,165,116,0.08)", border: "1px solid rgba(212,165,116,0.2)",
                borderRadius: 999, padding: "4px 12px",
              }}>Effective: June 1, 2026</span>
              <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.35)", fontFamily: "Inter, sans-serif" }}>Jurisdiction: United States</span>
            </motion.div>

            {/* INTRO */}
            <motion.div variants={FADE_UP} style={{
              background: "rgba(212,165,116,0.05)",
              border: "1px solid rgba(212,165,116,0.15)",
              borderRadius: 16, padding: "24px 28px", marginBottom: 40,
            }}>
              <p style={{
                fontSize: 15.5, color: "rgba(255,255,255,0.72)",
                fontFamily: "Inter, sans-serif", lineHeight: 1.82,
                fontStyle: "italic",
              }}>{content.intro}</p>
            </motion.div>

            {/* SECTIONS */}
            {content.sections.map((section, i) => (
              <motion.div key={i} variants={FADE_UP} style={{
                marginBottom: 36,
                paddingBottom: 36,
                borderBottom: i < content.sections.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}>
                <h2 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(18px, 2vw, 24px)", fontWeight: 700,
                  color: "#FFFFFF", marginBottom: 16,
                }}>{section.heading}</h2>

                {Array.isArray(section.body) ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {section.body.map((item, j) => (
                      <li key={j} style={{
                        display: "flex", gap: 12, alignItems: "flex-start",
                        marginBottom: 10,
                      }}>
                        <span style={{ color: "#D4A574", fontSize: 14, marginTop: 3, flexShrink: 0 }}>◆</span>
                        <span style={{
                          fontSize: 14.5, color: "rgba(255,255,255,0.62)",
                          fontFamily: "Inter, sans-serif", lineHeight: 1.76,
                        }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{
                    fontSize: 14.5, color: "rgba(255,255,255,0.62)",
                    fontFamily: "Inter, sans-serif", lineHeight: 1.82,
                  }}>{section.body}</p>
                )}
              </motion.div>
            ))}

            {/* Questions CTA */}
            <motion.div variants={FADE_UP} style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(212,165,116,0.15)",
              borderRadius: 18, padding: "28px 32px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: 20,
              marginBottom: 48,
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", fontFamily: "Inter, sans-serif", marginBottom: 6 }}>Have questions about this policy?</div>
                <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.45)", fontFamily: "Inter, sans-serif" }}>Our legal team responds within 24 hours.</div>
              </div>
              <Link href="/contact">
                <a style={{
                  background: "linear-gradient(135deg, #F8E08A, #D4A574)",
                  color: "#0A0B0F", fontFamily: "Inter, sans-serif",
                  fontWeight: 700, fontSize: 13, letterSpacing: "0.06em",
                  padding: "12px 28px", borderRadius: 10,
                  cursor: "pointer", textDecoration: "none", display: "inline-block",
                }}>Contact Legal Team</a>
              </Link>
            </motion.div>

            {/* Prev / Next */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", paddingBottom: 80 }}>
              {prevDoc ? (
                <Link href={`/legal/${prevDoc.slug}`}>
                  <a style={{
                    padding: "14px 22px",
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12, textDecoration: "none",
                    display: "flex", flexDirection: "column", gap: 4,
                  }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", fontFamily: "Inter, sans-serif" }}>← Previous</span>
                    <span style={{ fontSize: 14, color: "#D4A574", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>{prevDoc.title}</span>
                  </a>
                </Link>
              ) : <div />}

              {nextDoc && (
                <Link href={`/legal/${nextDoc.slug}`}>
                  <a style={{
                    padding: "14px 22px",
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12, textDecoration: "none",
                    display: "flex", flexDirection: "column", gap: 4,
                    textAlign: "right",
                  }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", fontFamily: "Inter, sans-serif" }}>Next →</span>
                    <span style={{ fontSize: 14, color: "#D4A574", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>{nextDoc.title}</span>
                  </a>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
