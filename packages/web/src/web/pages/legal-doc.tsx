import { useParams } from "wouter";
import { Link } from "wouter";

// ─── Document registry ───────────────────────────────────────────────────────
interface Section { heading: string; body: string[] }
interface LegalDoc {
  slug: string;
  title: string;
  subtitle: string;
  effective: string;
  updated: string;
  category: "Customer" | "Rights" | "Internal";
  sections: Section[];
}

const DOCS: Record<string, LegalDoc> = {

  // ═══════════════════════════════════════════════════════
  // DOC 1 — TERMS OF SERVICE
  // ═══════════════════════════════════════════════════════
  "terms-of-service": {
    slug: "terms-of-service",
    title: "Terms of Service and User Agreement",
    subtitle: "Ghaafeedi Music LLC",
    effective: "June 27, 2026",
    updated: "June 27, 2026",
    category: "Customer",
    sections: [
      {
        heading: "PLEASE READ THESE TERMS CAREFULLY",
        body: [
          "PLEASE READ THESE TERMS CAREFULLY BEFORE USING GHAAFEEDI MUSIC. BY CREATING AN ACCOUNT, SUBMITTING A STORY, OR USING ANY SERVICE, YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE, DO NOT USE GHAAFEEDI MUSIC.",
        ],
      },
      {
        heading: "ARTICLE 1 — PARTIES AND ACCEPTANCE",
        body: [
          "1.1 PARTIES\n\nThese Terms of Service ("Terms," "Agreement") constitute a legally binding contract between:\n\n"Ghaafeedi Music" (also "Company," "we," "us," "our"): Ghaafeedi Music LLC, a limited liability company organized under the laws of the State of [STATE], with its principal place of business at [ADDRESS].\n\n"Customer" (also "you," "your," "User"): The individual or entity accessing or using Ghaafeedi Music services, including but not limited to submitting personal stories, ordering songs, ordering music videos, and accessing any delivered creative content.",
          "1.2 ACCEPTANCE OF TERMS\n\nBy doing any of the following, you agree to these Terms:\n(a) Creating a Ghaafeedi Music account\n(b) Accessing the Ghaafeedi Music website or applications\n(c) Submitting a personal story or order\n(d) Clicking "I Agree," "Accept," or any similar button\n(e) Making a payment for any Ghaafeedi Music service\n(f) Accessing or downloading any delivered content\n\nIf you are accepting on behalf of a company or other legal entity, you represent and warrant that you have the authority to bind that entity to these Terms.",
          "1.3 AGE REQUIREMENT\n\nYou must be at least 18 years of age to use Ghaafeedi Music services. If you are between 13 and 17 years of age, you may only use the service with the express consent of and under the supervision of your parent or legal guardian, who must also agree to these Terms on your behalf. We do not knowingly collect information from children under 13.",
          "1.4 MODIFICATIONS TO TERMS\n\nWe reserve the right to modify these Terms at any time. We will provide notice of material changes by:\n(a) Posting the updated Terms on our website\n(b) Sending an email to your registered email address\n(c) Displaying a prominent notice upon login\n\nYour continued use of Ghaafeedi Music after the effective date of any modification constitutes your acceptance of the modified Terms. If you do not agree to modified Terms, you must stop using the service and may request a pro-rated refund of any prepaid services not yet rendered.",
        ],
      },
      {
        heading: "ARTICLE 2 — DESCRIPTION OF SERVICES",
        body: [
          "2.1 CORE SERVICES\n\nGhaafeedi Music provides the following AI-powered creative services ("Services"):\n\n(a) EMOTIONAL STORY ANALYSIS: Using artificial intelligence to analyze the emotional themes, narrative arc, and lyrical potential of customer-submitted personal stories.\n\n(b) ORIGINAL SONG CREATION: Generating original song lyrics and complete musical compositions based on emotional analysis of customer stories, using proprietary AI systems.\n\n(c) MUSIC VIDEO PRODUCTION: Creating original cinematic AI-generated music videos synchronized to the generated song, featuring either: (i) AI-Generated Characters; (ii) Customer Likeness Characters based on customer-submitted photographs, subject to separate consent requirements; or (iii) Combined Characters at additional cost.\n\n(d) CONTENT DELIVERY: Delivery of finished creative works via digital download or streaming link.",
          "2.3 AI-GENERATED CONTENT DISCLOSURE\n\nYou understand and acknowledge that:\n\n(a) All songs, lyrics, music compositions, and video content delivered by Ghaafeedi Music are created using artificial intelligence systems.\n\n(b) AI-generated content may contain imperfections, inconsistencies, or artifacts that differ from traditionally produced content.\n\n(c) Due to the probabilistic nature of AI generation, two orders submitted with identical inputs may produce different outputs.\n\n(d) Ghaafeedi Music makes reasonable commercial efforts to deliver high-quality content but cannot guarantee specific aesthetic outcomes.\n\n(e) Under current U.S. Copyright Office guidance (February 2023 AI Copyright Statement and subsequent guidance), purely AI-generated content may not be eligible for copyright protection. The copyrightability of AI-assisted creative works is an evolving area of law. We recommend consulting an intellectual property attorney regarding the copyright status of your delivered content.",
          "2.4 PRODUCTION TIME\n\nStandard production requires approximately several hours to multiple business days depending on service tier and current demand. These are estimates only. We are not liable for delays caused by: (a) High demand periods; (b) Technical issues beyond our reasonable control; (c) Delayed or incomplete customer submissions; (d) Third-party service disruptions; (e) Force majeure events.",
        ],
      },
      {
        heading: "ARTICLE 3 — ACCOUNT REGISTRATION AND SECURITY",
        body: [
          "3.1 ACCOUNT CREATION\n\nTo use Ghaafeedi Music services, you must create an account by providing: (a) A valid email address; (b) A secure password meeting our requirements; (c) Your legal name as it will appear on consent documents; (d) Your state of residence; (e) Any additional information required for service delivery.\n\nYou must provide accurate, current, and complete information and promptly update your account information if it changes.",
          "3.2 ACCOUNT SECURITY\n\nYou are responsible for: (a) Maintaining the confidentiality of your account credentials; (b) All activities that occur under your account; (c) Immediately notifying us of any unauthorized use at security@ghaafeedimusic.com.\n\nWe will not be liable for any loss resulting from unauthorized use of your account caused by your failure to maintain credential security.",
          "3.3 ONE ACCOUNT PER PERSON\n\nEach person may maintain only one account. Creating multiple accounts to circumvent service limitations, consent requirements, or suspensions is prohibited and may result in termination of all associated accounts.",
          "3.4 ACCOUNT VERIFICATION\n\nWe reserve the right to verify account information at any time and to suspend accounts pending verification. We may require additional documentation to verify your identity, age, or the accuracy of information provided.",
        ],
      },
      {
        heading: "ARTICLE 4 — CUSTOMER SUBMISSIONS",
        body: [
          "4.1 PERSONAL STORY SUBMISSIONS\n\nBy submitting your personal story to Ghaafeedi Music, you:\n\n(a) Grant Ghaafeedi Music a limited, non-exclusive, royalty-free license to process your story through our AI systems solely for the purpose of creating your ordered creative works.\n\n(b) Represent that the story is your own genuine personal experience or that you have the right to submit it.\n\n(c) Represent that the story does not contain any identifiable information about third parties without their consent.\n\n(d) Understand that your story is processed by AI systems and may be reviewed by authorized Ghaafeedi Music staff for quality assurance and safety purposes.",
          "4.2 SUBMISSION CONTENT RESTRICTIONS\n\nYou may NOT submit stories or content that:\n(a) Contain false statements about identifiable real people\n(b) Constitute harassment, threats, or incitement of violence\n(c) Contain sexual content involving minors\n(d) Violate any applicable law\n(e) Contain confidential information about third parties\n(f) Are designed to manipulate AI systems to produce prohibited content\n(g) Constitute spam or are submitted for commercial purposes other than personal creative expression\n(h) Contain detailed personal information about third parties that could be used to identify them",
          "4.3 STORY CONFIDENTIALITY\n\nWe recognize that personal stories may contain sensitive information. We maintain strict confidentiality protocols for all submitted stories. However, we reserve the right to share story content: (a) As required by law, court order, or regulatory requirement; (b) To prevent imminent harm to you or others; (c) As described in our Privacy Policy.",
          "4.4 MANDATORY REPORTING OBLIGATIONS\n\nIn certain circumstances, Ghaafeedi Music and its employees may have mandatory reporting obligations under applicable state law, including but not limited to: (a) Imminent threats of harm to self or others; (b) Disclosures involving child abuse or neglect; (c) Elder abuse in states with mandatory reporting laws. If your submission contains content triggering mandatory reporting obligations, we will comply with applicable law regardless of your consent.",
          "4.5 CRISIS RESOURCES\n\nIf your story involves mental health crises, trauma, or thoughts of self-harm, please also contact:\n• National Suicide Prevention Lifeline: 988\n• Crisis Text Line: Text HOME to 741741\n• National Domestic Violence Hotline: 1-800-799-7233\n• SAMHSA National Helpline: 1-800-662-4357",
        ],
      },
      {
        heading: "ARTICLE 5 — INTELLECTUAL PROPERTY RIGHTS",
        body: [
          "5.1 OWNERSHIP OF DELIVERED CONTENT\n\nUpon full payment for your order, Ghaafeedi Music assigns to you all of its right, title, and interest, if any, in the delivered creative works specifically created for your order, including: (a) The generated song audio file; (b) The generated lyrics; (c) The generated music video file. This assignment is subject to the limitations and reservations set forth in these Terms.",
          "5.2 COPYRIGHT UNCERTAINTY DISCLOSURE\n\nIMPORTANT: As of the date of these Terms, the United States Copyright Office has stated that purely AI-generated content without sufficient human authorship may not be eligible for copyright registration. The amount of human creative contribution required for copyright protection is not yet definitively established by courts.\n\nGhaafeedi Music makes no warranty regarding the copyrightability of the delivered content. We strongly recommend that you: (a) Consult an intellectual property attorney regarding the copyright status of your content; (b) Document the creative contributions you made (your story, emotional direction, thematic choices); (c) Remain informed of developments in AI copyright law.",
          "5.3 LICENSE RETAINED BY GHAAFEEDI MUSIC\n\nNotwithstanding Section 5.1, Ghaafeedi Music retains:\n\n(a) TECHNOLOGY LICENSE: A perpetual, irrevocable license to use, improve, and develop the AI systems and methodologies used to create your content. This does not include the right to use your specific story or delivered content.\n\n(b) PORTFOLIO LICENSE: Subject to your separate written consent, a license to display your delivered content in Ghaafeedi Music's portfolio, marketing materials, and promotional contexts. This license is OPTIONAL and requires your separate affirmative consent.\n\n(c) AGGREGATE ANALYTICS: The right to use aggregate, anonymized data about production processes for system improvement.",
          "5.4 MUSIC RIGHTS AND LICENSING\n\n(a) AI-GENERATED MUSIC: The musical compositions generated by Ghaafeedi Music AI systems do not contain samples of any pre-existing copyrighted musical works. We use original AI generation systems for all musical content.\n\n(b) POYO.AI GENERATED MUSIC: Music generated using Poyo.ai systems is subject to Poyo.ai's terms of service regarding commercial use. We will provide specific notice for orders using Poyo.ai generation.\n\n(c) PERFORMANCE RIGHTS ORGANIZATIONS: Your generated songs are not currently registered with any Performing Rights Organization (PRO) such as ASCAP, BMI, or SESAC. If you wish to commercially exploit your song, you should consult a music attorney regarding PRO registration.\n\n(d) STREAMING PLATFORMS: Policies on AI-generated music vary by streaming platform. Spotify, Apple Music, YouTube, and others have evolving policies. We make no warranty that your content will be accepted by any particular streaming or distribution platform.",
          "5.5 CUSTOMER'S STORY — RETAINED RIGHTS\n\nYou retain all rights to your personal story as you submitted it. Ghaafeedi Music's license to process your story is limited to creating your ordered works and is not an assignment of any rights in your story.",
          "5.6 THIRD PARTY INTELLECTUAL PROPERTY\n\nYou must not submit stories containing: (a) Lyrics, poems, or written works owned by third parties; (b) Requests to recreate specific copyrighted songs; (c) Requests to imitate specific copyrighted artists' style in ways that would constitute infringement; (d) Any content that would infringe third-party intellectual property rights.",
        ],
      },
      {
        heading: "ARTICLE 6 — PAYMENT TERMS",
        body: [
          "6.1 PRICING AND PAYMENT\n\n(a) All prices are listed in United States Dollars (USD).\n(b) Payment is required in full before production begins.\n(c) We accept payment via major credit cards, digital wallets, bank transfer, and cryptocurrency.\n(d) Payment processing is handled by our authorized payment processors, subject to their terms of service.\n(e) By providing payment information, you represent that you are authorized to use the payment method.",
          "6.2 REFUND POLICY\n\nFULL REFUND: A full refund will be issued if: (a) You cancel before production has begun (within 1 hour of order placement); (b) We are unable to complete your order due to technical failure affecting the entire order; (c) The delivered content is materially defective and we cannot correct it within two re-generation attempts.\n\nPARTIAL REFUND: A partial refund (pro-rated based on completed portions) will be issued if: (a) Partial technical failure results in fewer than required shots being successfully generated; (b) Song generation succeeds but video generation fails completely (refund of video portion only).\n\nNO REFUND: No refund is available if: (a) Production is complete and content is delivered; (b) You are dissatisfied with the aesthetic style, creative direction, or emotional interpretation (AI generation is inherently subjective); (c) You provided incorrect or insufficient story information; (d) You violate these Terms and your account is terminated; (e) Cancellation is requested more than 1 hour after order placement and production has begun.",
          "6.3 CHARGEBACKS\n\nInitiating an unauthorized chargeback or payment reversal is a breach of these Terms. We reserve the right to suspend your account pending resolution of any chargeback dispute. We cooperate with payment processors to contest fraudulent chargebacks.",
          "6.4 TAXES\n\nYou are responsible for all applicable taxes on your purchase. We will collect sales tax where required by law.",
          "6.5 PRICING CHANGES\n\nWe reserve the right to change our prices at any time. Price changes will not affect orders already paid and in production.",
        ],
      },
      {
        heading: "ARTICLE 7 — PRIVACY AND DATA PROTECTION",
        body: [
          "7.1 PRIVACY POLICY INCORPORATION\n\nOur Privacy Policy, which is incorporated by reference into these Terms, governs our collection, use, and disclosure of your personal information. Please review the Privacy Policy carefully.",
          "7.2 BIOMETRIC DATA\n\nIf you choose the photo upload option, we collect and process biometric data as described in the Biometric Data Consent Form, which you must sign separately before any biometric processing occurs.",
          "7.3 STORY DATA\n\nYour submitted personal story is:\n(a) Processed by AI to create your ordered works\n(b) Retained for quality assurance purposes\n(c) May be reviewed by authorized staff for safety\n(d) Deleted upon request, subject to legal retention requirements\n(e) Never sold to third parties\n(f) Never used to train AI models without your separate explicit consent",
        ],
      },
      {
        heading: "ARTICLE 8 — PROHIBITED CONDUCT",
        body: [
          "8.1 PROHIBITED ACTIVITIES\n\nYou agree not to:\n\n(a) IMPERSONATION: Submit photos or stories purporting to be another person without their explicit written consent\n\n(b) HARASSMENT: Use Ghaafeedi Music to harass, intimidate, or create content targeting specific identifiable individuals\n\n(c) ILLEGAL CONTENT: Create content that violates any applicable federal, state, or local law\n\n(d) PLATFORM ABUSE: Attempt to reverse engineer, hack, overload, or disrupt Ghaafeedi Music systems\n\n(e) AI MANIPULATION: Attempt to use prompt injection, jailbreaking, or other techniques to cause our AI systems to produce prohibited content\n\n(f) UNAUTHORIZED COMMERCIAL USE: Resell, sublicense, or commercially distribute content in ways not permitted by these Terms without written authorization\n\n(g) ACCOUNT SHARING: Share account credentials with other individuals\n\n(h) FALSE INFORMATION: Provide false information in account registration, story submissions, or consent forms\n\n(i) CIRCUMVENTION: Attempt to circumvent any security measure, consent requirement, or access control\n\n(j) AUTOMATED ACCESS: Use bots, scrapers, or automated systems to access our services without written authorization",
          "8.2 CONSEQUENCES OF VIOLATIONS\n\nViolations of Section 8.1 may result in:\n(a) Immediate account suspension or termination\n(b) Forfeiture of any paid amounts\n(c) Legal action including but not limited to claims for damages, injunctive relief, and attorneys' fees\n(d) Reporting to law enforcement where required by law or deemed appropriate",
        ],
      },
      {
        heading: "ARTICLE 9 — DISCLAIMERS AND LIMITATIONS OF LIABILITY",
        body: [
          "9.1 WARRANTY DISCLAIMER\n\nGHAAFEEDI MUSIC SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO: (a) WARRANTIES OF MERCHANTABILITY; (b) FITNESS FOR A PARTICULAR PURPOSE; (c) NON-INFRINGEMENT; (d) ACCURACY OR COMPLETENESS OF CONTENT; (e) THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE; (f) THAT DEFECTS WILL BE CORRECTED; (g) THAT THE SERVICE IS FREE OF VIRUSES OR HARMFUL COMPONENTS; (h) THAT AI-GENERATED CONTENT WILL MEET YOUR SPECIFIC AESTHETIC EXPECTATIONS; (i) THAT AI-GENERATED CONTENT IS COPYRIGHTABLE OR COMMERCIALLY EXPLOITABLE.",
          "9.2 LIMITATION OF LIABILITY\n\nTO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:\n\n(a) GHAAFEEDI MUSIC'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICES SHALL NOT EXCEED THE GREATER OF: (i) THE TOTAL AMOUNT PAID BY YOU TO GHAAFEEDI MUSIC IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM; OR (ii) ONE HUNDRED DOLLARS ($100.00).\n\n(b) IN NO EVENT SHALL GHAAFEEDI MUSIC BE LIABLE FOR: (i) INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES; (ii) LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL; (iii) COST OF SUBSTITUTE SERVICES; (iv) EMOTIONAL DISTRESS NOT RESULTING FROM PHYSICAL INJURY; (v) ANY DAMAGES ARISING FROM YOUR RELIANCE ON AI-GENERATED CONTENT.",
          "9.3 EXCEPTIONS TO LIMITATIONS\n\nNOTHING IN THESE TERMS LIMITS LIABILITY FOR: (a) Death or personal injury caused by our negligence; (b) Fraud or fraudulent misrepresentation; (c) Violations of applicable consumer protection laws where such limitations are prohibited; (d) Violations of the Illinois Biometric Information Privacy Act (740 ILCS 14/) where applicable; (e) Any liability that cannot be limited under applicable law.",
          "9.4 BASIS OF THE BARGAIN\n\nYOU ACKNOWLEDGE THAT GHAAFEEDI MUSIC HAS SET ITS PRICES AND ENTERED INTO THESE TERMS IN RELIANCE UPON THE LIMITATIONS OF LIABILITY AND DISCLAIMERS SET FORTH HEREIN, AND THAT THESE TERMS FORM AN ESSENTIAL BASIS OF THE BARGAIN BETWEEN THE PARTIES.",
        ],
      },
      {
        heading: "ARTICLE 10 — INDEMNIFICATION",
        body: [
          "10.1 CUSTOMER INDEMNIFICATION\n\nYou agree to indemnify, defend, and hold harmless Ghaafeedi Music LLC, its members, managers, officers, employees, agents, licensors, and service providers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to:\n\n(a) Your violation of these Terms\n(b) Your submission of false, misleading, or unauthorized content or information\n(c) Your unauthorized upload of another person's photograph\n(d) Your breach of any representation or warranty\n(e) Your violation of any third party's rights including right of publicity, privacy rights, or intellectual property rights\n(f) Your violation of any applicable law or regulation\n(g) Any claim by a third party that they appear in your submitted content without their consent\n(h) Your use of delivered content in any manner that violates applicable law",
          "10.2 COOPERATION\n\nWe reserve the right to assume exclusive control of any matter subject to indemnification by you, and you agree to cooperate with our defense of such claims.",
        ],
      },
      {
        heading: "ARTICLE 11 — DISPUTE RESOLUTION",
        body: [
          "11.1 INFORMAL RESOLUTION\n\nBefore initiating formal dispute proceedings, you agree to attempt to resolve any dispute informally by contacting us at legal@ghaafeedimusic.com. We will attempt to resolve the dispute within thirty (30) days of receiving notice.",
          "11.2 BINDING ARBITRATION\n\nIF INFORMAL RESOLUTION FAILS, YOU AND GHAAFEEDI MUSIC AGREE THAT ANY DISPUTE, CLAIM, OR CONTROVERSY ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICES WILL BE RESOLVED BY BINDING ARBITRATION RATHER THAN IN COURT, EXCEPT AS PROVIDED IN SECTION 11.4.\n\nArbitration Procedures: (a) Arbitration will be conducted by the American Arbitration Association (AAA) under its Consumer Arbitration Rules; (b) The arbitration will be conducted in English; (c) The arbitrator's decision will be final and binding; (d) Each party will bear its own arbitration costs, except as required by AAA rules for consumer disputes; (e) The arbitrator may award the same damages and relief that a court could award.",
          "11.3 CLASS ACTION WAIVER\n\nTO THE MAXIMUM EXTENT PERMITTED BY LAW, YOU WAIVE YOUR RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION AGAINST GHAAFEEDI MUSIC. ALL DISPUTES MUST BE BROUGHT IN YOUR INDIVIDUAL CAPACITY.\n\nNOTE: This class action waiver does not apply to claims under California Private Attorneys General Act (PAGA) or where otherwise prohibited by law. California residents retain rights under applicable California law.",
          "11.4 EXCEPTIONS TO ARBITRATION\n\nEither party may bring individual claims in small claims court if the claim qualifies. Either party may seek emergency injunctive relief in any court of competent jurisdiction to prevent irreparable harm pending arbitration.",
          "11.5 GOVERNING LAW\n\nThese Terms are governed by the laws of the State of [STATE], without regard to conflict of law principles, except that the Federal Arbitration Act governs all arbitration provisions.",
          "11.6 JURISDICTION\n\nFor any matters not subject to arbitration, you consent to the exclusive jurisdiction of the state and federal courts located in [COUNTY], [STATE].",
          "11.7 TIME LIMITATION\n\nAny claim arising out of these Terms must be brought within one (1) year of the date the claim arose, or it is permanently barred.",
        ],
      },
      {
        heading: "ARTICLE 12 — TERMINATION",
        body: [
          "12.1 TERMINATION BY YOU\n\nYou may terminate your account at any time by contacting support@ghaafeedimusic.com. Termination does not entitle you to a refund for completed orders. Pending orders will be completed and delivered.",
          "12.2 TERMINATION BY GHAAFEEDI MUSIC\n\nWe may suspend or terminate your account immediately for: (a) Violation of these Terms; (b) Conduct that we determine poses a risk to other users, third parties, or Ghaafeedi Music; (c) Fraudulent activity; (d) Non-payment; (e) Regulatory or legal requirements; (f) Upon request by law enforcement.",
          "12.3 EFFECT OF TERMINATION\n\nUpon termination: (a) Your access to the service ceases immediately; (b) Licenses granted to you terminate for future use but do not affect already-delivered content; (c) We retain your information as required by law and as described in our Privacy Policy; (d) Provisions of these Terms that by their nature should survive will survive termination.",
        ],
      },
      {
        heading: "ARTICLE 13 — GENERAL PROVISIONS",
        body: [
          "13.1 ENTIRE AGREEMENT\n\nThese Terms, together with our Privacy Policy, Acceptable Use Policy, and any signed Consent Forms, constitute the entire agreement between you and Ghaafeedi Music regarding the Services.",
          "13.2 SEVERABILITY\n\nIf any provision of these Terms is found unenforceable by a court or arbitrator, that provision will be modified to the minimum extent necessary to make it enforceable, and the remaining provisions will continue in full force and effect.",
          "13.3 WAIVER\n\nOur failure to enforce any right or provision of these Terms will not constitute a waiver of that right or provision.",
          "13.4 ASSIGNMENT\n\nYou may not assign your rights under these Terms without our written consent. We may assign our rights to any affiliate, acquirer, or successor.",
          "13.5 FORCE MAJEURE\n\nWe will not be liable for any delay or failure to perform resulting from causes beyond our reasonable control, including but not limited to acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, pandemics, strikes, or failures of third-party services including AI generation platforms, cloud providers, or payment processors.",
          "13.6 NOTICES\n\nNotices to Ghaafeedi Music must be sent to: legal@ghaafeedimusic.com",
          "13.7 ELECTRONIC COMMUNICATIONS\n\nYou consent to receive electronic communications from Ghaafeedi Music. These electronic communications satisfy any legal requirement that such communications be in writing.",
          "13.8 CONTACT INFORMATION\n\nGeneral Support: support@ghaafeedimusic.com\nLegal Inquiries: legal@ghaafeedimusic.com\nPrivacy Inquiries: privacy@ghaafeedimusic.com\nSecurity Issues: security@ghaafeedimusic.com",
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // DOC 2 — PRIVACY POLICY
  // ═══════════════════════════════════════════════════════
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Comprehensive Privacy Policy",
    subtitle: "Ghaafeedi Music LLC",
    effective: "June 27, 2026",
    updated: "June 27, 2026",
    category: "Customer",
    sections: [
      {
        heading: "SCOPE",
        body: [
          "This Privacy Policy describes how Ghaafeedi Music LLC ("Ghaafeedi Music," "we," "us," "our") collects, uses, shares, and protects your personal information when you use our services.\n\nSCOPE: This policy applies to all Ghaafeedi Music services including our website, mobile applications, and all customer interactions.",
        ],
      },
      {
        heading: "SECTION 1 — INFORMATION WE COLLECT",
        body: [
          "1.1 INFORMATION YOU PROVIDE DIRECTLY\n\nACCOUNT INFORMATION:\n• Full legal name\n• Email address\n• Password (stored in encrypted hash form only)\n• State of residence\n• Payment information (processed by payment processor; we do not store full payment card numbers)\n• Phone number (optional)\n\nORDER INFORMATION:\n• Personal stories you submit\n• Creative preferences and instructions\n• Communication with our support team\n• Order history and production status\n\nCONSENT FORM INFORMATION:\n• Electronic signature data\n• Typed name as provided on consent forms\n• Acknowledgment records for all required disclosures\n• Timestamp and form version of all consents",
          "BIOMETRIC INFORMATION (PHOTO UPLOAD CUSTOMERS ONLY):\n• Uploaded photographs\n• Facial geometry measurements derived from photographs\n• Face embedding vectors computed for consistency purposes\n• Selfie photographs submitted for identity verification\n\nThis information is subject to our separate Biometric Data Consent Form which you must sign before it is collected.\n\nIDENTITY VERIFICATION INFORMATION:\n• Information provided during verification process\n• Verification outcomes and risk assessments\n• IP address and device information at time of verification",
          "1.2 INFORMATION COLLECTED AUTOMATICALLY\n\nTECHNICAL DATA:\n• IP address\n• Browser type and version\n• Device type, model, and operating system\n• Device identifiers\n• Cookie identifiers\n• Pages visited and features used\n• Time and date of visits\n• Referring URLs\n• Error logs and performance data\n\nLOG DATA:\n• Server logs from all system interactions\n• API request logs (anonymized after 90 days)\n• Security event logs (retained per legal requirements)",
          "1.3 INFORMATION FROM THIRD PARTIES\n\nPAYMENT PROCESSORS: We receive confirmation of payment status from our payment processors. We do not receive full payment card numbers.\n\nACCOUNT AUTHENTICATION: If you use social login (if offered), we receive basic profile information from the authentication provider.",
        ],
      },
      {
        heading: "SECTION 2 — HOW WE USE YOUR INFORMATION",
        body: [
          "2.1 PRIMARY PURPOSES\n\nSERVICE DELIVERY:\n• Processing your personal story through AI analysis\n• Generating song lyrics and musical compositions\n• Producing music videos based on your order\n• Delivering completed creative works to you\n• Maintaining your account and order history\n\nLEGAL COMPLIANCE:\n• Fulfilling consent form requirements\n• Maintaining records required by BIPA and other laws\n• Responding to legal requests\n• Fraud prevention and security",
          "2.2 SECONDARY PURPOSES\n\nCOMMUNICATIONS:\n• Order status notifications\n• Customer support responses\n• Service announcements\n• Marketing communications (with your consent)\n\nQUALITY AND IMPROVEMENT:\n• Monitoring service quality\n• Identifying and fixing technical issues\n• Aggregate usage analysis (anonymized)\n• Internal research and development\n\nSAFETY:\n• Detecting and preventing fraud\n• Protecting against unauthorized access\n• Monitoring for prohibited content\n• Fulfilling mandatory reporting obligations",
          "2.3 LEGAL BASES FOR PROCESSING (ALL JURISDICTIONS)\n\nWe process your information based on:\n• Contract performance (delivering your ordered services)\n• Legal obligation (biometric laws, tax requirements)\n• Legitimate interest (security, fraud prevention)\n• Consent (marketing, optional data collection)\n• Vital interests (emergency safety situations)",
        ],
      },
      {
        heading: "SECTION 3 — INFORMATION SHARING",
        body: [
          "3.1 WE DO NOT SELL YOUR PERSONAL INFORMATION\n\nGhaafeedi Music does not sell, rent, or trade your personal information to third parties for their marketing purposes.\n\nCalifornia residents: We do not "sell" personal information as defined under the CCPA/CPRA.",
          "3.2 SERVICE PROVIDERS\n\nWe share information with trusted service providers who help us operate our services:\n\nCLOUD INFRASTRUCTURE: Cloud hosting providers for servers and storage; GPU computing providers for AI processing; Content delivery networks.\n\nPAYMENT PROCESSING: Payment processors for transaction handling; Fraud detection services.\n\nCOMMUNICATIONS: Email delivery services for notifications.\n\nAI GENERATION SERVICES: When applicable, song and video generation services subject to their respective privacy policies.\n\nAll service providers are contractually required to: process data only as instructed by us; implement appropriate security measures; not use data for their own purposes; comply with applicable privacy laws.",
          "3.3 LEGAL REQUIREMENTS\n\nWe may disclose your information: in response to valid legal process (subpoenas, court orders, government requests); to comply with mandatory reporting obligations; to protect rights, property, or safety of Ghaafeedi Music, our users, or the public; in connection with legal proceedings. We will notify you of legal process requests where permitted by law.",
          "3.4 BUSINESS TRANSFERS\n\nIf Ghaafeedi Music is involved in a merger, acquisition, or sale of assets, your information may be transferred. We will notify you before your information is transferred and subject to a different privacy policy.",
          "3.5 AGGREGATED DATA\n\nWe may share aggregated, anonymized data that cannot reasonably identify you with partners, researchers, or the public.",
        ],
      },
      {
        heading: "SECTION 4 — DATA RETENTION",
        body: [
          "4.1 RETENTION SCHEDULE\n\nACCOUNT DATA: Active accounts retained while account is active plus 3 years after account closure. Reason: Legal claims and dispute resolution.\n\nORDER AND STORY DATA: Retained for 2 years after order delivery. Stories may be anonymized after 90 days upon request.\n\nBIOMETRIC DATA: Retained for the shorter of: 3 years from consent date OR until deletion is requested OR until the purpose for collection is fulfilled plus 30 days. Reason: Illinois BIPA and similar state law requirements.\n\nCONSENT RECORDS: Retained for 5 years from signature date. Reason: Legal compliance and dispute defense.\n\nAUDIT LOGS: Security events: 7 years. Access logs: 3 years. Payment records: 7 years (IRS requirements).",
          "4.2 DELETION PROCESS\n\nWhen data is scheduled for deletion: data is securely overwritten using industry-standard methods; deletion is logged in our compliance records; third-party service providers are instructed to delete.",
        ],
      },
      {
        heading: "SECTION 5 — YOUR PRIVACY RIGHTS",
        body: [
          "5.1 UNIVERSAL RIGHTS (ALL USERS)\n\nRegardless of your location, you have the right to:\n\nRIGHT TO KNOW: Request information about what personal data we hold about you and how it is used.\n\nRIGHT TO CORRECT: Request correction of inaccurate personal information.\n\nRIGHT TO DELETE: Request deletion of your personal information, subject to legal retention requirements.\n\nRIGHT TO OPT OUT OF MARKETING: Unsubscribe from marketing communications at any time via the unsubscribe link in any email or by contacting us.",
          "5.2 CALIFORNIA RESIDENTS (CCPA/CPRA)\n\nIn addition to universal rights, California residents have:\n\nRIGHT TO KNOW (DETAILED): The specific pieces of personal information collected, categories of sources, business purposes for collection, and categories of third parties with whom it is shared.\n\nRIGHT TO CORRECT: Correct inaccurate personal information.\n\nRIGHT TO DELETE: Delete personal information, with limited exceptions for legal obligations.\n\nRIGHT TO OPT OUT OF SALE/SHARING: We do not sell or share personal information for cross-context behavioral advertising. No opt-out needed, but you may submit a "do not sell" request for documentation.\n\nRIGHT TO LIMIT SENSITIVE PERSONAL INFORMATION USE: Limit use of sensitive personal information including biometric data, to purposes necessary for service delivery.\n\nRIGHT TO NON-DISCRIMINATION: We will not discriminate against you for exercising privacy rights.",
          "5.3 ILLINOIS RESIDENTS (BIPA)\n\nIllinois residents have additional rights regarding biometric information:\n• Right to receive written notice before biometric data collection\n• Right to receive this Privacy Policy before collection\n• Right to know the specific purpose and length of collection and storage\n• Private right of action for BIPA violations with liquidated damages of $1,000 per negligent violation and $5,000 per intentional or reckless violation",
          "5.4 OTHER STATE RIGHTS\n\nTEXAS (CUBI): Rights regarding capture and use of biometric identifiers consistent with Texas law.\n\nVIRGINIA (VCDPA): Rights to access, correct, delete, portability, and opt out of certain processing.\n\nCOLORADO (CPA): Rights to access, correction, deletion, portability, and opt out.\n\nCONNECTICUT (CTDPA): Access, correction, deletion, portability, and opt-out rights.\n\nWASHINGTON (My Health MY Data): Rights regarding consumer health data.\n\nWe honor all applicable state privacy rights. If your state is not listed, contact us and we will advise on applicable rights.",
          "5.5 EXERCISING YOUR RIGHTS\n\nTo exercise any privacy right:\nEmail: privacy@ghaafeedimusic.com\nSubject line: Privacy Rights Request — [Type of Request]\nInclude: Your name, email address, account ID, and specific request\n\nResponse time:\n• California: Within 45 days (extendable by 45 days with notice)\n• All other states: Within 45 days\n• Illinois biometric requests: Within 30 days\n\nIdentity Verification: We will verify your identity before fulfilling access or deletion requests. This is for your protection.",
          "5.6 APPEALS PROCESS\n\nIf we deny your privacy rights request, you may appeal by emailing legal@ghaafeedimusic.com within 60 days of receiving our denial. We will respond within 45 days.",
        ],
      },
      {
        heading: "SECTION 6 — SECURITY",
        body: [
          "6.1 SECURITY MEASURES\n\nENCRYPTION:\n• AES-256 encryption for all stored personal data\n• TLS 1.3 for all data in transit\n• End-to-end encryption for biometric data\n• Encrypted consent record storage with HMAC integrity\n\nACCESS CONTROLS:\n• Role-based access controls for all systems\n• Multi-factor authentication required for all Ghaafeedi Music staff accessing production systems\n• Audit logging of all data access\n• Principle of least privilege for all system access\n\nINCIDENT RESPONSE:\n• 24/7 security monitoring\n• Documented incident response procedures\n• Breach notification within 72 hours as required by law",
          "6.2 DATA BREACH NOTIFICATION\n\nIn the event of a data breach affecting your personal information, we will:\n(a) Notify affected individuals within 72 hours of discovery (or as required by applicable law)\n(b) Notify relevant regulatory authorities as required\n(c) Provide information about what was affected and what steps you can take\n(d) Take immediate steps to contain and remediate",
        ],
      },
      {
        heading: "SECTION 7 — CHILDREN'S PRIVACY",
        body: [
          "7.1 AGE RESTRICTION\n\nOur primary services are intended for users 18 and older.",
          "7.2 USERS 13-17\n\nUsers between 13 and 17 may use the service only with verified parental consent. We require parents or guardians to complete account creation for minors.",
          "7.3 CHILDREN UNDER 13\n\nWe do not knowingly collect personal information from children under 13. If we discover we have collected such information without verified parental consent, we will delete it immediately. If you believe we have collected information from a child under 13, contact privacy@ghaafeedimusic.com immediately.",
          "7.4 STORIES MENTIONING MINORS\n\nIf your personal story mentions minor children, do not include their full names, schools, or other identifying information. Stories mentioning child abuse, neglect, or exploitation may trigger mandatory reporting obligations.",
        ],
      },
      {
        heading: "SECTION 8 — INTERNATIONAL USERS",
        body: [
          "8.1 SERVICE LOCATION\n\nGhaafeedi Music operates from the United States. By using our services, you understand that your information will be processed in the United States, which may not provide the same level of data protection as your home country.",
          "8.2 EUROPEAN USERS (GDPR)\n\nIf you are located in the European Economic Area or United Kingdom, additional rights and protections apply under GDPR/UK GDPR. Contact us for information on our GDPR compliance measures and legal basis for processing.",
          "8.3 INTERNATIONAL TRANSFERS\n\nAny transfer of data outside the United States will be conducted with appropriate safeguards including Standard Contractual Clauses where required.",
        ],
      },
      {
        heading: "SECTION 9 — COOKIES AND TRACKING",
        body: [
          "9.1 COOKIES WE USE\n\nSTRICTLY NECESSARY: Session management cookies (cannot be disabled); Security cookies for CSRF protection; Authentication cookies.\n\nFUNCTIONAL: User preference cookies (language, settings); Order progress tracking.\n\nANALYTICS: Usage analytics (anonymized where possible); Error tracking.\n\nMARKETING (ONLY WITH CONSENT): We do not use third-party advertising cookies without your explicit consent.",
          "9.2 COOKIE MANAGEMENT\n\nYou can manage cookies through your browser settings. Disabling strictly necessary cookies will impair service functionality.",
          "9.3 DO NOT TRACK\n\nWe honor Do Not Track signals. When DNT is enabled, we disable analytics tracking for your session.",
        ],
      },
      {
        heading: "SECTION 10 — CONTACT AND UPDATES",
        body: [
          "10.1 PRIVACY CONTACT\n\nData Controller: Ghaafeedi Music LLC\nEmail: privacy@ghaafeedimusic.com",
          "10.2 POLICY UPDATES\n\nWe will notify you of material changes to this policy by email and by posting the updated policy with a new effective date. Your continued use after the effective date constitutes acceptance.",
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // DOC 3 — ACCEPTABLE USE POLICY
  // ═══════════════════════════════════════════════════════
  "acceptable-use-policy": {
    slug: "acceptable-use-policy",
    title: "Acceptable Use Policy",
    subtitle: "Ghaafeedi Music LLC",
    effective: "June 27, 2026",
    updated: "June 27, 2026",
    category: "Customer",
    sections: [
      {
        heading: "SECTION 1 — PERMITTED USE",
        body: [
          "1.1 PERMITTED ACTIVITIES\n\nYou may use Ghaafeedi Music to:\n• Submit your genuine personal life experiences and stories\n• Order songs and music videos based on your experiences\n• Share your delivered content for personal, non-commercial purposes subject to platform terms where shared\n• Submit stories about relationships, emotions, and life events that are truthful and your own\n• Submit stories involving difficult emotional themes including grief, heartbreak, trauma, addiction recovery, and similar personal experiences, treated with honesty and appropriate context",
        ],
      },
      {
        heading: "SECTION 2 — PROHIBITED CONTENT",
        body: [
          "2.1 ABSOLUTELY PROHIBITED — ZERO TOLERANCE\n\nThe following content is absolutely prohibited under all circumstances and will result in immediate account termination and potential legal action:\n\n(a) CHILD SEXUAL ABUSE MATERIAL (CSAM): Any content that sexually depicts, exploits, or endangers minors. ALL such content will be reported to the National Center for Missing and Exploited Children (NCMEC) and law enforcement immediately.\n\n(b) NON-CONSENSUAL INTIMATE IMAGERY: Requests to create sexual content depicting real identifiable individuals without verified consent.\n\n(c) TERRORISM AND VIOLENT EXTREMISM: Content that promotes, glorifies, or facilitates terrorist acts or mass violence.\n\n(d) HUMAN TRAFFICKING: Content that facilitates or promotes human trafficking or sexual exploitation.\n\n(e) IMPERSONATION FOR HARM: Submitting another person's likeness without consent for purposes of harassment, defamation, or fraud.",
          "2.2 PROHIBITED WITHOUT EXPLICIT AUTHORIZATION\n\nThe following requires special authorization from Ghaafeedi Music before submission:\n\n(a) CELEBRITY OR PUBLIC FIGURE CONTENT: Stories or requests to incorporate the likeness of celebrities, public figures, politicians, or athletes.\n\n(b) MINOR CONSENT ORDERS: Stories for music videos that will prominently feature the likeness of a minor (requires additional guardian consent documentation).\n\n(c) COMMERCIAL BRAND CONTENT: Stories intended primarily for commercial brand promotion rather than personal expression.",
          "2.3 GENERALLY PROHIBITED\n\nThe following is prohibited in customer submissions:\n\n(a) DEFAMATORY CONTENT: False statements of fact about identifiable real people that could damage their reputation.\n\n(b) HARASSMENT: Content specifically designed to harass, intimidate, or harm a specific individual.\n\n(c) HATE SPEECH: Content that attacks people based on protected characteristics including race, ethnicity, national origin, religion, gender, sexual orientation, disability, or similar characteristics.\n\n(d) GRAPHIC VIOLENCE: Glorification of extreme violence or content designed to shock rather than express genuine emotion.\n\n(e) PRIVATE INFORMATION: Including private, non-public personal information about identifiable third parties without their consent.\n\n(f) MEDICAL PROFESSIONAL IMPERSONATION: Requesting medical diagnoses, treatment advice, or content that impersonates medical professionals.\n\n(g) FRAUDULENT CONTENT: Stories that misrepresent events to induce false emotional responses or that are submitted for fraudulent purposes.",
        ],
      },
      {
        heading: "SECTION 3 — SENSITIVE CONTENT — HANDLED WITH CARE",
        body: [
          "3.1 PERMITTED SENSITIVE THEMES\n\nWe understand that deeply personal stories often involve difficult topics. The following sensitive themes ARE permitted when handled with authenticity and are part of your genuine personal experience:\n\n• Grief and loss (death, divorce, separation)\n• Trauma recovery (abuse survival, assault recovery)\n• Mental health journeys (depression, anxiety, recovery)\n• Addiction and sobriety stories\n• Relationship pain and heartbreak\n• Racial and cultural identity\n• Religious and spiritual experiences\n• Political and social justice personal experiences\n• Medical diagnosis and recovery\n• Poverty, struggle, and economic hardship\n• LGBTQ+ identity and experiences",
          "3.2 GUIDELINES FOR SENSITIVE CONTENT\n\nWhen submitting sensitive content:\n• Write from your own genuine experience\n• Focus on emotional truth rather than graphic detail\n• Do not include identifying information about others without their consent\n• If writing about another person's trauma, obtain their permission first",
          "3.3 MENTAL HEALTH AND CRISIS CONTENT\n\nStories involving mental health crises, suicidal ideation, or self-harm are approached with care and compassion. We will:\n• Process these stories with additional content sensitivity\n• Include crisis resource information in your delivery\n• In situations indicating imminent danger, contact emergency services as required by law",
        ],
      },
      {
        heading: "SECTION 4 — ENFORCEMENT",
        body: [
          "4.1 CONTENT REVIEW\n\nAll submissions are reviewed by automated systems and may be reviewed by authorized human staff. We use a combination of: AI content classification; Keyword and pattern detection; Random quality assurance review; User reports.",
          "4.2 ENFORCEMENT ACTIONS\n\nDepending on violation severity, we may:\n• Request clarification or modification of submission\n• Reject a specific submission while maintaining account\n• Issue a formal warning\n• Temporarily suspend account\n• Permanently terminate account\n• Withhold delivery of content pending review\n• Report to appropriate authorities",
          "4.3 APPEALS\n\nYou may appeal content enforcement decisions by contacting legal@ghaafeedimusic.com within 30 days of the decision. Appeals are reviewed by a different team member than the original decision-maker.",
          "4.4 REPORTING VIOLATIONS\n\nTo report a violation of this AUP by another user, contact trust@ghaafeedimusic.com. We review all credible reports.",
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // DOC 4 — DMCA POLICY
  // ═══════════════════════════════════════════════════════
  "dmca-policy": {
    slug: "dmca-policy",
    title: "Digital Millennium Copyright Act Policy",
    subtitle: "Ghaafeedi Music LLC",
    effective: "June 27, 2026",
    updated: "June 27, 2026",
    category: "Customer",
    sections: [
      {
        heading: "SECTION 1 — DESIGNATED AGENT",
        body: [
          "Ghaafeedi Music LLC has registered a designated agent with the United States Copyright Office pursuant to 17 U.S.C. § 512(c)(2).\n\nDESIGNATED COPYRIGHT AGENT:\nCompany: Ghaafeedi Music LLC\nEmail: dmca@ghaafeedimusic.com\n\nThe designated agent is registered at copyright.gov/dmca-directory as required by law.",
        ],
      },
      {
        heading: "SECTION 2 — TAKEDOWN NOTICE REQUIREMENTS",
        body: [
          "2.1 VALID TAKEDOWN NOTICE\n\nTo submit a valid DMCA takedown notice, the copyright owner or authorized agent must provide ALL of the following:\n\n(a) IDENTIFICATION OF WORK: Identification of the copyrighted work claimed to be infringed, or if multiple works are covered by a single notification, a representative list of such works.\n\n(b) IDENTIFICATION OF MATERIAL: Identification of the material claimed to be infringing and information reasonably sufficient to permit us to locate the material.\n\n(c) CONTACT INFORMATION: Your contact information, including name, address, telephone number, and email address.\n\n(d) GOOD FAITH STATEMENT: A statement that you have a good faith belief that use of the material is not authorized by the copyright owner, its agent, or the law.\n\n(e) ACCURACY STATEMENT: A statement, made under penalty of perjury, that the information in the notification is accurate and that you are the copyright owner or are authorized to act on behalf of the copyright owner.\n\n(f) SIGNATURE: Physical or electronic signature of the copyright owner or authorized agent.",
          "2.2 SEND NOTICE TO\n\nEmail: dmca@ghaafeedimusic.com (preferred)",
          "2.3 FRAUDULENT NOTICES\n\nBe aware that under 17 U.S.C. § 512(f), any person who knowingly materially misrepresents that content is infringing may be subject to liability for damages, including costs and attorneys' fees.",
        ],
      },
      {
        heading: "SECTION 3 — OUR RESPONSE PROCEDURES",
        body: [
          "3.1 RECEIPT AND REVIEW\n\nUpon receiving a complete and valid notice:\n(a) We will acknowledge receipt within 2 business days\n(b) We will review the notice for completeness\n(c) If complete, we will remove or disable access to the allegedly infringing content promptly\n(d) We will notify the customer who submitted the relevant content",
          "3.2 INCOMPLETE NOTICES\n\nIf a notice is incomplete, we will contact the submitter to obtain missing information. The notice is not considered received until complete.",
        ],
      },
      {
        heading: "SECTION 4 — COUNTER-NOTIFICATION PROCEDURES",
        body: [
          "4.1 CUSTOMER COUNTER-NOTICE\n\nIf you believe content was removed in error, you may submit a counter-notification containing:\n\n(a) Your physical or electronic signature\n(b) Identification of the material removed and the location where it appeared before removal\n(c) A statement under penalty of perjury that you have a good faith belief that the material was removed as a result of mistake or misidentification\n(d) Your name, address, and telephone number\n(e) A statement that you consent to the jurisdiction of the Federal District Court for the judicial district in which your address is located, and that you will accept service of process from the complaining party",
          "4.2 COUNTER-NOTICE EFFECT\n\nUpon receiving a valid counter-notice:\n(a) We will forward it to the original complainant\n(b) We will restore the removed content within 10-14 business days unless the complainant files a court action seeking an injunction",
        ],
      },
      {
        heading: "SECTION 5 — REPEAT INFRINGER POLICY",
        body: [
          "In accordance with 17 U.S.C. § 512(i), Ghaafeedi Music maintains a policy of terminating accounts of users who are repeat copyright infringers.\n\nA user will be considered a repeat infringer when:\n(a) We receive two or more valid DMCA takedown notices relating to content associated with their account within any 12-month period; OR\n(b) We determine the user is engaging in a pattern of copyright infringement\n\nRepeat infringers will have their accounts terminated and will be banned from creating new accounts.",
        ],
      },
      {
        heading: "SECTION 6 — AI-GENERATED CONTENT AND COPYRIGHT",
        body: [
          "6.1 OUR AI GENERATION APPROACH\n\nGhaafeedi Music's AI generation systems are designed to:\n• Generate original musical compositions, not reproduce existing copyrighted works\n• Not train on specific copyrighted works for the purpose of reproduction\n• Create novel content based on emotional and thematic prompts",
          "6.2 LIMITATION\n\nDespite our best efforts, AI systems may occasionally generate content with superficial similarities to existing works. If you believe AI-generated content in your delivery infringes a copyright you hold, please contact us at dmca@ghaafeedimusic.com before sending a formal DMCA notice, as we can often resolve these issues without formal proceedings.",
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // DOC 5 — MUSIC & VIDEO RIGHTS
  // ═══════════════════════════════════════════════════════
  "music-video-rights": {
    slug: "music-video-rights",
    title: "Music and Video Intellectual Property Rights Policy",
    subtitle: "Ghaafeedi Music LLC",
    effective: "June 27, 2026",
    updated: "June 27, 2026",
    category: "Rights",
    sections: [
      {
        heading: "SECTION 1 — CURRENT STATE OF AI COPYRIGHT LAW",
        body: [
          "1.1 MANDATORY DISCLOSURE\n\nThe copyright status of AI-generated creative works is currently unsettled under United States law. We are required by our commitment to transparency to disclose the following:\n\n(a) U.S. COPYRIGHT OFFICE POSITION (2023–2026): The Copyright Office has stated that works generated entirely by AI without human authorship cannot be registered for copyright protection. Only works with "sufficient human authorship" qualify.\n\n(b) WHAT THIS MEANS FOR YOUR CONTENT: Your delivered song and music video may have limited or no copyright protection as purely AI-generated works. The human creative elements (your story, your emotional direction, your thematic choices) may support a copyright claim for those specific contributions.\n\n(c) LEGAL UNCERTAINTY: Courts have not yet definitively addressed the copyrightability of AI-assisted works at scale. The law is developing rapidly and may change.\n\n(d) OUR RECOMMENDATION: Consult a qualified intellectual property attorney for advice specific to your intended use of your delivered content.",
          "1.2 INDUSTRY CONTEXT\n\nYou should be aware that:\n• The Recording Industry Association of America (RIAA) has filed lawsuits against AI music companies\n• Several music streaming platforms have evolving policies on AI-generated content\n• The music licensing landscape for AI content is rapidly changing\n• PRO (Performing Rights Organization) treatment of AI-generated compositions is unsettled",
        ],
      },
      {
        heading: "SECTION 2 — RIGHTS GRANTED TO CUSTOMERS",
        body: [
          "2.1 GRANT OF RIGHTS\n\nUpon full payment and delivery of your order, Ghaafeedi Music grants you the following rights to the extent we have such rights to grant:\n\n(a) PERSONAL USE: Unlimited personal, non-commercial use of your delivered content.\n\n(b) SOCIAL MEDIA SHARING: The right to share your delivered content on personal social media accounts, including but not limited to YouTube, TikTok, Instagram, Facebook, and Twitter/X, subject to those platforms' terms of service regarding AI-generated content.\n\n(c) PRIVATE DISTRIBUTION: Sharing with friends, family, and private groups.\n\n(d) MONETIZATION: Subject to the uncertainties described in Section 1, you may attempt to monetize your content on platforms that permit AI-generated content monetization. We make no warranty that any platform will permit monetization.\n\n(e) COMMERCIAL USE: Subject to separate Commercial License (see Section 2.3), limited commercial use is permitted for personal brand or small business promotion directly related to the story in the video.",
          "2.2 RESTRICTIONS\n\nYou may NOT:\n(a) Claim the music or video was created without AI assistance in any commercial or legal context\n(b) Register the work with a PRO without disclosing the AI-generated nature\n(c) Submit the work to copyright registration as purely human-authored without disclosing AI generation\n(d) Resell or sublicense the delivered content to others\n(e) Use the content to defame or harm any identifiable person\n(f) Claim any other customer's content as your own\n(g) Use your delivered content to train competing AI systems",
          "2.3 COMMERCIAL LICENSE OPTION\n\nFor customers who require broader commercial rights, we offer a Commercial License at additional cost. Contact legal@ghaafeedimusic.com for Commercial License terms and pricing.\n\nCommercial License includes:\n• Right to use in advertising and commercial promotion\n• Right to synchronize with commercial video productions\n• Right to license to third parties with restrictions\n• Written documentation of rights for commercial use",
        ],
      },
      {
        heading: "SECTION 3 — MUSIC GENERATION PLATFORM TERMS",
        body: [
          "3.1 POYO.AI GENERATED MUSIC\n\nFor orders processed using Poyo.ai music generation:\n\n(a) Poyo.ai's commercial use terms apply to music generated through their platform. We will provide specific notice for orders using Poyo.ai generation.\n\n(b) We will notify you if your order was generated using Poyo.ai upon request.\n\n(c) The AI music copyright litigation landscape is evolving. You should monitor developments as they may affect the commercial usability of AI-generated content.",
          "3.2 SELF-HOSTED GENERATED MUSIC\n\nFor orders processed using self-hosted open-source music models:\n\nACE-Step: Apache 2.0 License — full commercial rights\nStable Audio Open: CreativeML Open Rail-M — commercial use permitted with attribution\nMusicGen Medium: CC BY-NC 4.0 — NON-COMMERCIAL ONLY\nYuE: Apache 2.0 License — full commercial rights\n\nWe will notify you which model was used for your order if requested.\n\nIMPORTANT: If commercial use is important to you, specify this at order time and we will ensure a commercially-licensed model is used.",
          "3.3 MODEL LICENSING UPDATES\n\nOpen-source model licenses may change. We monitor model licensing and will notify customers of any changes affecting previously delivered content.",
        ],
      },
      {
        heading: "SECTION 4 — STREAMING AND DISTRIBUTION",
        body: [
          "4.1 STREAMING PLATFORM POLICIES\n\nStreaming platforms have varying policies on AI-generated content:\n\nSPOTIFY: Has removed AI-generated tracks that constitute "fraud" and has policies against AI-generated content from certain sources.\n\nYOUTUBE: Requires disclosure of AI-generated content in certain contexts. Review YouTube's current AI content policies before uploading.\n\nAPPLE MUSIC: Evolving policies — consult current Apple Music distribution requirements.\n\nTIKTOK: Has policies regarding AI-generated content disclosure. Review before distribution.\n\nWE MAKE NO WARRANTY that your delivered content will be accepted by any specific platform.",
          "4.2 MUSIC DISTRIBUTION SERVICES\n\nIf you wish to distribute your generated song to streaming platforms through services like DistroKid, TuneCore, or CD Baby:\n(a) These services have their own AI content policies\n(b) You must disclose AI-generated content as required\n(c) Some distributors may decline AI-generated content\n(d) We make no warranty of acceptance",
          "4.3 PERFORMING RIGHTS ORGANIZATIONS\n\nYour AI-generated songs are NOT registered with ASCAP, BMI, or SESAC. If you wish to collect performance royalties, you must:\n(a) Determine if your content qualifies for registration\n(b) Apply for registration yourself\n(c) Consult a music attorney regarding the appropriate structure for AI-assisted compositions",
        ],
      },
      {
        heading: "SECTION 5 — VIDEO RIGHTS",
        body: [
          "5.1 VIDEO CONTENT OWNERSHIP\n\nThe AI-generated video content delivered to you:\n(a) Is original content generated for your specific order\n(b) Does not contain footage from identifiable copyrighted films or television programs\n(c) May contain AI-generated characters that are entirely fictional and not based on any real person (unless you chose the photo upload option)\n(d) Is subject to the same copyright uncertainty described in Section 1",
          "5.2 VISUAL AI DISCLOSURE\n\nIf you share your music video on platforms requiring disclosure of AI-generated content (including YouTube and others with AI disclosure requirements), you must comply with those disclosure requirements.",
          "5.3 CHARACTERS IN YOUR VIDEO\n\nAI-GENERATED CHARACTERS: The AI-generated characters in your video are entirely fictional. Ghaafeedi Music uses reasonable technical measures to prevent generation of characters resembling specific real individuals. If you identify such a resemblance, contact us immediately.\n\nCUSTOMER LIKENESS CHARACTERS: If your video features your likeness, all rights to your personal likeness as depicted in the video belong to you, subject to the Biometric Data Consent Form you signed and these Terms.",
        ],
      },
      {
        heading: "SECTION 6 — FUTURE LEGAL DEVELOPMENTS",
        body: [
          "6.1 MONITORING COMMITMENT\n\nAI intellectual property law is changing rapidly. Ghaafeedi Music commits to:\n(a) Monitoring significant legal developments affecting AI-generated content rights\n(b) Updating this policy as law develops\n(c) Notifying customers of material changes that affect their previously delivered content\n(d) Providing updated documentation if legal changes strengthen customer rights",
          "6.2 LEGAL ASSISTANCE\n\nWhile we cannot provide legal advice, we can provide:\n(a) Documentation of what AI systems generated your content\n(b) Information about which models were used\n(c) Production records that may support copyright claims\n(d) Written confirmation of your rights as granted by us\n\nContact legal@ghaafeedimusic.com for any documentation needed for legal purposes.",
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // DOC 6 — REFUND & CANCELLATION
  // ═══════════════════════════════════════════════════════
  "refund-cancellation": {
    slug: "refund-cancellation",
    title: "Refund and Cancellation Policy",
    subtitle: "Ghaafeedi Music LLC",
    effective: "June 27, 2026",
    updated: "June 27, 2026",
    category: "Customer",
    sections: [
      {
        heading: "SECTION 1 — CANCELLATION RIGHTS",
        body: [
          "1.1 CANCELLATION BEFORE PRODUCTION BEGINS\n\nYou may cancel your order for a FULL REFUND if:\n• Cancellation request is received within 60 minutes of order placement; AND\n• AI production has not yet commenced\n\nTo cancel: Contact support@ghaafeedimusic.com immediately with subject line "URGENT CANCELLATION — Order [ID]"",
          "1.2 CANCELLATION AFTER PRODUCTION BEGINS\n\nOnce AI production has commenced, cancellation rights are limited as follows:\n\nProduction Stage 0-10% Complete: 75% refund\nProduction Stage 11-25% Complete: 50% refund\nProduction Stage 26-75% Complete: 25% refund\nProduction Stage 76-100% Complete: No refund\nContent Delivered: No refund\n\nProduction percentage will be determined by our production tracking system.",
          "1.3 RIGHT TO CANCEL UNDER STATE LAW\n\nCertain states provide additional cancellation rights for distance contracts. Where applicable:\n\nCALIFORNIA: Three-day right of rescission may apply to certain service contracts.\n\nFTC COOLING OFF RULE: The FTC Rule on Cooling-Off Period for Sales Made at Home or at Certain Other Locations (16 C.F.R. Part 429) may apply to certain sales. Contact us if you believe this rule applies to your purchase.",
        ],
      },
      {
        heading: "SECTION 2 — REFUND ELIGIBILITY",
        body: [
          "2.1 FULL REFUND SITUATIONS\n\nA full refund will be issued for:\n\n(a) TECHNICAL FAILURE: Complete failure of our systems resulting in no deliverable content after two production attempts\n\n(b) TIMELY CANCELLATION: Cancellation within the window described in Section 1.1\n\n(c) MATERIAL MISREPRESENTATION: If we materially misrepresented our services in a way that induced your purchase\n\n(d) UNAUTHORIZED CHARGE: A charge you did not authorize",
          "2.2 PARTIAL REFUND SITUATIONS\n\nA partial refund may be issued for:\n\n(a) PARTIAL DELIVERY FAILURE: Song delivers successfully but music video fails completely — refund of video portion (approximately 60% of order value)\n\n(b) SIGNIFICANT QUALITY DEFICIENCY: Where delivered content contains technical defects (not aesthetic disagreement) that cannot be corrected in two re-generation attempts\n\n(c) LATE DELIVERY: If delivery exceeds our stated maximum timeframe by more than 5 business days without your consent, 15% partial refund available",
          "2.3 NO REFUND SITUATIONS\n\nNo refund is available for:\n\n(a) AESTHETIC DISSATISFACTION: Dissatisfaction with the creative direction, musical style, visual style, character appearance, or emotional interpretation. AI generation is inherently creative and subjective. We cannot guarantee specific aesthetic outcomes.\n\n(b) COMPLETED AND DELIVERED ORDERS: Orders successfully delivered in technically sound condition\n\n(c) POLICY VIOLATION TERMINATIONS: Accounts terminated for violating our Terms of Service or Acceptable Use Policy\n\n(d) INCORRECT INFORMATION: Where you provided incorrect, incomplete, or misleading story or order information\n\n(e) PLATFORM REJECTION: If your delivered content is rejected by a third-party streaming platform, social media platform, or distributor\n\n(f) COPYRIGHT ISSUES: If your content cannot be used commercially due to AI copyright uncertainty",
        ],
      },
      {
        heading: "SECTION 3 — RE-GENERATION POLICY",
        body: [
          "3.1 COMPLIMENTARY RE-GENERATION\n\nRather than a refund, we may offer one complimentary re-generation in situations where:\n(a) Specific technical defects are identified\n(b) Character consistency issues significantly impair the viewing experience\n(c) Audio synchronization fails in the delivered video\n(d) Significant portions of the video are black or blank",
          "3.2 RE-GENERATION LIMITATIONS\n\nRe-generation will produce a new creative interpretation of your story. It will not be identical to the original and may differ significantly in creative approach.\n\nRe-generation does not guarantee satisfaction and does not entitle you to an additional re-generation if the second result is also not to your aesthetic preference.",
        ],
      },
      {
        heading: "SECTION 4 — REFUND PROCESS",
        body: [
          "4.1 HOW TO REQUEST A REFUND\n\nStep 1: Email support@ghaafeedimusic.com\nStep 2: Subject: "Refund Request — Order [YOUR ORDER ID]"\nStep 3: Describe the basis for your refund request\nStep 4: Include your account email and order number",
          "4.2 REVIEW AND RESPONSE\n\nWe will acknowledge your request within 2 business days and provide a decision within 7 business days.",
          "4.3 APPROVED REFUNDS\n\nApproved refunds are processed within:\n• Credit card payments: 5-10 business days (depending on your bank)\n• Other payment methods: 3-7 business days\n\nRefunds are issued to the original payment method only.",
          "4.4 DISPUTES\n\nIf you disagree with our refund decision, you may escalate to legal@ghaafeedimusic.com. Final resolution is subject to the dispute resolution procedures in our Terms of Service.",
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // DOC 7 — BUSINESS COMPLIANCE CHECKLIST (Internal)
  // ═══════════════════════════════════════════════════════
  "business-compliance": {
    slug: "business-compliance",
    title: "Business Compliance Checklist",
    subtitle: "Ghaafeedi Music LLC — Internal Document",
    effective: "June 27, 2026",
    updated: "June 27, 2026",
    category: "Internal",
    sections: [
      {
        heading: "INTERNAL NOTICE",
        body: [
          "This document identifies the business entity and insurance requirements that must be in place before commercial launch. These are not templates — they are action items. This is an internal operating document.",
        ],
      },
      {
        heading: "SECTION 1 — BUSINESS ENTITY REQUIREMENTS",
        body: [
          "ACTION ITEM 1.1 — LLC OR CORPORATION FORMATION\n\nRequirement: Ghaafeedi Music must operate as a properly formed limited liability company (LLC) or corporation. Operating as a sole proprietorship exposes Lawrence personally to all business liabilities.\n\nSteps Required:\n(a) Choose state of formation (Delaware or home state)\n(b) File Articles of Organization (LLC) or Articles of Incorporation (Corporation) with the Secretary of State\n(c) Pay state filing fees\n(d) Create Operating Agreement (LLC) or Bylaws (Corp)\n(e) Apply for EIN (Employer Identification Number) at irs.gov — free and immediate\n(f) Open business bank account in entity name\n(g) Keep personal and business finances completely separate\n\nEstimated Cost: $50–$500 depending on state",
          "ACTION ITEM 1.2 — REGISTERED AGENT\n\nRequirement: A registered agent with a physical address in the state of formation is required for service of process.\n\nOptions:\n• Hire a registered agent service ($50–$300/year)\n• Serve as your own registered agent (if in same state)",
          "ACTION ITEM 1.3 — FOREIGN QUALIFICATION\n\nRequirement: If doing substantial business in states other than your formation state, foreign qualification may be required. Consult with a business attorney about whether foreign qualification is needed based on your customer geography.",
          "ACTION ITEM 1.4 — BUSINESS LICENSES\n\nRequirement:\n• Business license in city/county of operation\n• Any state-specific business licenses required\n• Check local requirements at your specific location",
          "ACTION ITEM 1.5 — DMCA AGENT REGISTRATION\n\nCRITICAL — MUST COMPLETE BEFORE LAUNCH\n\nRequirement: Register a designated DMCA agent with the U.S. Copyright Office at copyright.gov/dmca-directory\n\nCost: $6 per year\nTime: Online registration, immediate\n\nWithout registration, DMCA safe harbor protections may not be available.",
        ],
      },
      {
        heading: "SECTION 2 — INSURANCE REQUIREMENTS",
        body: [
          "ACTION ITEM 2.1 — GENERAL COMMERCIAL LIABILITY\n\nCoverage Needed: Minimum $1 million per occurrence / $2 million aggregate\n\nWhy Critical: Customer claims of physical harm; Third party claims arising from business operations; Often required for commercial leases and contracts.\n\nEstimated Annual Cost: $500–$2,000",
          "ACTION ITEM 2.2 — ERRORS AND OMISSIONS (E&O) INSURANCE\n\nAlso Known As: Professional Liability Insurance\n\nCoverage Needed: Minimum $1 million per claim / $2 million aggregate\n\nWhy Critical: Claims that your AI service caused financial harm; Claims that delivered content infringed copyright; Claims that your service failed to perform as described; Customer claims arising from AI generation errors; Essential for a technology service company.\n\nEstimated Annual Cost: $1,500–$5,000\n\nTHIS IS THE MOST IMPORTANT INSURANCE FOR GHAAFEEDI MUSIC. Do not launch without it.",
          "ACTION ITEM 2.3 — CYBER LIABILITY INSURANCE\n\nCoverage Needed: Minimum $1 million per occurrence\n\nWhy Critical: Data breach costs (notification, credit monitoring); Biometric data breach penalties (BIPA violations can be $1,000–$5,000 PER PERSON PER VIOLATION); Ransomware and business interruption; Third-party claims arising from data breach; Regulatory response costs.\n\nEstimated Annual Cost: $1,500–$5,000\n\nCRITICAL given biometric data collection.",
          "ACTION ITEM 2.4 — INTELLECTUAL PROPERTY INSURANCE\n\nCoverage: Copyright infringement defense costs\n\nWhy Important: AI music copyright litigation is active (RIAA vs Suno); Defense of IP claims can cost $250,000+; Consider Media Perils or Technology IP coverage.\n\nEstimated Annual Cost: $2,000–$8,000",
        ],
      },
      {
        heading: "SECTION 3 — TAX COMPLIANCE",
        body: [
          "ACTION ITEM 3.1 — SALES TAX\n\nDigital services are subject to sales tax in many states. As of 2025, approximately 40+ states tax digital services including AI-generated content.\n\nRequirement:\n• Determine nexus in each state where customers are located\n• Register for sales tax collection where required\n• Implement sales tax collection in payment system\n• Use a service like TaxJar, Avalara, or Stripe Tax",
          "ACTION ITEM 3.2 — INCOME TAX\n\nRequirement:\n• Quarterly estimated tax payments\n• Annual business tax return\n• Consult a CPA specializing in technology businesses",
        ],
      },
      {
        heading: "SECTION 4 — ATTORNEY REVIEW PRIORITIES",
        body: [
          "HIGHEST PRIORITY (Before Any Customer Takes):\n1. Entity formation if not done\n2. DMCA agent registration ($6 — do this today)\n3. E&O and Cyber insurance\n\nHIGH PRIORITY (Before Launch):\n4. Attorney review of all 12 legal documents\n5. Music licensing legal strategy\n6. State sales tax compliance assessment\n\nONGOING:\n7. Monitor AI copyright law developments\n8. Annual policy review\n9. Update terms when law changes materially",
        ],
      },
      {
        heading: "SECTION 5 — RECOMMENDED LEGAL PROFESSIONALS",
        body: [
          "TYPE OF ATTORNEY NEEDED:\n\nTechnology Business Attorney: For entity formation, Terms of Service, general business law. Find: State bar referral service, or search for technology startup attorneys in your area.\n\nPrivacy Law Attorney (CIPP/US Certified): For BIPA compliance, CCPA compliance, Privacy Policy. Find: International Association of Privacy Professionals (iapp.org) attorney directory.\n\nEntertainment/Music Attorney: For music rights strategy, PRO registration, AI music licensing. Find: Volunteer Lawyers for the Arts, music attorney directories.\n\nIntellectual Property Attorney: For copyright strategy, DMCA, AI IP issues. Find: United States Patent and Trademark Office attorney database.\n\nInsurance Broker (Technology Specialty): For E&O, Cyber, General Liability packages. Find: Ask your business attorney for referrals or search for "technology E&O insurance broker".",
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // DOC 8 — CRISIS PROTOCOL (Internal)
  // ═══════════════════════════════════════════════════════
  "crisis-protocol": {
    slug: "crisis-protocol",
    title: "Sensitive Content and Crisis Response Protocol",
    subtitle: "Ghaafeedi Music LLC — Internal Operating Document",
    effective: "June 27, 2026",
    updated: "June 27, 2026",
    category: "Internal",
    sections: [
      {
        heading: "SECTION 1 — CONTENT CLASSIFICATION SYSTEM",
        body: [
          "All customer story submissions are automatically classified into the following risk categories:\n\nLEVEL 0 — STANDARD: Normal emotional content (love, joy, nostalgia, general life experiences). Standard processing.\n\nLEVEL 1 — SENSITIVE: Grief, heartbreak, moderate trauma, recovery stories. Standard processing with crisis resource inclusion in delivery.\n\nLEVEL 2 — ELEVATED CONCERN: References to depression, anxiety, suicidal ideation (historical/non-immediate), abuse survival, serious illness, major loss. Include crisis resources. Human review of content before delivery. Flag account for welfare check option.\n\nLEVEL 3 — IMMEDIATE CONCERN: Language indicating imminent self-harm, explicit suicidal intent, threats to others, active abuse disclosure, child safety concerns. HALT production. Human review within 1 hour. Follow mandatory reporting obligations. Contact emergency services if imminent danger.\n\nLEVEL 4 — ILLEGAL CONTENT: CSAM, terrorism, human trafficking content. HALT immediately. Do not process. Report to NCMEC (CSAM), FBI tip line, or appropriate law enforcement. Preserve all evidence.",
        ],
      },
      {
        heading: "SECTION 2 — MANDATORY REPORTING OBLIGATIONS",
        body: [
          "2.1 FEDERAL MANDATORY REPORTING\n\nCSAM (Child Sexual Abuse Material): Federal law (18 U.S.C. § 2258A) requires reporting to NCMEC CyberTipline at cybertipline.org. Failure to report is a federal crime. Report within 24 hours of discovery.",
          "2.2 STATE MANDATORY REPORTING\n\nChild Abuse/Neglect: Many states require reporting for online service providers who discover child abuse in course of providing services. Requirements vary by state.\n\nConsult with legal counsel to determine specific mandatory reporting obligations in your state and the states where customers are located. Document ALL reporting actions and decisions.",
          "2.3 IMMINENT HARM\n\nIf a customer submission indicates imminent danger to self or others:\n(a) Contact 911 if identity and location are known\n(b) Contact the National Suicide Prevention Lifeline (988) for guidance on appropriate response\n(c) Document all actions taken\n(d) Do not ignore — liability for inaction is real",
        ],
      },
      {
        heading: "SECTION 3 — CRISIS RESOURCES TO INCLUDE IN DELIVERIES",
        body: [
          "For all Level 1 and above orders, include in delivery:\n\nNational Suicide Prevention Lifeline: Call or text 988\nCrisis Text Line: Text HOME to 741741\nSAMHSA Helpline: 1-800-662-4357\nNational Domestic Violence Hotline: 1-800-799-7233\nRAINN Sexual Assault Hotline: 1-800-656-4673\nVeterans Crisis Line: 1-800-273-8255 (Press 1)\nTrevor Project (LGBTQ+): 1-866-488-7386",
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // DOC 9 — COPPA
  // ═══════════════════════════════════════════════════════
  "coppa-compliance": {
    slug: "coppa-compliance",
    title: "Children's Privacy and COPPA Compliance Policy",
    subtitle: "Ghaafeedi Music LLC",
    effective: "June 27, 2026",
    updated: "June 27, 2026",
    category: "Customer",
    sections: [
      {
        heading: "SECTION 1 — AGE REQUIREMENTS AND VERIFICATION",
        body: [
          "1.1 PRIMARY SERVICE — ADULTS 18+\n\nGhaafeedi Music's primary services are designed for and marketed to adults 18 years of age and older.",
          "1.2 USERS 13-17 YEARS OF AGE\n\nWe may provide services to users ages 13-17 only with:\n(a) A parent or legal guardian creating the account\n(b) The parent or guardian completing all consent forms\n(c) Parental consent clearly documented before any biometric data collection\n(d) Parent or guardian supervising all use",
          "1.3 CHILDREN UNDER 13 — COPPA\n\nWe do not knowingly collect personal information from children under 13 years of age. Our services are not directed to children under 13.\n\nIf we discover we have inadvertently collected information from a child under 13:\n(a) We will immediately delete all such information\n(b) We will cancel any associated orders with full refund\n(c) We will block the associated account",
          "1.4 AGE VERIFICATION PROCESS\n\nAccount creation requires birth date entry. Dates indicating age under 18 trigger parental consent workflow. Dates indicating age under 13 block account creation.\n\nWe acknowledge that age verification for online services is imperfect. We encourage parents to monitor their children's online activities.",
        ],
      },
      {
        heading: "SECTION 2 — STORIES MENTIONING MINORS",
        body: [
          "2.1 ACCEPTABLE SUBMISSIONS ABOUT MINORS\n\nAn adult customer may submit stories that mention their minor children in the context of personal stories (e.g., "the birth of my child," "raising my daughter," "losing a child") subject to:\n(a) Not including the minor's full name, school, or other identifying information in the story\n(b) Not requesting that the minor's likeness appear in the video (requires additional guardian consent)\n(c) Not including sensitive or inappropriate details about a minor",
          "2.2 PROHIBITED CONTENT INVOLVING MINORS\n\nThe following is strictly prohibited:\n(a) Any sexually suggestive content involving minors\n(b) Content that identifies a specific minor and could enable their location\n(c) Stories about minors that constitute child abuse or neglect disclosures without appropriate reporting\n(d) Requests to generate video content of a minor from a photo without full guardian consent documentation",
          "2.3 MUSIC VIDEOS FEATURING MINOR LIKENESSES\n\nRequests to incorporate the likeness of a minor in a music video require:\n(a) Legal parent or guardian account ownership\n(b) Enhanced guardian consent form (contact us)\n(c) Manual review and approval by Ghaafeedi Music\n(d) Content suitable for a minor to appear in",
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // DOC 10 — INTERNATIONAL POLICY
  // ═══════════════════════════════════════════════════════
  "international-policy": {
    slug: "international-policy",
    title: "International Customer Policy",
    subtitle: "Ghaafeedi Music LLC",
    effective: "June 27, 2026",
    updated: "June 27, 2026",
    category: "Customer",
    sections: [
      {
        heading: "SECTION 1 — SERVICE AVAILABILITY",
        body: [
          "1.1 CURRENT SERVICE AREA\n\nGhaafeedi Music currently accepts customers from the United States. Orders from outside the United States will be reviewed on a case-by-case basis.",
          "1.2 RESTRICTED REGIONS\n\nRegardless of service area, we do not accept customers located in:\n• Countries subject to U.S. OFAC sanctions\n• Regions where our services would violate local law",
        ],
      },
      {
        heading: "SECTION 2 — EUROPEAN CUSTOMERS (GDPR)",
        body: [
          "2.1 GDPR APPLICABILITY\n\nIf we accept customers in the European Economic Area (EEA) or United Kingdom, GDPR and UK GDPR apply.",
          "2.2 LEGAL BASIS FOR PROCESSING\n\nUnder GDPR, we process your data based on:\n• Contract performance (Art. 6(1)(b))\n• Legal obligation (Art. 6(1)(c))\n• Legitimate interests (Art. 6(1)(f))\n• Explicit consent for special category data including biometric data (Art. 9(2)(a))",
          "2.3 DATA TRANSFERS\n\nTransfer of EEA/UK personal data to the United States is conducted under Standard Contractual Clauses (SCCs) pursuant to EU Commission Decision 2021/914 and UK International Data Transfer Agreements.",
          "2.4 EU/UK PRIVACY RIGHTS\n\nIn addition to the rights described in our Privacy Policy:\n• Right to object to processing (Art. 21 GDPR)\n• Right not to be subject to automated decision-making with significant effects (Art. 22 GDPR)\n• Right to lodge a complaint with your supervisory authority",
          "2.5 DATA PROTECTION OFFICER\n\nDPO Contact: dpo@ghaafeedimusic.com",
        ],
      },
      {
        heading: "SECTION 3 — CANADIAN CUSTOMERS (PIPEDA/LAW 25)",
        body: [
          "Canadian customers are subject to PIPEDA and Quebec Law 25. We honor all applicable Canadian privacy rights including the right to withdraw consent and the right of access.\n\nPrivacy Officer for Canadian matters: privacy@ghaafeedimusic.com",
        ],
      },
      {
        heading: "SECTION 4 — CURRENCY AND PAYMENT",
        body: [
          "4.1 ALL PRICES IN USD\n\nAll prices are listed and charged in United States Dollars. Currency conversion is handled by your payment provider.",
          "4.2 VAT AND INTERNATIONAL TAXES\n\nCustomers outside the United States may be subject to VAT, GST, or other local taxes on digital services. You are responsible for any applicable local taxes. We will collect VAT where required to do so by law.",
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // DOC 11 — MUSIC RIGHTS STRATEGY
  // ═══════════════════════════════════════════════════════
  "music-rights-strategy": {
    slug: "music-rights-strategy",
    title: "Music Rights and Licensing Strategy Document",
    subtitle: "Ghaafeedi Music LLC",
    effective: "June 27, 2026",
    updated: "June 27, 2026",
    category: "Rights",
    sections: [
      {
        heading: "REVIEW DATE",
        body: [
          "Review Date: Every 6 months (AI law is evolving rapidly). This document provides guidance on navigating the complex music rights landscape for AI-generated content.",
        ],
      },
      {
        heading: "SECTION 1 — CURRENT LEGAL LANDSCAPE (2025–2026)",
        body: [
          "1.1 ACTIVE LITIGATION TO MONITOR\n\nRIAA v. Suno, Inc. and Udio: Major record labels have sued AI music companies alleging copyright infringement in training data. Settlement or verdict will significantly affect AI music industry. Status: Ongoing as of 2025. Action Required: Monitor and update platform accordingly when resolved.\n\nSony Music v. Various AI Companies: Various suits regarding training data use.\n\nGetty Images v. Stability AI: Visual AI training data case with implications for music AI training data standards.",
          "1.2 COPYRIGHT OFFICE GUIDANCE\n\nThe Copyright Office has issued multiple guidance documents stating:\n• Purely AI-generated music: Not copyrightable\n• AI-assisted music with sufficient human authorship: May be copyrightable for the human portions\n• Ongoing rulemaking on AI and copyright expected",
          "1.3 PRACTICAL STRATEGY\n\nGiven legal uncertainty, Ghaafeedi Music should:\n\n(a) DOCUMENT HUMAN CREATIVITY: For each order, document the customer's specific creative contributions (their story, emotional direction, thematic choices) to support copyright claims for human-authored portions.\n\n(b) USE COMMERCIALLY-LICENSED AI MODELS: Prefer Apache 2.0 and similar permissive licenses for music generation (ACE-Step, YuE).\n\n(c) AVOID TRAINING ON COPYRIGHTED WORKS: Ensure any model fine-tuning uses appropriately licensed training data.\n\n(d) DISCLOSE AI GENERATION: Be transparent about AI generation in all customer communications and platform uploads.\n\n(e) MONITOR PLATFORM POLICIES: Streaming platform policies on AI music change frequently.",
        ],
      },
      {
        heading: "SECTION 2 — PERFORMING RIGHTS STRATEGY",
        body: [
          "2.1 CURRENT POSITION OF PROs\n\nASCAP, BMI, and SESAC currently have no clear policy on registration of AI-generated compositions. The situation is evolving.",
          "2.2 CUSTOMER GUIDANCE\n\nWe will advise customers that:\n(a) Their AI-generated songs may not be eligible for PRO registration under current rules\n(b) If they wish to collect performance royalties, they should consult a music attorney\n(c) The situation is evolving and may change",
          "2.3 SYNC LICENSING\n\nCustomer songs may be usable for sync licensing (placement in film, TV, advertising) subject to:\n(a) Platform-specific AI content policies\n(b) Buyer's willingness to license AI-generated content\n(c) Applicable copyright status",
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // DOC 12 — NDA / IP ASSIGNMENT
  // ═══════════════════════════════════════════════════════
  "nda-ip-assignment": {
    slug: "nda-ip-assignment",
    title: "Confidentiality, IP Assignment, and Non-Disclosure Agreement",
    subtitle: "For All Employees, Contractors, and Service Providers",
    effective: "June 27, 2026",
    updated: "June 27, 2026",
    category: "Internal",
    sections: [
      {
        heading: "APPLICABILITY",
        body: [
          "This agreement applies to all Employees, Contractors, and Service Providers of Ghaafeedi Music LLC. Effective upon signing by each individual.",
        ],
      },
      {
        heading: "SECTION 1 — CONFIDENTIAL INFORMATION",
        body: [
          "1.1 DEFINITION\n\n"Confidential Information" includes all non-public information about Ghaafeedi Music including:\n• Customer stories and personal information\n• Customer identities and contact information\n• AI system architecture and prompts\n• Business strategies and financial information\n• Technical infrastructure details\n• All customer-submitted content",
          "1.2 OBLIGATIONS\n\nAll persons with access to Ghaafeedi Music systems agree to:\n(a) Maintain strict confidentiality of all customer information encountered in the course of work\n(b) Never discuss, share, or use customer stories outside of authorized work contexts\n(c) Report any accidental disclosure immediately\n(d) Follow all data security protocols",
          "1.3 CUSTOMER STORY PROTECTION\n\nCustomer personal stories are among the most sensitive information handled by Ghaafeedi Music. Employees who review content for quality or safety purposes must:\n(a) Access only what is necessary for their specific role\n(b) Never share story details with anyone not authorized\n(c) Treat each story with the same care they would want their own personal story treated\n(d) Maintain professional compassion when reviewing difficult or traumatic content",
          "1.4 IP ASSIGNMENT\n\nAll work product created in the course of employment or contract with Ghaafeedi Music, including AI system improvements, workflow development, and technical innovations, is the property of Ghaafeedi Music LLC.",
          "1.5 TERM\n\nConfidentiality obligations survive termination of employment or contract for a period of five (5) years, and indefinitely with respect to customer personal information.",
        ],
      },
      {
        heading: "SECTION 2 — MANDATORY REPORTER TRAINING",
        body: [
          "2.1 TRAINING REQUIREMENT\n\nAll staff who review customer content must complete mandatory reporter training covering:\n(a) Recognition of content indicating imminent harm\n(b) Company escalation procedures\n(c) Legal reporting obligations\n(d) Documentation requirements",
          "2.2 CONTENT REVIEW SUPPORT\n\nReviewing content involving trauma, abuse, grief, and crisis can affect staff wellbeing. Ghaafeedi Music provides:\n(a) Clear escalation procedures so no one person must bear difficult content alone\n(b) Regular team debriefs for content review staff",
        ],
      },
    ],
  },
};

// ─── Utility ─────────────────────────────────────────────────────────────────
function categoryColor(cat: LegalDoc["category"]) {
  if (cat === "Internal") return { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.4)", text: "#FBB924" };
  if (cat === "Rights")   return { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.4)", text: "#A78BFA" };
  return                         { bg: "rgba(212,175,55,0.12)",  border: "rgba(212,175,55,0.4)",  text: "#D4AF37" };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function LegalDocPage() {
  const params = useParams<{ doc: string }>();
  const slug = params.doc ?? "";
  const doc = DOCS[slug];

  if (!doc) {
    return (
      <div style={{ minHeight: "100vh", background: "#050B1A", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24, padding: "40px 20px" }}>
        <div style={{ fontSize: 64 }}>⚖️</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: "#D4AF37", fontSize: 28, textAlign: "center" }}>Document Not Found</h1>
        <p style={{ color: "rgba(255,255,255,0.6)", textAlign: "center" }}>The legal document you are looking for does not exist.</p>
        <Link href="/legal" style={{ color: "#D4AF37", textDecoration: "none", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, padding: "10px 24px", fontSize: 14 }}>← Back to Legal Center</Link>
      </div>
    );
  }

  const cc = categoryColor(doc.category);

  return (
    <div style={{ minHeight: "100vh", background: "#050B1A", color: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(212,175,55,0.15)", background: "rgba(11,23,54,0.8)", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)" }}>
        <Link href="/legal" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
          ← Legal Center
        </Link>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", padding: "3px 10px", borderRadius: 99, background: cc.bg, border: `1px solid ${cc.border}`, color: cc.text }}>
            {doc.category === "Internal" ? "INTERNAL" : doc.category === "Rights" ? "RIGHTS" : "POLICY"}
          </span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: "linear-gradient(180deg, rgba(11,23,54,0.6) 0%, transparent 100%)", padding: "56px 24px 40px", textAlign: "center", borderBottom: "1px solid rgba(212,175,55,0.1)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px,4vw,40px)", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, marginBottom: 12 }}>
            {doc.title}
          </div>
          <div style={{ fontSize: 14, color: "#D4AF37", fontWeight: 500, marginBottom: 8 }}>{doc.subtitle}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
            Effective: {doc.effective} &nbsp;·&nbsp; Last Updated: {doc.updated}
          </div>
          {doc.category === "Internal" && (
            <div style={{ marginTop: 20, padding: "10px 20px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, fontSize: 13, color: "#FBB924", display: "inline-block" }}>
              ⚠️ Internal document — not customer-facing
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
        {doc.sections.map((section, si) => (
          <div key={si} style={{ marginBottom: 48 }}>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(14px,2vw,18px)",
              fontWeight: 700,
              color: "#D4AF37",
              borderBottom: "1px solid rgba(212,175,55,0.2)",
              paddingBottom: 10,
              marginBottom: 20,
              letterSpacing: "0.04em",
            }}>
              {section.heading}
            </h2>
            {section.body.map((paragraph, pi) => (
              <div key={pi} style={{
                marginBottom: 18,
                fontSize: 14,
                lineHeight: 1.8,
                color: "rgba(255,255,255,0.82)",
                whiteSpace: "pre-line",
              }}>
                {paragraph}
              </div>
            ))}
          </div>
        ))}

        {/* Footer contact */}
        <div style={{ marginTop: 64, padding: "28px 24px", background: "rgba(11,23,54,0.6)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 12, textAlign: "center" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "#D4AF37", marginBottom: 8 }}>Questions about this document?</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>Our legal and support teams are here to help.</div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="mailto:legal@ghaafeedimusic.com" style={{ color: "#D4AF37", textDecoration: "none", fontSize: 13, border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8, padding: "8px 18px" }}>legal@ghaafeedimusic.com</a>
            <a href="mailto:support@ghaafeedimusic.com" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 13, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 18px" }}>support@ghaafeedimusic.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}
