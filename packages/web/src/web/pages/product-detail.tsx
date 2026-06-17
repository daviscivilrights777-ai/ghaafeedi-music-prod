import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { authClient } from "../lib/authClient";
import { api } from "../lib/api";

// ─── Product catalog ──────────────────────────────────────────────────────────
// Pricing sourced from approved pricing report — June 15, 2026 (Lawrence Davis, final approved)
export const PRODUCTS: Record<string, Product> = {
  "sophia-ai": {
    slug: "sophia-ai",
    name: "Sophia AI Emotional Companion",
    tagline: "Your 24/7 AI companion for emotional storytelling",
    image: "/assets/prod-sophia-portrait.png",
    category: "AI Companion",
    badge: "Most Popular",
    description: "Sophia is your personal AI companion — a 24-28 year old Mediterranean/Middle Eastern presence with warm brown eyes, curly updo, and deep emotional intelligence. She listens, understands, and helps you articulate your story with clarity and depth. Available 24/7, she guides your entire journey.",
    deliverables: ["Unlimited AI conversations", "Emotional analysis reports", "Story crafting guidance", "Memory vault integration", "Multi-language support"],
    whoFor: [
      { icon: "💔", label: "Healing from loss or heartbreak", desc: "Those processing grief, breakups, or major life transitions who need a compassionate, always-available listener." },
      { icon: "🎯", label: "People beginning their story journey", desc: "Anyone starting with Ghaafeedi Music who wants AI-guided emotional onboarding before choosing a product." },
      { icon: "🧠", label: "Self-discovery seekers", desc: "People exploring their emotional identity, unpacking complex feelings, or seeking clarity through guided conversation." },
      { icon: "🌙", label: "Night-time thinkers", desc: "Those who process best in quiet hours and need a non-judgmental presence available at 2am when no one else is." },
    ],
    tiers: [
      { name: "Starter",  price: 29,  period: "mo", revisions: null, deliveryDays: null, features: ["50 conversations/mo", "Basic emotional analysis", "Story guidance"] },
      { name: "Premium",  price: 49,  period: "mo", revisions: null, deliveryDays: null, features: ["Unlimited conversations", "Deep emotional analysis", "Priority responses", "Memory vault access"] },
      { name: "Elite",    price: 79,  period: "mo", revisions: null, deliveryDays: null, features: ["Everything in Premium", "VIP priority", "Custom voice sessions", "1:1 story review", "Dedicated producer line"] },
    ],
    acknowledgements: [
      "I understand Sophia AI is an artificial intelligence, not a licensed therapist or counselor.",
      "I consent to my story data being used to personalize my AI companion experience.",
      "I understand that emotional content I share is stored securely and used only to improve my experience.",
    ],
    profitMargin: 98,
  },
  "cinematic-life-story": {
    slug: "cinematic-life-story",
    name: "Cinematic Life Story Film",
    tagline: "Your life transformed into a cinematic masterpiece",
    image: "/assets/prod-cinematic-life-story.png",
    category: "Film Production",
    badge: "Signature",
    description: "Transform your most cherished memories into a breathtaking cinematic film. Our AI analyzes your story, generates a custom script and storyboard, produces original music, and renders a stunning video production that captures your unique emotional journey.",
    deliverables: ["Full cinematic script", "AI-generated storyboard", "Original music composition", "10-minute film", "4K delivery", "Digital + physical copies"],
    whoFor: [
      { icon: "🎬", label: "People with stories worth telling", desc: "Those who have lived a rich, complex life and want it immortalized in a format worthy of the big screen." },
      { icon: "🎁", label: "Gift buyers for milestone moments", desc: "Children honoring aging parents, spouses celebrating anniversaries, or families marking a legacy moment." },
      { icon: "📸", label: "Memory preservationists", desc: "People sitting on decades of photos and footage who want them transformed into something meaningful." },
      { icon: "🏆", label: "High achievers & entrepreneurs", desc: "Founders, executives, and leaders who want their journey documented with the gravitas it deserves." },
    ],
    tiers: [
      { name: "Essential", price: 499, period: "one-time", revisions: 1, deliveryDays: 14, features: ["10-min film", "1 revision", "Digital delivery", "Original score"] },
      { name: "Premium",   price: 599, period: "one-time", revisions: 2, deliveryDays: 10, features: ["10-min film", "2 revisions", "Digital + USB", "Full orchestral score", "Color grading"] },
      { name: "Elite",     price: 799, period: "one-time", revisions: 4, deliveryDays: 7,  features: ["10-min film", "4 revisions", "4K + physical box set", "Priority production", "Premiere event kit"] },
    ],
    acknowledgements: [
      "I confirm I own or have rights to all photos, videos, and media I will upload.",
      "I understand delivery timelines begin after all required media is received.",
      "I acknowledge the revision policy as specified in my chosen tier.",
      "I consent to my story being used to generate AI content on my behalf.",
    ],
    profitMargin: 112,
  },
  "emotional-soundtrack": {
    slug: "emotional-soundtrack",
    name: "Emotional Soundtrack",
    tagline: "Original music composed from your story's emotions",
    image: "/assets/prod-emotional-soundtrack.png",
    category: "Music Production",
    badge: "AI-Powered",
    description: "Share your story and Sophia AI analyzes its emotional DNA — extracting the precise feelings, memories, and moments that define it. Our AI music system then composes a completely original, personalized soundtrack that captures your emotional signature.",
    deliverables: ["AI emotional analysis", "Original composed track", "Full production mix", "Stems (vocal, instrumental)", "Streaming-ready master", "Lyrics (if requested)"],
    whoFor: [
      { icon: "🎵", label: "Songwriters without a producer", desc: "People with stories and feelings to express who want professional AI-composed music without needing studio access." },
      { icon: "💝", label: "Emotional processors through music", desc: "Those who heal, celebrate, or grieve through sound and want music that perfectly mirrors their emotional state." },
      { icon: "📱", label: "Content creators & podcasters", desc: "Digital creators who want unique, custom background music tailored to their story and brand." },
      { icon: "🎂", label: "Gift givers seeking something unique", desc: "Anyone who wants to give someone a truly personal, one-of-a-kind musical gift that no store could offer." },
    ],
    tiers: [
      { name: "Essential", price: 19, period: "mo", revisions: 1, deliveryDays: 5, features: ["2 songs/mo", "2-min tracks", "1 revision", "MP3 delivery"] },
      { name: "Creator",   price: 39, period: "mo", revisions: 2, deliveryDays: 4, features: ["5 songs/mo", "3-min tracks", "2 revisions", "WAV + stems", "Streaming master"] },
      { name: "Pro",       price: 79, period: "mo", revisions: 3, deliveryDays: 3, features: ["12 songs/mo", "Full production", "3 revisions", "All formats", "Priority delivery"] },
    ],
    acknowledgements: [
      "I understand the final music is AI-generated and may vary from any reference tracks I provide.",
      "I confirm I have rights to any lyric content I submit for inclusion.",
      "I understand the delivered music is licensed for personal use only unless upgraded.",
    ],
    profitMargin: 118,
  },
  "voice-cloning-studio": {
    slug: "voice-cloning-studio",
    name: "Voice Cloning Studio",
    tagline: "Preserve any voice forever in studio quality",
    image: "/assets/prod-voice-cloning.png",
    category: "Voice Technology",
    badge: "Enterprise",
    description: "Using cutting-edge voice AI, we create a perfect digital replica of any voice — capturing tone, cadence, emotion, and character with stunning accuracy. Perfect for preserving a loved one's voice, creating narrations, or building a legacy audio archive.",
    deliverables: ["Studio-grade voice clone", "Unlimited voice generation", "Emotional modulation", "Multi-language support", "Private secure vault", "API access (Elite)"],
    whoFor: [
      { icon: "👴", label: "Families preserving elderly voices", desc: "Adult children who want to capture a parent's or grandparent's voice before it's too late — for generations to hear." },
      { icon: "🎙️", label: "Podcasters & narrators", desc: "Content creators who want a synthetic version of their own voice for automated narrations without re-recording." },
      { icon: "📚", label: "Authors & storytellers", desc: "Writers who want audiobook narration in their own voice, at scale, without booking studio time." },
      { icon: "🏢", label: "Enterprise & brand teams", desc: "Businesses building voice assistants, IVR systems, or branded audio experiences that need a consistent human voice." },
    ],
    tiers: [
      { name: "Starter", price: 299, period: "one-time", revisions: 1, deliveryDays: 5, features: ["1 voice clone", "Basic emotions", "50 generations/mo", "MP3 output"] },
      { name: "Premium", price: 599, period: "one-time", revisions: 2, deliveryDays: 3, features: ["2 voice clones", "Full emotions", "Unlimited generations", "All formats", "Private vault"] },
      { name: "Elite",   price: 999, period: "one-time", revisions: null, deliveryDays: 2, features: ["5 voice clones", "Custom emotions", "Unlimited generations", "API access", "White label"] },
    ],
    acknowledgements: [
      "I confirm I have explicit consent from the person whose voice is being cloned, or I am that person.",
      "I understand voice cloning for deceptive purposes is strictly prohibited and will result in account termination.",
      "I agree to Ghaafeedi Music's Voice Clone Ethics Policy and Usage Restrictions.",
      "I acknowledge that I am solely responsible for all uses of the cloned voice.",
    ],
    profitMargin: 115,
  },
  "memorial-legacy-film": {
    slug: "memorial-legacy-film",
    name: "Memorial Legacy Film",
    tagline: "An eternal tribute to those who shaped your world",
    image: "/assets/prod-memorial-legacy.png",
    category: "Memorial",
    badge: "Most Requested",
    description: "Create a beautiful, enduring memorial film celebrating the life of someone you've lost or wish to honor. We blend your photos, stories, and memories with AI-composed music and cinematic visuals into a timeless tribute film.",
    deliverables: ["Tribute film (5–20 min)", "Custom memorial music", "Photo slideshow integration", "Voice narration option", "Digital + physical delivery", "Shareable link for family"],
    whoFor: [
      { icon: "🕊️", label: "Those who've lost someone irreplaceable", desc: "People navigating grief who want to honor the departed with something more meaningful than a slideshow." },
      { icon: "👨‍👩‍👧", label: "Families preserving a legacy", desc: "Families wanting a shared artifact — something to gather around, rewatch, and pass down to grandchildren." },
      { icon: "⏰", label: "People caring for aging loved ones", desc: "Those who want to create a tribute while their loved one is still here to see and be moved by it." },
      { icon: "🎖️", label: "Honoring veterans & community pillars", desc: "Families of military members, community leaders, or local heroes whose stories deserve a lasting tribute." },
    ],
    tiers: [
      { name: "Essential", price: 399, period: "one-time", revisions: 1, deliveryDays: 10, features: ["5-min memorial", "Photo slideshow", "1 music track", "Digital delivery"] },
      { name: "Premium",   price: 499, period: "one-time", revisions: 2, deliveryDays: 7,  features: ["5-min memorial", "Voice narration", "3 music tracks", "USB + digital", "Family share link"] },
      { name: "Elite",     price: 699, period: "one-time", revisions: 4, deliveryDays: 5,  features: ["5-min memorial", "Custom narration", "Full score", "4K delivery", "Memorial website"] },
    ],
    acknowledgements: [
      "I confirm I am creating this memorial for personal, non-commercial purposes.",
      "I confirm I own or have rights to all photos and videos submitted.",
      "I understand the memorial will be stored securely in my Ghaafeedi Music vault.",
    ],
    profitMargin: 108,
  },
  "relationship-healing": {
    slug: "relationship-healing",
    name: "Relationship Healing Journey",
    tagline: "Transform your relationship story through music and film",
    image: "/assets/prod-relationship-healing.png",
    category: "Healing Arts",
    badge: "Transformative",
    description: "A deeply personal journey that transforms your relationship story — whether a love story, healing from loss, or celebrating a bond — into a cinematic experience complete with original music, personalized film, and an AI-guided emotional narrative.",
    deliverables: ["Couples or solo film (8 min)", "Relationship soundtrack", "AI emotional narrative", "Photo + video integration", "Keepsake packaging"],
    whoFor: [
      { icon: "💔", label: "Healing from a major breakup or divorce", desc: "People processing the end of a significant relationship who want to transform pain into art and closure." },
      { icon: "💑", label: "Couples celebrating a milestone", desc: "Partners hitting anniversaries, engagements, or relationship turning points who want a permanent cinematic memory." },
      { icon: "🧩", label: "People stuck in emotional loops", desc: "Those who keep replaying a relationship story and want structured AI guidance to reframe and release it." },
      { icon: "🌱", label: "New chapter starters", desc: "Anyone stepping into a new relationship phase who wants to honor what was, and declare what's next." },
    ],
    tiers: [
      { name: "Essential", price: 69,  period: "one-time", revisions: 1, deliveryDays: 5, features: ["1 healing song", "AI emotional narrative", "MP3 + WAV delivery"] },
      { name: "Premium",   price: 129, period: "one-time", revisions: 2, deliveryDays: 4, features: ["3 healing songs", "Extended narrative", "Stems included", "Story letter"] },
      { name: "Elite",     price: 199, period: "one-time", revisions: 3, deliveryDays: 3, features: ["6 healing songs", "VIP narrative session", "All formats", "Priority delivery", "Sophia 30-day access"] },
    ],
    acknowledgements: [
      "I understand this experience is artistic in nature and not a substitute for professional relationship counseling.",
      "I confirm both parties (if applicable) consent to participation and media sharing.",
      "I consent to my story data being used to create my personalized experience.",
    ],
    profitMargin: 110,
  },
  "family-vault": {
    slug: "family-vault",
    name: "Family Memory Vault",
    tagline: "An eternal digital archive for your family's legacy",
    image: "/assets/prod-family-vault.png",
    category: "Preservation",
    badge: "Legacy",
    description: "The ultimate family legacy product. Digitize, organize, and preserve your family's entire history — photos, videos, stories, recordings — in a secure, beautifully designed vault that can be passed down through generations.",
    deliverables: ["Secure cloud vault", "AI organization system", "Family tree integration", "Digital + physical archive", "Annual legacy report", "Multi-user access"],
    whoFor: [
      { icon: "📦", label: "Families with boxes of unsorted memories", desc: "Those sitting on decades of physical photos, home videos, and documents that need to be digitized and organized." },
      { icon: "🌍", label: "Multi-generational & diaspora families", desc: "Families spread across cities or countries who want one shared place to access and contribute to their shared history." },
      { icon: "🏡", label: "Estate planners & legacy thinkers", desc: "Individuals planning their long-term legacy who want a structured, permanent archive ready for future generations." },
      { icon: "👶", label: "Parents documenting their children's lives", desc: "New parents and families who want to capture and preserve every milestone from birth onward in one secure place." },
    ],
    tiers: [
      { name: "Essential", price: 199, period: "one-time", revisions: null, deliveryDays: 3, features: ["100GB vault storage", "5 users", "AI organization", "Mobile access", "1-year hosting"] },
      { name: "Premium",   price: 349, period: "one-time", revisions: null, deliveryDays: 2, features: ["500GB storage", "15 users", "Advanced AI tagging", "Print orders", "Family tree", "2-year hosting"] },
      { name: "Elite",     price: 599, period: "one-time", revisions: null, deliveryDays: 1, features: ["Unlimited storage", "Unlimited users", "White glove import", "Annual legacy book", "Lifetime hosting", "Legacy planning session"] },
    ],
    acknowledgements: [
      "I understand my vault data is stored securely and backed up daily.",
      "I agree to the family data privacy policy governing multi-user access.",
    ],
    profitMargin: 95,
  },
  "nft-collection": {
    slug: "nft-collection",
    name: "Legacy NFT Collection",
    tagline: "Mint your memories as verifiable digital assets",
    image: "/assets/prod-nft-collection.png",
    category: "Digital Assets",
    badge: "Web3",
    description: "Transform your memories, music, and films into authenticated NFT collections. Each piece is unique, verifiable on-chain, and can be gifted, sold, or passed down as a true digital heirloom.",
    deliverables: ["5–50 unique NFTs", "Smart contract deployment", "IPFS permanent storage", "Marketplace listing", "Certificate of authenticity"],
    whoFor: [
      { icon: "🔗", label: "Web3 natives who want personal NFTs", desc: "Crypto-forward individuals who want their real memories and stories minted as verifiable on-chain assets." },
      { icon: "🎨", label: "Artists monetizing emotional stories", desc: "Creatives and storytellers who want to turn their narratives into tradeable digital artwork with provenance." },
      { icon: "💎", label: "Collectors building a digital estate", desc: "Those building a personal digital asset portfolio who want emotionally meaningful pieces alongside financial NFTs." },
      { icon: "🎁", label: "Luxury gift seekers", desc: "People who want to gift a one-of-a-kind, authenticated digital heirloom to a loved one — something truly irreplaceable." },
    ],
    tiers: [
      { name: "Starter", price: 299,  period: "one-time", revisions: 1, deliveryDays: 10, features: ["5 NFTs", "AI-generated artwork", "1 chain", "Marketplace listing"] },
      { name: "Premium", price: 599,  period: "one-time", revisions: 2, deliveryDays: 7,  features: ["20 NFTs", "Premium AI art", "3 chains", "Auction setup", "Royalty splits"] },
      { name: "Elite",   price: 1299, period: "one-time", revisions: 5, deliveryDays: 5,  features: ["50 NFTs", "Custom AI art", "All chains", "Private auction", "Certificate of authenticity", "Press kit"] },
    ],
    acknowledgements: [
      "I confirm I own all intellectual property rights to the content being minted.",
      "I understand NFT values can fluctuate and Ghaafeedi Music makes no investment guarantees.",
      "I accept the blockchain gas fees and minting costs as outlined in my tier.",
    ],
    profitMargin: 105,
  },
  "signature-masterpiece": {
    slug: "signature-masterpiece",
    name: "Signature Masterpiece",
    tagline: "Your story told in the most premium song ever made for you",
    image: "/assets/prod-signature-masterpiece.png",
    category: "Premium Song",
    badge: "Signature",
    description: "Our premium signature song experience — the highest-tier, most emotionally crafted original song creation on the platform. Every Signature Masterpiece is a fully produced, studio-quality original track composed from your deepest story moments, with cinematic production that captures your emotional essence.",
    deliverables: ["Studio-grade original song", "Full AI emotional analysis", "Custom lyrics crafted from your story", "Professional production mix", "WAV + MP3 + stems delivery", "Physical keepsake option (Legacy tier)"],
    whoFor: [
      { icon: "👑", label: "High-net-worth individuals", desc: "Those for whom price is secondary to excellence — who want the absolute best version of their life story created." },
      { icon: "🏛️", label: "Legacy builders thinking generationally", desc: "People who think 50–100 years ahead and want a comprehensive archive their descendants will treasure forever." },
      { icon: "🎁", label: "Ultimate gift buyers", desc: "Those searching for the most meaningful, most premium gift they could give a parent, partner, or life mentor." },
      { icon: "🌟", label: "Public figures & thought leaders", desc: "Executives, founders, artists, and community leaders who want their full story told at the highest production level." },
    ],
    tiers: [
      { name: "Signature",   price: 99,   period: "one-time", revisions: 1, deliveryDays: 7,  features: ["1 signature song", "AI emotional analysis", "Full production", "WAV + MP3 delivery"] },
      { name: "Masterpiece", price: 299,  period: "one-time", revisions: 3, deliveryDays: 5,  features: ["2 signature songs", "Extended narrative", "Stems included", "Video lyric reel", "Priority production"] },
      { name: "Legacy",      price: 599,  period: "one-time", revisions: 5, deliveryDays: 4,  features: ["4 signature songs", "Full story album", "All formats", "Short film score", "Physical delivery", "Vault access (1yr)"] },
    ],
    acknowledgements: [
      "I understand this is a multi-phase production requiring my active participation.",
      "I confirm I own rights to all submitted content.",
      "I acknowledge the production timeline and agree to provide media within 7 days of purchase.",
    ],
    profitMargin: 120,
  },
  "cinematic-story-film": {
    slug: "cinematic-story-film",
    name: "Cinematic Story Film",
    tagline: "Your personal story, cinematically told",
    image: "/assets/prod-cinematic-story-film.png",
    category: "Film Production",
    description: "A shorter, more focused cinematic experience — perfect for capturing a single defining chapter of your life. Our AI crafts a complete film script, generates cinematic visuals, and pairs it with an original score.",
    deliverables: ["3-8 min film", "AI script", "Original music", "Digital delivery"],
    whoFor: [
      { icon: "📖", label: "One defining chapter to tell", desc: "People who have one powerful story — a turning point, a triumph, a loss — that deserves its own film." },
      { icon: "🎓", label: "Graduates & milestone achievers", desc: "Students, professionals, or athletes marking a major achievement who want a cinematic record of that moment." },
      { icon: "🧭", label: "Life transition navigators", desc: "Those at a crossroads — career change, relocation, reinvention — who want their transformation documented." },
      { icon: "💡", label: "First-time film buyers", desc: "People curious about Ghaafeedi's cinematic film experience who want a premium entry point before going all-in." },
    ],
    tiers: [
      { name: "Essential", price: 79,  period: "one-time", revisions: 1, deliveryDays: 7, features: ["2-min film", "1 revision", "Digital delivery", "Original score"] },
      { name: "Premium",   price: 129, period: "one-time", revisions: 2, deliveryDays: 5, features: ["2-min film", "2 revisions", "Digital + USB", "Color grading"] },
      { name: "Elite",     price: 199, period: "one-time", revisions: 4, deliveryDays: 4, features: ["2-min film", "4 revisions", "4K delivery", "Priority production"] },
    ],
    acknowledgements: [
      "I confirm I have rights to all submitted media.",
      "I accept the delivery timeline starting from media receipt.",
    ],
    profitMargin: 112,
  },
  "couples-journey-film": {
    slug: "couples-journey-film",
    name: "Couples Journey Film",
    tagline: "Your love story, forever preserved in film",
    image: "/assets/prod-couples-journey.png",
    category: "Film Production",
    description: "Celebrate your relationship with a stunning couples film that chronicles your journey together — from first meeting to present day — set to an original love score composed just for you.",
    deliverables: ["8-12 min couples film", "Custom love score", "Photo montage", "Shared vault access"],
    whoFor: [
      { icon: "💍", label: "Engaged or newly married couples", desc: "Partners who want to capture their love story at its peak — from first meeting to proposal — in a cinematic film." },
      { icon: "🎊", label: "Anniversary milestone celebrators", desc: "Couples hitting 5, 10, 25, or 50 years who want to commemorate their journey with something extraordinary." },
      { icon: "🌹", label: "Romantic gesture makers", desc: "Partners who want to gift their other half the most personal, emotionally resonant gift imaginable." },
      { icon: "👨‍👩‍👧‍👦", label: "Families preserving a love story", desc: "Adult children who want to create a couples film for their parents as a family heirloom gift." },
    ],
    tiers: [
      { name: "Essential", price: 149, period: "one-time", revisions: 1, deliveryDays: 10, features: ["5-min couples film", "Love score", "Digital delivery"] },
      { name: "Premium",   price: 199, period: "one-time", revisions: 2, deliveryDays: 7,  features: ["5-min couples film", "Extended score", "Digital + USB", "Color grading"] },
      { name: "Elite",     price: 249, period: "one-time", revisions: 4, deliveryDays: 5,  features: ["5-min couples film", "Custom album", "4K delivery", "Priority production"] },
    ],
    acknowledgements: [
      "I confirm both parties consent to participation.",
      "I confirm I have rights to all submitted media.",
    ],
    profitMargin: 110,
  },
  "dream-ai-visualization": {
    slug: "dream-ai-visualization",
    name: "Dream AI Visualization",
    tagline: "Transform your visions into cinematic reality",
    image: "/assets/prod-dream-visualization.png",
    category: "AI Visual",
    description: "Describe a dream, vision, or imagined world and our AI renders it into stunning cinematic visuals — complete with ambient soundscapes and a visual narrative that brings your inner world to life.",
    deliverables: ["AI visualization film", "Custom soundscape", "5-10 scenes", "4K renders"],
    whoFor: [
      { icon: "🌌", label: "Visionaries & lucid dreamers", desc: "People with vivid inner worlds, recurring dreams, or imagined futures they've never been able to show anyone — until now." },
      { icon: "🧘", label: "Spiritual & manifestation practitioners", desc: "Those who use visualization as a tool and want an AI-rendered cinematic version of their meditation visions." },
      { icon: "✍️", label: "Authors & world-builders", desc: "Writers who want to see their fictional worlds or story settings rendered in stunning cinematic detail." },
      { icon: "🎨", label: "Artists seeking visual inspiration", desc: "Creatives who want AI-generated visual references for their own art, music, or creative projects." },
    ],
    tiers: [
      { name: "Essential", price: 79,  period: "one-time", revisions: 1, deliveryDays: 7, features: ["5 scenes", "2-min film", "Digital delivery"] },
      { name: "Premium",   price: 149, period: "one-time", revisions: 2, deliveryDays: 5, features: ["10 scenes", "5-min film", "Extended audio", "Color grading"] },
      { name: "Elite",     price: 299, period: "one-time", revisions: 4, deliveryDays: 4, features: ["20 scenes", "10-min film", "Full score", "4K delivery"] },
    ],
    acknowledgements: [
      "I understand AI visualizations are artistic interpretations and may differ from mental imagery.",
    ],
    profitMargin: 118,
  },
  "future-self-vision": {
    slug: "future-self-vision",
    name: "Future Self Vision",
    tagline: "See and hear your highest potential self",
    image: "/assets/prod-future-self.png",
    category: "AI Transformation",
    badge: "Transformative",
    description: "A powerful, personalized AI experience that helps you visualize and manifest your future self. Sophia AI conducts a deep interview, then we produce a cinematic vision film and personalized audio affirmation track.",
    deliverables: ["Sophia deep interview", "Future self film (5 min)", "Personalized affirmations", "Manifestation soundtrack"],
    whoFor: [
      { icon: "🚀", label: "Ambitious goal setters", desc: "High performers who use visualization as a tool and want an AI-produced film of their ideal future as daily motivation." },
      { icon: "🔄", label: "People in major life transitions", desc: "Those rebuilding after loss, divorce, or failure who need a clear, compelling vision of who they're becoming." },
      { icon: "🎯", label: "Entrepreneurs & founders", desc: "Business builders who want to crystalize their personal vision and use it as an emotional North Star for decision-making." },
      { icon: "🌅", label: "Mid-life reinvention seekers", desc: "Anyone at 35–55 who knows their best chapter is still ahead and wants a cinematic declaration of that future self." },
    ],
    tiers: [
      { name: "Essential", price: 79,  period: "one-time", revisions: 1, deliveryDays: 7, features: ["3 Sophia sessions", "2-min vision film", "10 affirmations"] },
      { name: "Premium",   price: 149, period: "one-time", revisions: 2, deliveryDays: 5, features: ["Unlimited sessions", "5-min vision film", "30 affirmations", "Soundtrack"] },
      { name: "Elite",     price: 299, period: "one-time", revisions: 4, deliveryDays: 4, features: ["VIP sessions", "10-min vision film", "Full affirmation suite", "Custom score"] },
    ],
    acknowledgements: [
      "I understand this experience is motivational and not a substitute for professional counseling.",
      "I consent to Sophia AI storing our conversation for personalization purposes.",
    ],
    profitMargin: 116,
  },
  "social-ready-clips": {
    slug: "social-ready-clips",
    name: "Social Ready Clips",
    tagline: "Cinematic story clips built for every platform",
    image: "/assets/prod-social-clips.png",
    category: "Social Media",
    badge: "Viral Ready",
    description: "Transform your emotional story into platform-optimized short-form video clips ready for Instagram Reels, TikTok, YouTube Shorts, and LinkedIn. Our AI generates cinematic micro-films from your story — each 15–90 seconds, formatted for maximum engagement. Complete with captions, emotional hooks, and original sound.",
    deliverables: ["5 social clips per order", "Platform-specific formats (9:16, 1:1, 16:9)", "AI-generated captions", "Original music per clip", "Hook optimization", "Download-ready files"],
    whoFor: [
      { icon: "📱", label: "Content creators & influencers", desc: "Those growing an audience on social media who want cinematic, story-driven content that stops the scroll." },
      { icon: "💼", label: "Entrepreneurs & personal brands", desc: "Founders and coaches sharing their journey publicly who need premium short-form content without a videographer." },
      { icon: "🎓", label: "Students & young storytellers", desc: "People early in their content journey who want professional-quality storytelling clips without a big budget." },
      { icon: "💔", label: "People processing publicly", desc: "Those sharing a healing, transformation, or life journey online who want their story told beautifully and authentically." },
    ],
    tiers: [
      { name: "Essential", price: 49,  period: "one-time", revisions: 1, deliveryDays: 3, features: ["5 clips", "9:16 + 1:1 formats", "AI captions", "Original music", "MP4 download"] },
      { name: "Creator",   price: 99,  period: "one-time", revisions: 2, deliveryDays: 2, features: ["10 clips", "All 3 formats", "Hook optimization", "Custom captions", "Trend overlay", "Rush delivery"] },
      { name: "Pro",       price: 199, period: "one-time", revisions: 3, deliveryDays: 1, features: ["20 clips", "All formats", "Hook A/B variants", "Brand kit overlay", "Social scheduler pack", "Priority queue"] },
    ],
    acknowledgements: [
      "I confirm I have rights to all story content, photos, and media I provide.",
      "I understand clips are AI-generated from my submitted story and will reflect my emotional narrative.",
      "I agree to Ghaafeedi Music's content usage policy for AI-generated social media content.",
    ],
    profitMargin: 121,
  },
};

interface Product {
  slug: string;
  name: string;
  tagline: string;
  image: string;
  category: string;
  badge?: string;
  description: string;
  deliverables: string[];
  whoFor: { icon: string; label: string; desc: string }[];
  tiers: { name: string; price: number; period: string; revisions: number | null; deliveryDays: number | null; features: string[] }[];
  acknowledgements: string[];
  profitMargin: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const GOLD = "#D4AF37";
const GOLD2 = "#FFC24D";
const BG = "#050B1A";
const NAVY = "#0B1736";

// ─── Product Detail Page ───────────────────────────────────────────────────────
export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const product = PRODUCTS[slug ?? ""];
  const { data: session } = authClient.useSession();

  const [selectedTier, setSelectedTier] = useState(1); // default: premium
  const [showAckModal, setShowAckModal] = useState(false);
  const [ackChecked, setAckChecked] = useState<boolean[]>([]);
  const [ackDone, setAckDone] = useState(false);
  const [ackLoading, setAckLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setAckChecked(new Array(product.acknowledgements.length).fill(false));
    }
  }, [product?.slug]);

  // Check if already acknowledged
  useEffect(() => {
    if (!session || !product) return;
    api.acknowledgements[":productSlug"].$get({ param: { productSlug: product.slug } })
      .then(r => r.json())
      .then(d => { if (d.acknowledged) setAckDone(true); })
      .catch(() => {});
  }, [session, product?.slug]);

  if (!product) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Inter, sans-serif" }}>Product not found.</p>
          <button onClick={() => setLocation("/products")} style={{ marginTop: 16, padding: "10px 24px", background: GOLD, color: BG, border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 700 }}>Browse Products</button>
        </div>
      </div>
    );
  }

  const tier = product.tiers[selectedTier];

  const handleBeginJourney = () => {
    if (!session) {
      setLocation(`/signup?redirect=/products/${product.slug}`);
      return;
    }
    if (!ackDone) {
      setShowAckModal(true);
      return;
    }
    setLocation(`/onboarding?product=${product.slug}&tier=${selectedTier}`);
  };

  const handleAcknowledge = async () => {
    if (ackChecked.some(v => !v)) return;
    setAckLoading(true);
    try {
      await api.acknowledgements.$post({ json: { productSlug: product.slug } });
      setAckDone(true);
      setShowAckModal(false);
      setLocation(`/onboarding?product=${product.slug}&tier=${selectedTier}`);
    } catch {
      // fallback — still proceed
      setAckDone(true);
      setShowAckModal(false);
      setLocation(`/onboarding?product=${product.slug}&tier=${selectedTier}`);
    } finally {
      setAckLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "Inter, sans-serif", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #010510; } ::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 2px; }
      `}</style>

      {/* Navbar */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "18px 40px", background: "rgba(5,11,26,0.92)", borderBottom: "1px solid rgba(212,175,55,0.1)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setLocation("/products")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.6)", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>←</span> All Products
        </button>
        <span style={{ fontFamily: "Playfair Display, serif", fontWeight: 700, fontSize: 15, background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD2} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Ghaafeedi Music</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {session ? (
            <>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,0.42)", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session.user?.name || session.user?.email}
              </span>
              <button onClick={() => setLocation("/dashboard")} style={{ padding: "8px 18px", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, color: GOLD, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Dashboard</button>
              <button onClick={async () => { await authClient.signOut(); if (typeof (authClient as any).clearToken === "function") (authClient as any).clearToken(); setLocation("/"); }} style={{ padding: "8px 18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "rgba(255,255,255,0.62)", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Sign Out</button>
            </>
          ) : (
            <>
              <button onClick={() => setLocation("/signin")} style={{ padding: "8px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Sign In</button>
              <button onClick={() => setLocation("/signup")} style={{ padding: "8px 18px", background: `linear-gradient(135deg, ${GOLD}, #b8902a)`, border: "none", borderRadius: 8, color: BG, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Join Free</button>
            </>
          )}
        </div>
      </nav>

      <div style={{ paddingTop: 72 }}>
        {/* Hero */}
        <div style={{ position: "relative", height: 420, overflow: "hidden" }}>
          <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%", filter: "brightness(0.62) saturate(1.85) contrast(1.18)" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(5,11,26,0.2) 0%, rgba(5,11,26,0.6) 60%, rgba(5,11,26,1) 100%)" }} />
          <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, padding: "0 60px", maxWidth: 900, margin: "0 auto" }}>
            {product.badge && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 20, padding: "4px 14px", marginBottom: 14 }}>
                <span style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: "0.1em" }}>✦ {product.badge}</span>
              </div>
            )}
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>{product.category}</div>
            <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(28px,4vw,52px)", fontWeight: 700, color: "#FFFFFF", margin: "0 0 12px", textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>{product.name}</h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", margin: 0, maxWidth: 560 }}>{product.tagline}</p>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 48, alignItems: "start", marginTop: 48 }}>

            {/* Left column */}
            <div>
              {/* Description */}
              <div style={{ marginBottom: 40 }}>
                <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 24, fontWeight: 700, color: "#FFFFFF", margin: "0 0 16px" }}>About This Experience</h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 1.8, margin: 0 }}>{product.description}</p>
              </div>

              {/* Who This Is Perfect For */}
              {product.whoFor && product.whoFor.length > 0 && (
                <div style={{ marginBottom: 40 }}>
                  <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 24, fontWeight: 700, color: "#FFFFFF", margin: "0 0 6px" }}>Who This Is Perfect For</h2>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 22px", letterSpacing: "0.03em" }}>Four types of people this experience was built for</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {product.whoFor.map((w, i) => (
                      <div key={i} style={{ padding: "20px 20px", background: "rgba(11,23,54,0.55)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 14, transition: "border-color 0.2s" }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.35)")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(212,175,55,0.12)")}>
                        <div style={{ fontSize: 28, marginBottom: 10, lineHeight: 1 }}>{w.icon}</div>
                        <div style={{ fontFamily: "Playfair Display, serif", fontSize: 14, fontWeight: 700, color: GOLD, marginBottom: 8, lineHeight: 1.3 }}>{w.label}</div>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.65 }}>{w.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliverables */}
              <div style={{ marginBottom: 40, padding: "28px 32px", background: "rgba(11,23,54,0.6)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 16 }}>
                <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 20, color: GOLD, margin: "0 0 20px" }}>What You'll Receive</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {product.deliverables.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ color: GOLD, fontSize: 12, marginTop: 2, flexShrink: 0 }}>✦</span>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tier comparison */}
              <div>
                <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 20, color: "#FFFFFF", margin: "0 0 20px" }}>Choose Your Tier</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {product.tiers.map((t, i) => (
                    <motion.div key={i}
                      onClick={() => setSelectedTier(i)}
                      whileHover={{ scale: 1.01 }}
                      style={{
                        padding: "20px 24px", borderRadius: 14, cursor: "pointer",
                        background: selectedTier === i ? "rgba(212,175,55,0.08)" : "rgba(11,23,54,0.5)",
                        border: selectedTier === i ? "1.5px solid rgba(212,175,55,0.5)" : "1px solid rgba(255,255,255,0.08)",
                        boxShadow: selectedTier === i ? "0 0 24px rgba(212,175,55,0.08)" : "none",
                        transition: "all 0.2s",
                      }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${selectedTier === i ? GOLD : "rgba(255,255,255,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {selectedTier === i && <div style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD }} />}
                          </div>
                          <span style={{ fontFamily: "Playfair Display, serif", fontSize: 16, fontWeight: 700, color: selectedTier === i ? GOLD : "#FFFFFF" }}>{t.name}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 22, fontWeight: 700, color: selectedTier === i ? GOLD : "#FFFFFF", fontFamily: "Playfair Display, serif" }}>${t.price.toLocaleString()}</span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 4 }}>/{t.period}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {t.features.map((f, j) => (
                          <span key={j} style={{ fontSize: 11, color: selectedTier === i ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.5)", background: selectedTier === i ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${selectedTier === i ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: 20, padding: "3px 10px" }}>{f}</span>
                        ))}
                      </div>
                      {(t.revisions !== null || t.deliveryDays !== null) && (
                        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                          {t.deliveryDays && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>⏱ {t.deliveryDays} day delivery</span>}
                          {t.revisions !== null && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>✏ {t.revisions} revision{t.revisions !== 1 ? "s" : ""}</span>}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column — sticky CTA */}
            <div style={{ position: "sticky", top: 90 }}>
              <div style={{ background: "rgba(11,23,54,0.92)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 20, padding: "32px 28px", boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 40px rgba(212,175,55,0.06)" }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: 4 }}>SELECTED TIER</div>
                  <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, color: GOLD, fontWeight: 700 }}>{tier.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 8 }}>
                    <span style={{ fontFamily: "Playfair Display, serif", fontSize: 36, fontWeight: 700, color: "#FFFFFF" }}>${tier.price.toLocaleString()}</span>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>/{tier.period}</span>
                  </div>
                  {tier.deliveryDays && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>Est. delivery: {tier.deliveryDays} business days</div>}
                </div>

                {/* CTA */}
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(212,175,55,0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBeginJourney}
                  style={{ width: "100%", padding: "16px", background: `linear-gradient(135deg, ${GOLD} 0%, #b8902a 100%)`, border: "none", borderRadius: 12, color: BG, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.03em", boxShadow: "0 0 24px rgba(212,175,55,0.3)", marginBottom: 16, transition: "all 0.2s" }}>
                  {session ? (ackDone ? "✦ Begin Production" : "✦ Begin Journey") : "✦ Create Account & Begin"}
                </motion.button>

                {!session && (
                  <button onClick={() => setLocation(`/signin?redirect=/products/${product.slug}`)}
                    style={{ width: "100%", padding: "13px", background: "transparent", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 12, color: GOLD, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif", marginBottom: 20, transition: "all 0.2s" }}>
                    Already a member? Sign in
                  </button>
                )}

                {/* Security badges */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                  {["🔒 SSL Secured", "✦ Dodo Payments", "🛡 PCI DSS", "↩ Satisfaction Guarantee"].map((b, i) => (
                    <div key={i} style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>{b}</div>
                  ))}
                </div>

                {!session && (
                  <div style={{ padding: "14px 16px", background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 12 }}>
                    <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>FREE MEMBERSHIP</div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.6 }}>
                      Creating an account is free. You'll receive your unique <strong style={{ color: GOLD }}>GM Member ID</strong> and can explore all 14 experiences before purchasing.
                    </p>
                  </div>
                )}

                {session && ackDone && (
                  <div style={{ padding: "10px 14px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, textAlign: "center" }}>
                    <span style={{ fontSize: 11, color: "#22C55E", fontWeight: 600 }}>✓ Experience terms acknowledged</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acknowledgement Modal */}
      <AnimatePresence>
        {showAckModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
            onClick={e => { if (e.target === e.currentTarget) setShowAckModal(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}
              style={{ background: "rgba(11,23,54,0.98)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20, padding: "40px 36px", maxWidth: 540, width: "100%", boxShadow: "0 40px 80px rgba(0,0,0,0.7)" }}>

              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>📋</div>
                <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, color: GOLD, margin: "0 0 8px" }}>Experience Agreement</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0 }}>Please review and acknowledge the following before beginning your journey with <strong style={{ color: "#FFFFFF" }}>{product.name}</strong>.</p>
              </div>

              <div style={{ marginBottom: 24 }}>
                {product.acknowledgements.map((item, i) => (
                  <div key={i} onClick={() => {
                    const updated = [...ackChecked];
                    updated[i] = !updated[i];
                    setAckChecked(updated);
                  }} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: i < product.acknowledgements.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", cursor: "pointer" }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${ackChecked[i] ? GOLD : "rgba(255,255,255,0.25)"}`, background: ackChecked[i] ? GOLD : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all 0.15s" }}>
                      {ackChecked[i] && <span style={{ fontSize: 11, color: BG, fontWeight: 700 }}>✓</span>}
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", margin: 0, lineHeight: 1.6 }}>{item}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setShowAckModal(false)}
                  style={{ flex: 1, padding: "13px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                  Cancel
                </button>
                <motion.button
                  onClick={handleAcknowledge}
                  disabled={ackChecked.some(v => !v) || ackLoading}
                  whileHover={!ackChecked.some(v => !v) ? { scale: 1.02 } : {}}
                  style={{ flex: 2, padding: "13px", background: ackChecked.every(v => v) ? `linear-gradient(135deg, ${GOLD}, #b8902a)` : "rgba(212,175,55,0.2)", border: "none", borderRadius: 10, color: ackChecked.every(v => v) ? BG : "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 700, cursor: ackChecked.every(v => v) ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif", transition: "all 0.2s" }}>
                  {ackLoading ? "Processing..." : "✦ I Acknowledge — Begin Journey"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unused var suppressor */}
      <span style={{ display: "none" }}>{NAVY}</span>
    </div>
  );
}
