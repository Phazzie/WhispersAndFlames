---
version: alpha
name: Whispers and Flames
description: An intimate, romantic design system for couples' conversation and connection
colors:
  primary: "#DC2626"
  secondary: "#7C3AED"
  accent-warmth: "#F59E0B"
  accent-tenderness: "#EC4899"
  dark-bg: "#0F172A"
  dark-secondary: "#1E293B"
  light-text: "#F8FAFC"
  muted-text: "#94A3B8"
typography:
  headline:
    fontFamily: Playfair Display, serif
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  h2:
    fontFamily: Playfair Display, serif
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.2
  h3:
    fontFamily: Playfair Display, serif
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.3
  body-lg:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.05em
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-tertiary:
    backgroundColor: "transparent"
    borderColor: "{colors.accent-warmth}"
    textColor: "{colors.accent-warmth}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.dark-secondary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.dark-bg}"
    borderColor: "{colors.secondary}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

## Overview

Whispers and Flames creates a sacred space for intimate connection between partners. The design is warm, romantic, and deeply intentional—evoking candlelight, vulnerability, and emotional intimacy. The palette is sensual but never explicit; the mood is playful yet profound.

The target audience is couples seeking deeper understanding and connection. The emotional tone should be: safe, vulnerable, playful, passionate, and validated.

## Colors

A rich palette balancing warmth, passion, and mystery.

- **Primary (#DC2626):** Deep red that speaks of passion, closeness, and emotional fire. Dominant in primary actions and highlights.
- **Secondary (#7C3AED):** Rich purple for secondary actions, representing introspection and depth.
- **Accent Warmth (#F59E0B):** Warm amber-gold for moments of tenderness and celebration. Brings light and hope.
- **Accent Tenderness (#EC4899):** Soft pink for gentle moments, affection cues, and supportive feedback.
- **Dark Background (#0F172A):** Very dark blue-black that feels like a private room. Reduces eye strain while maintaining intimacy.
- **Dark Secondary (#1E293B):** Slightly lighter for cards and interactive elements, creating clear visual hierarchy.
- **Light Text (#F8FAFC):** Near-white for primary text, ensuring readability without harshness.
- **Muted Text (#94A3B8):** Soft gray-blue for secondary text and hints.

## Typography

Serif headlines (Playfair Display) create elegance and emotional weight; clean sans-serif body text ensures accessibility and modern feel. The serif-sans pairing signals "romantic yet contemporary."

- **Headlines:** Playfair Display serif for timeless, literary feel.
- **Body**: Clean system fonts at 16–18px for comfortable reading.
- **UI Labels**: Condensed sans-serif with light tracking for clarity.

## Layout

Single-column mobile layout; centered two-column or card-based grid on desktop (max-width 1200px). Asymmetrical element placement mirrors the non-linear nature of intimate conversations. Generous padding (24px in cards) and breathing room create a safe, unhurried experience.

## Elevation & Depth

Subtle depth through color layering rather than heavy shadows. Cards sit on the dark background with gentle shadow (0 4px 12px rgba(0,0,0,0.3)) that feels intimate, not harsh. Focus states brighten and warm the card slightly.

## Shapes

Moderate rounding (8px on cards, 12px on larger elements) softens the interface without appearing juvenile. Consistent rounding across all interactive elements creates visual harmony.

## Components

### Buttons
- **Primary Button (Red)**: Deep red background, white text, 8px rounding. Used for primary category/spice level selection, "Ask Question," "Next."
- **Secondary Button (Purple)**: Rich purple background, white text. Used for settings, profile, secondary workflows.
- **Tertiary Button (Gold)**: Transparent with gold border and text. Used for secondary actions like "Skip," "Later."

### Cards
- Dark secondary background (#1E293B), 24px padding, 8px rounding, subtle shadow.
- Used for questions, answer reveals, achievement unlocks, and "Therapist's Notes."

### Inputs
- Very dark background (#0F172A), subtle purple border, 8px rounding, 12px 16px padding.
- Placeholder text in muted gray; focus state: bright red border.

### Achievement Badges
- Playful background in warm gold or soft pink, dark text with subtle shadow.
- Used to celebrate milestones and moments of connection.

### Question Cards (Specialized Component)
- Higher visual weight: soft pink or purple border, slightly larger padding.
- Designed to feel like an intimate prompt, not a cold survey.

## Do's and Don'ts

- **Do** use the deep red sparingly for moments that matter—primary questions, milestone achievements.
- **Don't** use cold colors; warmth is core to the brand.
- **Do** balance passion (red) with tenderness (pink) across the experience.
- **Don't** use harsh shadows or high-contrast dividers; softness creates safety.
- **Do** celebrate vulnerability and connection with playful achievements and "Dr. Ember" moments.
- **Don't** use clinical or sterile language; warmth extends to copy.
- **Do** maintain consistent serif-for-hearts, sans-serif-for-actions pattern.
- **Don't** add distracting animations; subtle, intentional motion only.