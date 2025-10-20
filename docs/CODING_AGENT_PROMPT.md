# GitHub Copilot Coding Agent Implementation Prompt

## 🎯 Objective

Implement four advanced features for "Whispers and Flames" - an intimate conversation app. Each feature should blend seamlessly with the existing architecture while adding unconventional, memorable experiences.

---

## 🏗️ Architecture Context

**Tech Stack:**

- Next.js 15 (App Router)
- TypeScript (strict mode)
- In-memory session storage (ephemeral, 24hr TTL)
- Google Gemini AI via Genkit
- Session-based auth (no persistent user data)

**Key Files:**

- `/src/app/game/[roomCode]/page.tsx` - Main game orchestrator
- `/src/app/game/[roomCode]/steps/` - Step components (lobby, categories, spicy, game, summary)
- `/src/app/game/actions.ts` - Server actions for AI calls
- `/src/lib/game-types.ts` - Type definitions
- `/src/lib/storage.ts` - In-memory storage layer
- `/src/ai/flows/` - Genkit AI flows (DO NOT MODIFY EXISTING)

**Design System:**

- Background: `#212936` (dark grayish blue)
- Primary: `#D46A4E` (ember orange)
- Accent: `#A93226` (deep red)
- Font: 'Alegreya' (serif)
- UI: shadcn/ui components with Tailwind CSS

---

## 🎨 Feature 1: AI-Generated Visual Memory

**What:** Generate abstract/artistic images based on session's shared emotional themes

**Implementation Details:**

1. **Create `/src/ai/flows/generate-visual-memory.ts`:**
   - New Genkit flow using Gemini's multimodal capabilities
   - Input: `{ summary: string, spicyLevel: string, sharedThemes: string[] }`
   - Output: `{ imagePrompt: string, safetyLevel: 'safe' | 'moderate' | 'explicit' }`
   - Prompt engineering: Transform session themes into abstract, artistic image descriptions
   - Examples:
     - Mild: "Watercolor painting of intertwined light trails"
     - Hot: "Abstract sculpture of fire and silk merging"
   - NO explicit content - use metaphorical, artistic language
2. **Create `/src/lib/image-generation.ts`:**

   ```typescript
   export async function generateSessionImage(
     summary: string,
     spicyLevel: string,
     sessionId: string
   ): Promise<{ imageUrl: string; prompt: string } | null>;
   ```

   - Rate limit: Max 3 images per session (store count in session state)
   - Use Gemini's image generation OR Stability AI via API
   - Return temporary blob URLs (expires with session)
   - Graceful fallback if generation fails

3. **Update `/src/lib/game-types.ts`:**
   - Add to `GameState`:
     ```typescript
     visualMemories?: Array<{
       imageUrl: string;
       prompt: string;
       timestamp: number;
     }>;
     imageGenerationCount: number;
     ```

4. **Update `/src/app/game/[roomCode]/steps/summary-step.tsx`:**
   - Add "Generate Visual Memory" button after summary
   - Show loading state with artistic animation
   - Display generated images in elegant gallery
   - Show remaining generations (3 - count)
   - Use `<Image>` with blur-up placeholder
   - Add download button (ephemeral warning tooltip)

5. **Update `/src/app/game/actions.ts`:**
   ```typescript
   export async function generateVisualMemoryAction(
     sessionId: string
   ): Promise<{ imageUrl: string; prompt: string } | { error: string }>;
   ```

**Styling:**

- Gallery: CSS Grid, 2-column on desktop, 1 on mobile
- Images: Rounded corners, subtle shadow, hover scale effect
- Button: Primary color with loading spinner using `framer-motion`

---

## 🎲 Feature 2: Chaos Mode

**What:** Randomly upgrade question spicy level (1 in 5 chance) for unpredictability

**Implementation Details:**

1. **Update `/src/app/game/[roomCode]/steps/spicy-step.tsx`:**
   - Add toggle below spicy level selection:
     ```tsx
     <div className="flex items-center gap-3 mt-6">
       <Switch id="chaos-mode" />
       <Label htmlFor="chaos-mode" className="cursor-pointer">
         <Zap className="inline w-4 h-4 mr-2" />
         Chaos Mode: Surprise spicy upgrades
       </Label>
     </div>
     ```
   - Store in game state as `chaosMode: boolean`

2. **Update `/src/lib/game-utils.ts`:**

   ```typescript
   export function applyChaosMode(
     baseLevel: SpicyLevel['name'],
     chaosEnabled: boolean
   ): { level: SpicyLevel['name']; wasUpgraded: boolean } {
     if (!chaosEnabled || Math.random() > 0.2) {
       return { level: baseLevel, wasUpgraded: false };
     }

     const levels = ['Mild', 'Medium', 'Hot', 'Extra-Hot'];
     const currentIndex = levels.indexOf(baseLevel);
     if (currentIndex === levels.length - 1) {
       return { level: baseLevel, wasUpgraded: false };
     }

     const upgradedLevel = levels[currentIndex + 1] as SpicyLevel['name'];
     return { level: upgradedLevel, wasUpgraded: true };
   }
   ```

3. **Update `/src/app/game/[roomCode]/steps/game-step.tsx`:**
   - Before generating each question, call `applyChaosMode()`
   - If upgraded, show animated notification:
     ```tsx
     <AnimatePresence>
       {wasUpgraded && (
         <motion.div
           initial={{ scale: 0, rotate: -180 }}
           animate={{ scale: 1, rotate: 0 }}
           exit={{ scale: 0, rotate: 180 }}
           className="absolute top-4 right-4 bg-accent text-white px-4 py-2 rounded-full"
         >
           <Zap className="inline w-4 h-4 mr-2" />
           Chaos! Spicy level upgraded
         </motion.div>
       )}
     </AnimatePresence>
     ```
   - Auto-dismiss after 3 seconds
   - Add sound effect (optional): `<audio>` tag with "whoosh.mp3"

4. **Update `/src/ai/flows/generate-contextual-questions.ts` input:**
   - Pass the potentially upgraded level to question generation

**Edge Cases:**

- Already at Extra-Hot: No upgrade possible
- Show chaos upgrade history in session metadata

---

## 💊 Feature 3: Therapist's Notes

**What:** Alternative summary view with professional-but-playful clinical insights

**Implementation Details:**

1. **Create `/src/ai/flows/generate-therapist-notes.ts`:**
   - New Genkit flow (similar to summary flow)
   - Input: Same as `analyzeAnswersAndGenerateSummary`
   - Output: `{ notes: string }`
   - Prompt template:

     ```
     You are Dr. Ember, a slightly irreverent relationship therapist with a PhD in Intimacy Studies.

     Analyze this session and write clinical-style notes that are:
     - Professional but with personality
     - Use therapy jargon playfully ("Patient exhibits heightened receptivity to...")
     - Identify patterns, defenses, breakthroughs
     - WarmWarm, a bit cheeky, with a dry wit and  observational tone
     - 3-4 paragraphs

     Format:
     **Session Overview:** [1-2 sentences]
     **Key Observations:** [Bullet points]
     **Clinical Impression:** [Paragraph]
     **Recommendations:** [Playful suggestions]
     ```

2. **Update `/src/app/game/actions.ts`:**

   ```typescript
   export async function generateTherapistNotesAction(
     input: AnalyzeAnswersInput
   ): Promise<{ notes: string } | { error: string }>;
   ```

3. **Update `/src/app/game/[roomCode]/steps/summary-step.tsx`:**
   - Add tab switcher at top:
     ```tsx
     <Tabs defaultValue="summary" className="w-full">
       <TabsList className="grid w-full grid-cols-2">
         <TabsTrigger value="summary">Playful Summary</TabsTrigger>
         <TabsTrigger value="therapist">Dr. Ember's Notes</TabsTrigger>
       </TabsList>
       <TabsContent value="summary">{/* Existing summary */}</TabsContent>
       <TabsContent value="therapist">{/* Therapist notes with clipboard icon */}</TabsContent>
     </Tabs>
     ```
   - Load therapist notes lazily (only when tab clicked)
   - Use monospace font for notes (like real therapy notes)
   - Add "Download Notes" button (generates .txt file)

4. **Styling:**
   - Notes container: White background, subtle paper texture
   - Headers: Bold, ember orange color
   - Bullet points: Custom icon (small clipboard)

---

## 🏆 Feature 4: Achievement System Enhancement

**Status:** Enhanced system exists in `/src/lib/achievements.ts` with personality-driven descriptions

**What:** Add visual achievement unlocking with animations and session persistence

**Implementation Details:**

1. **Achievement Personalities (COMPLETED):**
   - **Heart-Thrower**: "Lobbed their heart into the ring and it stuck — brave, bright, and beautifully unignorable."
   - **Plot-Twist Picasso**: "Painted the conversation with a left-field brushstroke — deliciously unpredictable."
   - **Telepathic Wink**: "Finished each other's sentences like a psychic sitcom — eerie, delightful, and slightly illegal in three states."
   - **Fire Walker/Heat Seeker**: Spicy level achievements with seductive descriptions
   - **Depth Charger**: "Didn't just scratch the surface — brought scuba gear and snacks."
   - **Precision Poet**: "Said more with less — every word a calculated strike to the heart."
   - **Vault Cracker**: "Specialized in unlocking what was meant to stay locked — deliciously dangerous."
   - **Visual Storyteller**: "Painted emotions in tiny pictures — when words weren't quite enough."
   - **Curious Cat**: "Answered questions with more questions — beautifully, maddeningly inquisitive."
   - Add metadata:
     ```typescript
     export interface Achievement {
       id: string;
       name: string;
       description: string;
       icon: string;
       playerId?: string;
       rarity: 'common' | 'rare' | 'legendary';
       color: string; // Hex color for badge
     }
     ```
   - Add rarity to existing achievements:
     - Heart-Thrower: rare, `#D46A4E`
     - Plot-Twist Picasso: legendary, `#A93226`
     - Wavelength Wizards: rare, `#4A90E2`
     - etc.

2. **Update `/src/app/game/[roomCode]/steps/summary-step.tsx`:**
   - Calculate achievements after summary loads
   - Animated reveal sequence:
     ```tsx
     <AnimatePresence>
       {achievements.map((achievement, index) => (
         <motion.div
           key={achievement.id}
           initial={{ opacity: 0, y: 50, scale: 0.8 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           transition={{ delay: index * 0.3 }}
           className={cn(
             'achievement-card',
             achievement.rarity === 'legendary' && 'legendary-glow'
           )}
         >
           <div className="text-6xl mb-2">{achievement.icon}</div>
           <h3 className="font-bold">{achievement.name}</h3>
           <p className="text-sm opacity-80">{achievement.description}</p>
           {achievement.playerId && (
             <Badge variant="outline">{getPlayerName(achievement.playerId)}</Badge>
           )}
         </motion.div>
       ))}
     </AnimatePresence>
     ```
   - Add confetti effect for legendary achievements (use `canvas-confetti`)

3. **Add CSS for legendary glow:**

   ```css
   .legendary-glow {
     animation: pulse-glow 2s ease-in-out infinite;
     box-shadow: 0 0 20px rgba(169, 50, 38, 0.5);
   }

   @keyframes pulse-glow {
     0%,
     100% {
       box-shadow: 0 0 20px rgba(169, 50, 38, 0.5);
     }
     50% {
       box-shadow: 0 0 40px rgba(169, 50, 38, 0.8);
     }
   }
   ```

4. **Add sound effects (optional):**
   - Common: Soft chime
   - Rare: Bright ding
   - Legendary: Dramatic fanfare
   - Use Web Audio API or `<audio>` elements

---

## 🚨 Critical Requirements

**DO NOT:**

- Modify existing AI flow files except to add new ones
- Change authentication system
- Add persistent database (keep everything in-memory)
- Break existing game flow steps
- Use any frameworks outside current stack

**DO:**

- Use TypeScript strict mode
- Add proper error handling with user-friendly messages
- Follow existing code style (Prettier + ESLint)
- Use shadcn/ui components consistently
- Add loading states for all async operations
- Test in dev mode before committing

**Testing Checklist:**

- [ ] Run `npm run typecheck` - must pass
- [ ] Run `npm run lint` - must pass
- [ ] Run `npm run build` - must succeed
- [ ] Test full game flow: lobby → categories → spicy → game → summary
- [ ] Test chaos mode toggles correctly
- [ ] Test image generation with rate limiting
- [ ] Test achievement animations
- [ ] Test therapist notes tab switching

---

## 📦 Deliverables

1. All new files created in appropriate directories
2. All existing files updated without breaking changes
3. No merge conflicts with main branch
4. All TypeScript errors resolved
5. Build passes successfully
6. README updated with new features (optional)

---

## 💡 Implementation Tips

- Start with therapist notes (easiest, isolated)
- Then chaos mode (pure logic, no AI)
- Then achievement enhancements (UI work)
- Finally visual memory (most complex, AI + images)

**Estimated Time:** 3-4 hours for complete implementation

**Priority Order:** Therapist Notes → Chaos Mode → Achievement Enhancement → Visual Memory
