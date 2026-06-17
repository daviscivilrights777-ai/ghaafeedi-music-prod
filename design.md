# Ghaafeedi Music — Design System

## Brand
- **Name**: Ghaafeedi Music (exact spelling always)
- **Vibe**: Luxury, cinematic, emotional, premium, modern, AI-powered
- **Feel**: Netflix + Spotify + Disney+ + OpenAI fused into one ecosystem

## Colors
```
--bg-primary: #050B1A       /* deep dark navy background */
--bg-secondary: #0B1736     /* navy card/section background */
--gold: #D4AF37             /* primary accent gold */
--gold-light: #F0CC5A       /* lighter gold highlight */
--gold-dark: #A8860F        /* deeper gold shadow */
--text-primary: #FFFFFF
--text-muted: rgba(255,255,255,0.6)
--text-subtle: rgba(255,255,255,0.4)
--card-border: rgba(212,175,55,0.2)
--glow-gold: rgba(212,175,55,0.4)
```

## Typography
- **Headings**: Playfair Display (serif, italic for hero)
- **Body**: Inter (sans-serif)
- **Display sizes**: 72px hero, 48px section h2, 32px h3, 24px h4
- **Line heights**: 1.1 for display, 1.5 for body
- **Letter spacing**: -0.02em for display, normal for body

## Spacing
- Section padding: 100px vertical
- Container max-width: 1440px
- Card gap: 24px

## Component Patterns
- **Buttons primary**: gold bg (#D4AF37), navy text, rounded-full, 16px padding, hover glow
- **Buttons secondary**: transparent, gold border, gold text, rounded-full
- **Cards**: dark navy bg (#0B1736), gold border 1px, subtle gold glow on hover
- **Section dividers**: gold line with label centered
- **Stats**: gold number + white label
- **Badges**: small caps, gold/dark bg

## Layout
- Full-width dark sections alternating with card grids
- Overlapping elements, aurora/glow effects in hero
- 6-column product card grid (2x across desktop)
- How it works: horizontal numbered steps with icons

## Effects
- Aurora glow background in hero (green/purple/gold radial gradients)
- Glowing portal ring (gold animated ring)
- Particle/star field on hero
- Gold text gradients on key words
- Frosted glass cards with subtle borders
- Hover: card lift + glow intensify

## Animation (framer-motion)
- Hero: staggered fade+slide up on load
- Cards: fade in on scroll (viewport intersection)
- Portal: slow rotation pulse
- Stats counter on scroll
