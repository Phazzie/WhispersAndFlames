# Whispers and Flames
## Product Requirements Document (PRD)

**Version:** 1.0
**Last Updated:** 2025-11-21
**Product:** Whispers and Flames
**Tagline:** *Your turn to play with fire.*

---

## Executive Summary

**Whispers and Flames** is an AI-powered intimacy exploration platform for couples and triads. It creates a safe, playful space for partners to explore desires, deepen connection, and discover shared interests through guided question-and-answer sessions led by Ember—an AI persona that's part wingman, part therapist, part co-conspirator.

The product transforms what is typically awkward (talking about desires) into something playful and safe through:
- Carefully calibrated AI-generated questions
- Adjustable intensity levels
- Privacy-first design
- Personalized insights and summaries

---

## Problem Statement

### The Core Problem

Couples struggle to have honest conversations about intimacy for several reasons:

1. **Social Conditioning**: People are taught that discussing desires explicitly is awkward or inappropriate
2. **Fear of Judgment**: Partners worry about being judged for their interests or fantasies
3. **Lack of Framework**: Most people don't know *how* to start these conversations or what questions to ask
4. **Vulnerability Barrier**: Opening up requires trust and safety that's hard to establish spontaneously
5. **Mismatched Comfort Levels**: Partners may have different comfort levels with explicit conversation

### Current Solutions (And Why They Fall Short)

- **Couples Therapy**: Expensive, scheduling barriers, feels clinical
- **"Intimacy Games"**: Often cheesy, generic questions, one-size-fits-all approach
- **DIY Conversation Starters**: Require planning, feel forced, lack personalization
- **Nothing**: Most common "solution"—couples simply don't have these conversations

### What Success Looks Like

Partners can:
- Discover shared interests they didn't know existed
- Voice desires they've been hesitant to mention
- Build emotional intimacy alongside physical exploration
- Feel safe being vulnerable with each other
- Get concrete, playful suggestions for "next adventures"

---

## Target Audience

### Primary Users

**Established Couples (Dating 6+ months)**
- Age: 25-45
- Relationship Stage: Committed, emotionally bonded
- Tech Savviness: Moderate to high
- Pain Points: Routine settling in, want to maintain spark, curious about deeper exploration
- Motivations: Strengthening connection, exploring new territory, maintaining excitement

**Secondary Characteristics:**
- Open-minded about technology in relationship building
- Values privacy and discretion
- Comfortable with AI assistance for personal topics
- Willing to be vulnerable in controlled environments

### Secondary Users

**Triads/Polyamorous Groups**
- 3-person dynamics
- Complexity: Need for balanced exploration among three people
- Motivations: Understanding complementary dynamics, navigating shared interests

### Non-Target Users (At Launch)

- New relationships (< 3 months) - lack foundational trust
- Singles looking for matchmaking
- Casual dating scenarios
- Users seeking explicit content rather than exploration framework

---

## Product Vision

### North Star

"Make intimate conversations feel as natural as they should be—playful, insightful, and deeply connecting."

### 3-Year Vision

Whispers and Flames becomes the default platform couples use when they want to:
- Reconnect after routine has set in
- Explore new dimensions of their relationship
- Prepare for deeper conversations before couples therapy
- Celebrate milestones (anniversaries, special occasions)
- Navigate transitions (moving in together, marriage, etc.)

### Success Metrics

**Primary:**
- Session Completion Rate (target: >75%)
- Return Usage Rate (target: Users run 2+ sessions)
- User-Reported Connection Score (post-session survey: target 4.5+/5)

**Secondary:**
- Answer Depth (characters per answer: target 100+)
- Session Duration (target: 20-30 minutes)
- "Next Adventure" Action Rate (% who report trying suggestions: target 40%+)

**Health Metrics:**
- Safety Reports (target: <0.1% of sessions)
- Premature Exit Rate (target: <15%)

---

## Core Features

### 1. Game Room System

**Purpose:** Create private, ephemeral spaces for intimate conversations.

**Functionality:**
- Unique room codes (6 characters, easy to share)
- Maximum 3 players per room
- One host who controls game progression
- Real-time synchronization across all participants
- Auto-expiration after 24 hours (privacy protection)

**User Flow:**
1. User creates room → receives unique code
2. Shares code with partner(s) via text, QR, or link
3. All players join using code
4. Room is destroyed 24 hours after creation

**Technical Requirements:**
- Sub-second state synchronization
- Works on mobile and desktop
- No account required to join (but to create)
- Secure code generation (no guessable patterns)

---

### 2. Intimacy Categories

**Purpose:** Allow couples to choose conversation domains that interest them.

**Categories:**

1. **Hidden Attractions** - Unspoken turn-ons, secret observations, physical fascinations
2. **Power Play** - Dominance/submission dynamics, control, giving/taking direction
3. **Fantasy Confessions** - Daydreams, scenarios, unexplored desires
4. **Emotional Intimacy** - Vulnerability, needs, deeper connection points
5. **Sensory Exploration** - Touch, taste, sound, smell, sight-based desires
6. **Public/Private** - Where, when, who-might-see scenarios
7. **Roleplay & Scenarios** - Character dynamics, situation fantasies

**User Flow:**
1. Each player independently selects 1-3 categories
2. System identifies overlapping categories
3. Game proceeds only with shared category choices (ensures mutual interest)

**Design Principles:**
- Categories must be non-judgmental in framing
- Icons and descriptions should be playful, not clinical
- No category should feel "too advanced" or intimidating

---

### 3. Spicy Level Calibration

**Purpose:** Allow couples to set comfort level for question intensity.

**Levels:**

**Mild:** Romantic tension, emotional intimacy, "what if" scenarios
- Example: "What's one non-sexual thing your partner does that makes you think sexual thoughts?"
- Tone: Flirty, suggestive, building anticipation

**Medium:** Sensual scenarios, specific attractions, implied sexuality
- Example: "Describe exactly where you'd want your partner's hands during a kiss. Not just 'on me'—WHERE?"
- Tone: Warm, building heat, specific but not graphic

**Hot:** Explicit desires, detailed fantasies, power dynamics
- Example: "Complete this: 'I want to [blank] you until you [blank].'"
- Tone: Explicitly sexual, direct, fantasy-focused

**Extra-Hot:** Boundary-pushing, taboo-adjacent, unfiltered
- Example: "What's the filthiest thing you'd want to whisper to your partner while [doing something specific]?"
- Tone: Intense, raw, extreme scenarios (but always consensual)

**Special Feature: Chaos Mode**
- Optional toggle
- System randomly upgrades 1-2 questions to next spicy level
- Adds element of surprise and spontaneity
- Can be disabled by host

**User Flow:**
1. Each player votes on preferred spicy level
2. System selects most conservative choice (respects boundaries)
3. Chaos mode applied if all players opt-in

---

### 4. AI Question Generation (Ember)

**Purpose:** Generate contextually appropriate, thought-provoking questions that create intimacy.

**Ember's Core Behavior:**

**Personality:**
- Part wingman, part therapist, part co-conspirator
- Playful but never crude
- Insightful without being invasive
- Creates safety through specificity

**Question Patterns:**

1. **The "Exactly" Pattern** - Forces precision
   - "Exactly where on your partner's body do your eyes go first?"

2. **The "One Specific" Pattern** - Vulnerability through detail
   - "What's one specific moment this week when you wanted your partner but didn't say anything?"

3. **Sensory Constraint** - Abstract desires made concrete
   - "If you blindfolded your partner, what's the first thing you'd want them to feel?"

4. **Observation-Based** - Builds from reality
   - "What's one completely non-sexual thing your partner does that somehow makes you think sexual thoughts?"

5. **Complete This** - Confession as game
   - "Complete this: 'I want you to hold me down and [blank].'"

6. **Implied History** - Pulls from shared past
   - "Think of the hottest moment you've had together. What made it hot?"

7. **Future-Pulling** - Safe escalation
   - "What's one room where you've never fooled around but probably should?"

8. **Power Play** - Dominance/submission exploration
   - "What's one instruction you'd love to give that starts with 'Don't move while I...'?"

9. **Choreography** (Trios) - Three-person dynamics
   - "One partner kissing your neck, the other your wrist. Who's where, and why?"

10. **Vulnerability Invitation** - Direct desire admission
    - "What do you wish your partner knew makes you feel completely desired?"

**Technical Requirements:**
- Questions must match selected categories
- Questions must match spicy level (no bleeding across levels)
- Questions must be about THEIR partner(s), never hypothetical strangers
- No repetition within a session
- Questions build incrementally (observation → desire → confession → planning)

**Generation Constraints:**
- Input sanitization (prevent prompt injection)
- Maximum question length: 200 characters
- Response time: < 3 seconds
- Failure mode: System has backup question bank

---

### 5. Session Flow

**Purpose:** Guide couples through a structured, paced exploration.

**Flow Steps:**

**Step 1: Lobby**
- Players join room
- See who's present
- Ready-check system
- Host can start when all players ready

**Step 2: Category Selection**
- Each player selects 1-3 categories independently
- System reveals overlap
- If no overlap, players reselect
- Minimum 1 shared category to proceed

**Step 3: Spicy Level**
- Each player votes on level
- System shows vote distribution
- Final level = most conservative vote
- Chaos mode opt-in
- All players must approve to proceed

**Step 4: Question Round**
- 5-8 questions total
- Questions displayed one at a time
- Each player answers privately (others can't see until all submit)
- Answers revealed simultaneously (prevents anchoring)
- Optional: Host can skip questions
- Optional: Players can flag inappropriate questions

**Step 5: Summary & Insights**
- AI-generated summary of session
- Highlights shared themes/interests
- Suggests "next adventures"
- Optional: Dr. Ember's "Therapist Notes" (playful clinical observations)
- Optional: Visual memory (abstract art prompt based on session)

**Technical Requirements:**
- Progress indicator throughout
- Ability to pause and resume
- Clear visual feedback for "waiting on other players"
- Answer character limits: 500 characters
- Auto-save of answers (no data loss on connection issues)

---

### 6. Summary & Insights (The Scribe)

**Purpose:** Weave session answers into narrative that highlights connection.

**The Scribe's Behavior:**

**Core Identity:**
- Wise, empathetic observer
- Friend who points out what others missed
- Weaves conversations into narratives
- Celebrates vulnerability

**Rules:**
1. **Focus ONLY on Common Ground**: Summary must highlight what ALL players mentioned
2. **Ignore Solo Topics**: One person's unique interest = not included
3. **Offer "Next Adventure"**: 1-2 concrete, playful suggestions based on shared interests
4. **Speak Directly**: "What became clear is you both..." not "The participants..."
5. **Celebrate Vulnerability**: Acknowledge their openness as strength

**Summary Structure:**
1. Playful opening observation
2. Core shared theme identification (specific, not generic)
3. Specific question/answer reference
4. "Next adventure" suggestions
5. Warm, encouraging close

**Output:** 3-4 paragraphs, conversational tone

---

### 7. Therapist Notes (Dr. Ember)

**Purpose:** Provide playful clinical observations with personality.

**Dr. Ember's Behavior:**

**Core Identity:**
- Relationship therapist with PhD in Intimacy Studies
- Clinical language used playfully
- Sharp observations with dry wit
- Warm but never cloying

**Style:**
- Uses therapy jargon with a wink: "Patients demonstrated heightened receptivity to sensory-based stimuli"
- Identifies patterns, defenses, attachment styles, breakthroughs
- Observational, not prescriptive
- 3-4 structured paragraphs

**Format:**
1. **Session Overview**: 1-2 sentences, clinical tone with personality
2. **Key Observations**: 3 bullet points about dynamics, patterns, resonance
3. **Clinical Impression**: Full paragraph analyzing deeper patterns
4. **Recommendations**: Playful suggestions framed as clinical recommendations

**Output:** Professional language with delightful personality

---

### 8. Visual Memories

**Purpose:** Transform session emotional themes into tasteful artistic prompts.

**Behavior:**

**Core Identity:**
- Visual poet, artistic director
- Transforms conversations into art
- Creates emotional impressions, not literal representations

**Rules:**
1. Always abstract and metaphorical (never literal)
2. Sophisticated artistic language (art movements, color theory, composition)
3. Match emotional temperature of spicy level
4. Focus on emotion through visual symbolism
5. Keep tasteful always (even Extra-Hot uses sophisticated metaphor)

**Style Guide by Spicy Level:**
- **Mild**: Watercolors, pastels, soft focus, gentle curves
- **Medium**: Oil paintings, warm tones, impressionist, rich textures
- **Hot**: Contemporary art, dramatic lighting, bold contrasts, vivid reds
- **Extra-Hot**: Abstract expressionism, raw energy, intense colors, primal power

**Output:** 50-100 word image prompt suitable for AI image generation

**Safety:** Always "safe" or "moderate" - never "explicit"

---

### 9. Privacy & Security

**Purpose:** Ensure user data is protected and intimate conversations remain private.

**Core Principles:**

1. **Ephemeral by Default**
   - Game rooms auto-delete after 24 hours
   - No permanent storage of answers
   - Session data purged on expiration

2. **No Content Moderation on Answers**
   - AI never judges or moderates user responses
   - No scanning of answer content
   - Privacy > content safety for consenting adults

3. **Encrypted Transmission**
   - All data transmitted via HTTPS
   - Room codes generated securely (no predictable patterns)

4. **Minimal Data Collection**
   - Only required: User account for room creation
   - No email requirement for joining
   - No analytics on answer content

5. **User Control**
   - Users can flag inappropriate AI-generated questions
   - Ability to skip questions
   - Host can end session at any time
   - All data deleted on room expiration

**Compliance:**
- GDPR compliant (data minimization, right to deletion)
- COPPA compliant (18+ age gate)
- Privacy policy clearly states data handling

---

## User Experience Requirements

### Design Principles

1. **Playful, Not Porny**
   - Visual design: Warm, inviting, sophisticated
   - Color palette: Reds, oranges, warm tones (passion without crudeness)
   - Typography: Modern, readable, approachable
   - Imagery: Abstract, suggestive, never explicit

2. **Safety Through Design**
   - Clear visual hierarchy
   - Obvious exit points
   - Progress indicators
   - Confirmation dialogs for sensitive actions

3. **Mobile-First**
   - Most sessions happen on phones
   - Touch-optimized interactions
   - Works on smallest screens (320px width)
   - Works offline for answer entry (syncs when reconnected)

4. **Accessibility**
   - WCAG 2.1 AA compliance
   - Screen reader compatible
   - Keyboard navigation support
   - High contrast mode

### Key Screens

**1. Home Page**
- Hero message: "Your turn to play with fire"
- Two primary actions: "Create Room" / "Join Room"
- Quick value prop: "AI-guided intimacy conversations for couples"
- Social proof: Testimonials (if available)

**2. Lobby**
- Room code prominently displayed
- QR code for easy sharing
- Player list with ready status
- "Start Game" button (host only)

**3. Category Selection**
- Grid or list of categories with icons
- Each category shows brief description on hover/tap
- Selected categories highlighted
- "Confirm" button reveals overlap with partner

**4. Question Screen**
- Question text: Large, centered, easy to read
- Answer textarea: Generous size, character count
- "Submit" button only active after typing
- Waiting state after submit ("Waiting for others...")
- Answer reveal: Smooth transition, all answers shown simultaneously

**5. Summary Screen**
- AI summary text
- Optional: Therapist notes in collapsible section
- Optional: Visual memory preview
- "Play Again" and "Exit" buttons

### Copy Voice & Tone

**Brand Voice: Ember**
- Playful but never crude
- Insightful but never clinical
- Warm but never patronizing
- Specific but never invasive

**Tone Examples:**
- ✅ "What's one specific way your partner kisses you that makes you forget your own name?"
- ❌ "Do you like kissing your partner?"

- ✅ "It's clear that for both of you, anticipation is where the magic lives."
- ❌ "You both value foreplay."

- ✅ "Since you both lit up when talking about control, maybe the next move involves handing it over—or taking it completely."
- ❌ "You should try exploring dominance and submission."

---

## Technical Architecture (Framework-Agnostic)

### System Components

**1. Client Application**
- **Purpose**: User interface, session management
- **Requirements**:
  - Web-based (accessible via browser)
  - Responsive (mobile + desktop)
  - Real-time updates (websockets or polling)
  - Offline-capable for answer entry
  - Progressive Web App (installable)

**2. API Server**
- **Purpose**: Business logic, data orchestration
- **Endpoints**:
  - `POST /game/create` - Create room
  - `POST /game/join` - Join room
  - `GET /game/{roomCode}` - Fetch game state
  - `POST /game/update` - Update game state
  - `DELETE /game/{roomCode}` - Delete room (manual or auto)
  - `GET /health` - Health check
  - `GET /health/db` - Database health

**3. Database**
- **Purpose**: Store game state, user accounts
- **Requirements**:
  - Relational or document-based
  - ACID compliance for game state updates
  - Auto-expiration of records (TTL)
  - Connection pooling
  - Row-level locking (prevent race conditions)

**Schema (Conceptual):**
```
Game {
  roomCode: string (primary key)
  hostId: string
  players: array of Player objects
  step: enum (lobby, categories, spicy, game, summary)
  categories: array of strings
  spicyLevel: enum (Mild, Medium, Hot, Extra-Hot)
  chaosMode: boolean
  questions: array of strings
  answers: array of strings
  summary: string (nullable)
  createdAt: timestamp
  expiresAt: timestamp (createdAt + 24 hours)
}

User {
  id: string (primary key)
  email: string
  createdAt: timestamp
}
```

**4. AI Service**
- **Purpose**: Generate questions, summaries, therapist notes, visual prompts
- **Requirements**:
  - LLM integration (Google Gemini, OpenAI, Anthropic, or similar)
  - Prompt management system
  - Input sanitization (prevent prompt injection)
  - Timeout handling (fallback to preset questions)
  - Rate limiting
  - Retry logic with exponential backoff

**Flows:**
- `generateQuestion(categories, spicyLevel, previousQuestions)` → string
- `generateSummary(questions, answers, categories, spicyLevel)` → string
- `generateTherapistNotes(questions, answers, categories, spicyLevel)` → string
- `generateVisualMemory(summary, spicyLevel, sharedThemes)` → {imagePrompt, safetyLevel}

**5. Authentication Service**
- **Purpose**: User account management, session protection
- **Requirements**:
  - OAuth providers (Google, Apple, Email)
  - Session management
  - JWT or session tokens
  - Password reset flows
  - Email verification

**6. Background Jobs**
- **Purpose**: Automated cleanup, maintenance
- **Jobs**:
  - Expire old game rooms (runs hourly)
  - Database cleanup (runs daily)
  - Health checks (runs every 5 minutes)

---

### Data Flow

**Creating a Game:**
```
1. User authenticates
2. Client → API: POST /game/create {roomCode, playerName}
3. API → Database: Create game record
4. API → Client: Return game state
5. Client displays lobby + room code
```

**Joining a Game:**
```
1. User (with or without account) enters room code
2. Client → API: POST /game/join {roomCode, playerName}
3. API → Database: Add player to game
4. API → Client: Return updated game state
5. Client displays lobby
6. All connected clients receive state update via polling/websockets
```

**Playing a Round:**
```
1. Host advances to "game" step
2. Client → AI Service: Generate question
3. AI Service → Client: Return question
4. All players see question
5. Each player submits answer
6. Client → API: POST /game/update {roomCode, updates: {answers: [...]}}
7. API → Database: Update game state
8. When all answers submitted, reveal to all players
9. Repeat for 5-8 questions
```

**Generating Summary:**
```
1. Host advances to "summary" step
2. Client → AI Service: Generate summary
3. AI Service analyzes all Q&A pairs
4. AI Service → Client: Return summary
5. Client → API: POST /game/update {summary}
6. All players see summary
```

---

### Non-Functional Requirements

**Performance:**
- Page load time: < 2 seconds (initial)
- AI response time: < 5 seconds (question generation)
- AI response time: < 10 seconds (summary generation)
- State synchronization latency: < 2 seconds
- Support 100 concurrent game sessions

**Scalability:**
- Horizontally scalable API servers
- Database connection pooling
- CDN for static assets
- AI service rate limiting

**Reliability:**
- 99.5% uptime target
- Auto-retry for transient failures
- Graceful degradation (fallback questions if AI fails)
- Database backups (daily)
- Disaster recovery plan

**Security:**
- HTTPS only
- SQL injection prevention (parameterized queries)
- XSS prevention (HTML sanitization)
- CSRF protection
- Rate limiting (prevent abuse)
- Input validation (Zod or similar schema validation)

---

## Success Criteria

### Launch Criteria (MVP)

**Must Have:**
- ✅ User authentication
- ✅ Game room creation and joining
- ✅ Category selection with overlap detection
- ✅ Spicy level calibration
- ✅ AI question generation (at least 3 patterns implemented)
- ✅ Q&A round (5 questions minimum)
- ✅ Session summary generation
- ✅ Mobile-responsive design
- ✅ 24-hour auto-expiration
- ✅ Privacy policy

**Should Have:**
- Therapist notes feature
- Chaos mode
- Visual memory generation
- QR code sharing
- Answer character limits with validation

**Could Have:**
- Session history (non-persisted answers, just metadata)
- Achievement system
- Customizable question count
- Multi-language support

### Post-Launch Success Metrics (6 Months)

**Engagement:**
- 500+ game sessions created
- 70%+ session completion rate
- 2.5+ sessions per user (lifetime average)

**Quality:**
- 4.0+ average rating (if we add rating system)
- < 5% premature exit rate
- < 1% flagged questions rate

**Growth:**
- 20% month-over-month user growth
- 30%+ viral coefficient (1 user invites 1.3 others)
- 10%+ organic social sharing rate

---

## Risks & Mitigations

### Risk 1: AI Generates Inappropriate Questions

**Impact:** High (damages user trust, brand reputation)

**Mitigation:**
- Extensive prompt engineering with safety guidelines
- Question flagging system
- Human review of flagged questions
- Fallback to curated question bank if AI fails
- Continuous monitoring and improvement

### Risk 2: Privacy Breach

**Impact:** Critical (user data exposed, legal consequences)

**Mitigation:**
- Minimal data collection
- Encryption in transit and at rest
- Regular security audits
- Penetration testing before launch
- Incident response plan
- Auto-deletion of expired sessions
- No logging of answer content

### Risk 3: Low Engagement/Completion Rates

**Impact:** Medium (product-market fit question)

**Mitigation:**
- User testing before launch
- Progressive disclosure (don't overwhelm with options)
- Clear onboarding flow
- Engaging copy and design
- Save/resume functionality
- Post-session surveys to understand drop-off

### Risk 4: AI Service Downtime or Rate Limits

**Impact:** Medium (degraded experience)

**Mitigation:**
- Fallback question bank (100+ curated questions)
- Retry logic with exponential backoff
- Multiple AI provider support
- Clear error messaging to users
- Graceful degradation

### Risk 5: Misuse (Harassment, Non-Consensual Use)

**Impact:** High (user safety, legal)

**Mitigation:**
- Terms of Service explicitly prohibit misuse
- Age gate (18+)
- Question flagging system
- Ability to exit session immediately
- Report abuse mechanism
- Ban policy for violations

---

## Future Enhancements (Post-MVP)

### Phase 2 Features

1. **Session History (Metadata Only)**
   - Track number of sessions played
   - Categories explored
   - Spicy levels used
   - NO storage of actual answers (privacy-first)

2. **Achievement System**
   - Unlock achievements based on exploration
   - Examples: "First Timer," "Chaos Enthusiast," "Category Explorer"
   - Playful, encouraging tone

3. **Customization Options**
   - Custom question count (3-10)
   - Custom timer per question
   - Voice/tone preferences for Ember

4. **Social Features (Opt-In)**
   - Shareable session badges (no content, just "We explored Power Play at Hot level")
   - Referral system
   - Anonymous community insights ("80% of couples enjoyed this category")

### Phase 3 Features

1. **Premium Tier**
   - Advanced AI personas (different voices for Ember)
   - Longer sessions (15+ questions)
   - Deeper insights and analysis
   - Session history with encrypted answer storage
   - Priority AI processing

2. **Couples Challenges**
   - Weekly themed challenges
   - Seasonal question packs
   - Anniversary mode

3. **Integration with Physical Products**
   - Game card deck companion
   - Branded merchandise
   - Partner apps (bedroom tech integration)

---

## Open Questions

1. **Monetization Strategy**
   - Free tier limitations?
   - Pricing for premium?
   - Subscription vs. pay-per-session?

2. **Content Moderation**
   - How much human review of flagged questions?
   - What's the threshold for banning users?

3. **Expansion Beyond Couples**
   - Solo mode for self-reflection?
   - Support for 4+ person groups?
   - Different relationship structures (open relationships, long-distance)?

4. **Regulatory Compliance**
   - Age verification requirements by jurisdiction?
   - Adult content regulations in different countries?

5. **Data Retention**
   - User requests to keep session data longer?
   - Export functionality for personal archiving?

---

## Appendix

### Glossary

- **Ember**: The AI persona that generates questions and insights
- **The Scribe**: The AI persona that writes session summaries
- **Dr. Ember**: The AI persona that writes therapist notes
- **Room Code**: 6-character alphanumeric code for joining games
- **Spicy Level**: Intensity calibration (Mild, Medium, Hot, Extra-Hot)
- **Chaos Mode**: Random spicy level upgrades during session
- **Next Adventure**: Concrete suggestions for continued exploration

### References

- AIGUIDA file: Core Ember personality and question patterns
- agents.md: Detailed AI persona documentation
- aiprompting.md: Full prompt engineering guidelines

---

**End of Document**
