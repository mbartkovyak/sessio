# AI

## The headline

AI is not a feature in Sessio. It's the wedge that makes the whole business possible.

In one sentence: **AI lets Sessio do six things competitors can't — match the right coach to the right athlete, fill empty slots before they go empty, prevent churn before clients ghost, price dynamically to maximize fill, close the feedback loop between coach and parent, and onboard coaches in minutes instead of hours.** Each is a measurable revenue lever, not a chatbot gimmick.

This document is the strategy and selling point — what AI unlocks, why now, and why it defends. Implementation order, schemas, and engineering tradeoffs live elsewhere.

---

## Why now

Maxime's pitch feedback (`obsidian_doc/2-GTM/Maxime Pioneers - last session feedback.md`) flagged the missing **why now** as the biggest hole in our story. The honest answer:

> **AI changes the adoption economics of coach-side software.**

Coaches historically didn't adopt admin tools because the time-to-value was negative. Too much typing. Too much config. The tools were built for office workers, used by people who live on a tennis court. Booksy, ActiveNow, Calendly — all assume a coach with a laptop and free hours to fill out forms. Most coaches don't have either.

AI flips that. Voice in. Smart defaults. No setup. The first coach platform that's actually usable wins the operating-system layer.

Three concrete shifts make 2026 different:
- On-device and edge LLMs are good enough for chat triage, voice transcription, and per-message drafting at sub-cent cost.
- Embeddings and inference are cheap enough to run per-search, per-message, per-session.
- Coaches under 40 now expect ChatGPT-quality replies in any tool they use. The floor moved.

What this is **not**: not a chatbot for athletes. Not "ask AI" buttons everywhere. Not generated marketing slop. AI runs in the seams — invisible by default, magical when noticed. Every surface below has a real coach pain behind it.

---

## Six value surfaces

| # | Surface | What it does | Who it helps most |
|---|---|---|---|
| 1 | Smart matching | Ranks coaches per athlete by fit, not by review count | Athletes + niche coaches |
| 2 | Smart calendar | Predicts who fills which slot, suggests times, mediates reschedules | Coaches |
| 3 | Communication & churn | Drafts replies, flags at-risk athletes, triages chat | Coaches + schools |
| 4 | Dynamic pricing | Discounts off-peak slots automatically | Sessio's marketplace revenue |
| 5 | Feedback loop | 2-min voice memo → per-athlete/parent updates + coach journal | Parents + retention |
| 6 | Coach setup | Voice-driven onboarding, training creation, profile fill | Coach adoption |

---

### 1. Smart matching — "the right coach for you"

**Pain today.** Discovery is a flat list filtered by sport and city (`useDiscoverableCoaches()` in `src/hooks/school/useSchools.ts`). Athletes scroll, bounce, book the coach with the most reviews regardless of fit. Coaches with niche strengths — kids, rehab, advanced players, beginners — get buried.

**The AI move.** Rank coaches per athlete using their goals, level, schedule, and the embedded text of every review. Show a one-line **"why this coach for you"** sourced from real review snippets: *"Works well with first-time adult learners — 12 reviews mention patience."*

**Value.**
- **Athletes** find a fit faster → higher booking conversion.
- **Coaches with niche strengths** get matched on quality, not on review volume → flatter playing field for newer coaches.
- **Sessio** monetizes discovery commission. Better matches = more bookings = more revenue.

**Proof point.** A 38-year-old beginner who plays Sundays gets a different ranked list than a competitive teen looking for sparring. Today they get the same list.

---

### 2. Smart calendar — "fill the gaps automatically"

**Pain today.** When a spot opens, it's a notification race via `claim_training_spot()`. Half the time it stays empty. Coaches manually pick training times based on guesswork. Reschedules trigger group chats with seven athletes negotiating across three time zones.

**The AI move (three sub-features):**
1. **Backfill ranking** — when a slot opens, notify the athletes most likely to take it first, not everyone at once. Less notification fatigue, higher fill rate.
2. **Slot suggestion** — when a coach creates a training, suggest a day/time based on demand patterns. *"Tuesday 18:00 fills 4× faster than Thursday 18:00 in Mokotów."*
3. **Reschedule mediation** — when a coach reschedules, AI proposes the time that minimizes athlete conflicts.

**Value.**
- **Coaches** lose less revenue to empty slots, spend less time picking times.
- **Athletes** get fewer dead "spot available" pings. The ones they get are actually for them.
- **Sessio** higher RevPAS (revenue per available slot) — makes the SaaS subscription worth paying.

**Proof point.** *"Coach Marek had 12% empty slots last month. After smart backfill, 4%."*

---

### 3. AI communication & churn prevention — "nobody falls through the cracks"

**Pain today.** Coaches drown in WhatsApp-style chat (Maxime's #2 why-now candidate — chat chaos ripened into acute pain). Athletes go quiet for weeks; nobody notices until the unused pass expires and they don't renew. Schools running multiple coaches lose visibility into client health entirely.

**The AI move (three sub-features):**
1. **One-tap reply suggestions** for coaches in chat, drafted from training context. **Coach approves before send — never auto-sends in their voice.**
2. **Churn detection** — flag athletes whose attendance dropped >40% in 30 days, who haven't messaged in 14 days, or who skipped 3+ sessions. Coach sees a "may churn" badge and a suggested re-engagement message.
3. **Chat triage** for school accounts — tag incoming DMs by intent (booking question, complaint, refund, spam). Owner sees a digest, not a firehose.

**Value.**
- **Coaches** retain clients they would otherwise lose silently. Reply to chat in seconds, not hours.
- **Athletes** get faster responses. Feel cared for.
- **Sessio** retention is the single biggest driver of LTV. This directly defends subscription revenue.

**Proof point.** *"Anna stopped coming 3 weeks ago. Sessio flagged her, drafted a 'we miss you, here's a free trial' message. Coach sent it. She rebooked."*

---

### 4. Dynamic pricing — "happy hour by demand"

**Pain today.** Maxime's strongest wedge — Sessio fills underutilized inventory. Today an empty Wednesday 14:00 slot is just empty. Coaches have no discount mechanic. Athletes have no reason to book off-peak.

**The AI move.** Predict demand for each open slot (sport, day, hour, historical fill rate, weather, holidays). When predicted demand is low, automatically discount the slot 20–40% and surface it in an athlete "happy hour" feed. Coaches opt out per training.

**Value.**
- **Coaches** turn dead time into revenue. A discounted booking is infinitely more than zero.
- **Athletes** find cheap, last-minute lessons → sticky discovery feed → daily app opens.
- **Sessio** discovery bookings are exactly where the **commission revenue** lives (`obsidian_doc/4-Monetization/Monetization.md`). Happy hour is the funnel for the Booksy-style commission line.

**Strategic note.** This is the surface that turns Sessio from a SaaS tool into a marketplace. Without dynamic pricing, the marketplace side is just a directory. With it, athletes have a reason to open the app daily.

**Proof point.** *"Tennis at 14:00 Wednesday in Warsaw, normally 200 PLN, now 140 PLN. Book in 2 taps."*

---

### 5. Feedback loop — "every parent knows how their kid is doing"

**Pain today.** After a session, the coach has 3 minutes before the next group walks onto the court. They don't message parents. They don't write progress notes. They don't even remember next week which kid was working on what. Parents pay 600 PLN a month and hear nothing between sessions. Quietly, they stop renewing.

This is the most expensive silent failure in coaching, and it's universal. Every coach knows feedback matters. Almost none of them do it consistently. Reason: cost.

**The AI move.** Coach speaks a 2-minute voice memo at the end of a group session — natural, the way they'd brief an assistant. AI splits it into three outputs from one input:

1. **Per-parent message** — "Anna worked on backhand today. Strong improvement on footwork. Ask her about the rally drill."
2. **Per-adult-athlete summary** — "Today: serve toss, court positioning. Homework: 50 toss drills."
3. **Coach's private journal** — longitudinal, per-athlete. Feeds future planning, AI-generated lesson plans, and the per-athlete development arc.

Adjacent loops on the same primitive:
- **Pre-training brief** — 30 seconds in the coach's car: *"Today: 4 athletes. Anna missed last 2 sessions. Marek's last review mentioned punctuality."*
- **Weekly parent digest** — Sunday rollup: *"Anna had 3 sessions this week, worked on X, Y, Z. Notable progress on footwork."*
- **Milestone detection** — AI catches *"Anna landed her first kick serve today"* in voice notes → drafts a celebration message + suggests sharing.
- **Photo / video annotation** — coach films a swing, AI overlays form notes, attaches to the parent message. Tennis, golf, posture-heavy sports especially.
- **Longitudinal coaching plan** — six weeks of voice notes about Anna → AI surfaces *"she's plateaued on backhand, suggest moving to drop shots."*

**Value.**
- **Coaches** look professional. Parents see structured updates. Coach retention of clients goes up. Coach loyalty to Sessio goes up — this is the feature that makes them stay.
- **Parents** know what their kid is working on. They stop wondering if the money is worth it. Renewal rates climb.
- **Athletes** see their own progress. The work feels meaningful.
- **Sessio** the moat. Every voice memo trains a richer dataset competitors can't access. Booksy adding "AI" tomorrow doesn't catch up — they don't have the longitudinal coaching context, the per-athlete development arcs, or the voice-trained coach personality models we will.

**Proof point.** *"Coach Anna sent 0 progress messages last month. After Sessio, she sent 47 — total time spent: 38 minutes of voice memos. Two parents who were going to cancel renewed."*

---

### 6. Coach setup — "from zero to onboarded in 4 minutes"

**Pain today.** A new coach signing up for Sessio fills out 18 form fields, writes a bio (which they hate doing), uploads a photo, picks a sport, sets up their first training, configures cancellation rules, picks venues, sets prices. Most stall at the bio. Some never finish.

**The AI move.**
- **Voice-driven training creation** — *"Every Tuesday 6pm, group tennis, 4 spots, Mokotów courts, 200 PLN, 24-hour cancellation."* AI fills the form. Coach taps confirm.
- **Auto-bio drafting** — coach answers 3 spoken questions, AI drafts a bio in their voice. Coach edits one line, done.
- **Auto-profile from existing presence** — paste an Instagram handle or website, AI extracts photo, sport, style, history. Sub-2-minute signup.

**Value.**
- **Coaches** get from "I'll try it later" to "I'm onboarded" in one sitting. Drop-off in onboarding collapses.
- **Sessio** activation rate is the top of the funnel. Doubling activation doubles the business.

**Why this matters strategically.** This surface *is* the why-now demo. Without it, "AI changes coach adoption economics" is a claim. With it, it's a feature you watch happen on a stage.

---

## Why the feedback loop works — the research

The feedback loop (Surface 5) is the surface most worth defending with evidence. Coaches and investors will both push back on it as soft. It isn't.

### Feedback is the highest-leverage intervention in skill development

**Hattie & Timperley** synthesized 800+ meta-analyses and found feedback's effect size on achievement at **d = 0.70–0.79**. The average effect size of *all* educational interventions Hattie measured is 0.40. Feedback is in the top tier of every learning intervention ever studied. ([Visible Learning](https://visible-learning.org/hattie-ranking-influences-effect-sizes-learning-achievement/))

**Wisniewski et al. (2020)** replicated and expanded Hattie's work across 435 studies and 61,000+ subjects, confirming feedback as a robustly positive intervention (d = 0.48), with **specific written feedback outperforming grades or generic praise**. AI-generated specific notes — *"Anna's footwork on the cross-court drill improved today"* — map directly onto the most effective feedback type the research has identified. ([The Power of Feedback Revisited — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6987456/))

### Sports-specific: feedback drives motivation, competence, and physical gains

**Corbett, Partington, Ryan, & Cope (2024)** systematic review on coach augmented verbal feedback in team sports: feedback enhances motivation, competitiveness, perceived effort, and acute kinetic outputs. **Chronic** (longitudinal, repeated) feedback produced the greatest improvements in speed, strength, jumping, and technical competency. ([SAGE Journals](https://journals.sagepub.com/doi/10.1177/17479541231218665))

**Frontiers in Psychology (2020)** on when and how to provide feedback: *specific, positive feedback enhances perceived competence* — the psychological mechanism behind both retention and intrinsic motivation. AI-drafted "what they did well today" messages hit this directly. ([Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.01444/full))

**Caveat we acknowledge.** Feedback at 100% of repetitions can be *worse* than 50% during initial skill acquisition (overcoaching restricts movement exploration). Sessio's feedback loop operates *between* sessions, not inside them — which sidesteps this trap entirely.

### Ericsson: feedback is non-negotiable for development

**Ericsson, Krampe, & Tesch-Römer (1993)** defined deliberate practice as requiring **"informative feedback to monitor improvement"** as one of its non-negotiable conditions. Ericsson's central recommendation for any serious athlete: **have a coach, because feedback is the bottleneck on growth.** ([Ericsson 1993 — gwern.net](https://gwern.net/doc/psychology/writing/1993-ericsson.pdf))

Expert performers actively elicit feedback and reflect on it to guide their next practice block. **Sessio's voice-memo-to-journal loop is exactly this mechanism, automated.**

### Communication is the #1 driver of retention in youth sports

**Frontiers in Sports & Active Living (2022)** retention study: *"Lack of Organization and Communication"* is a core theme cited by parents who don't intend to return their kids to a program. Programs with strong coach/parent/athlete communication retain. Programs without it don't. ([Frontiers](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2022.816539/full))

**Emerald Publishing (2025)** on parents' role in dropout: parental involvement that is active but non-pressuring is **"crucial for long-term athlete retention."** Parents who know what's happening in sessions stay involved. Parents who don't, drift away. ([Emerald](https://www.emerald.com/sbm/article-abstract/16/1/143/1320200/Parents-role-in-dropout-one-of-the-important))

**Tandfonline scoping review (2024)** on coach-parent interactions across youth sport: open, honest, constant communication is identified as critical to the coach-parent partnership. The systemic friction is *time* — exactly what AI-drafted updates remove. ([Tandfonline](https://www.tandfonline.com/doi/full/10.1080/1750984X.2024.2332986))

### The lever this gives Sessio — quantified

Coaching has known the value of feedback for 30 years. Coaching has known it drives retention. The reason coaches don't do it consistently is **cost**.

- Structured per-athlete feedback after every session takes **5–10 minutes per athlete** when typed.
- A coach with 30 active athletes and 4 sessions a week is looking at **10+ hours of admin** to do it right.
- AI collapses this to **2 minutes of voice memo per session, zero typing**.
- The cost of high-frequency feedback drops by **~95%**.

That cost collapse, on an intervention with one of the highest effect sizes in learning research, is what *"AI changes coach adoption economics"* actually means. Not vibes. A measurable cost reduction on a measurable retention lever.

---

## Why this matters strategically

The strategy in `CLAUDE.md` is **tool-first → marketplace**. AI strengthens both halves at once:

- **Tool side** (calendar, comms, churn, feedback loop, coach setup) — makes coaches stay. Defends the SaaS subscription line.
- **Marketplace side** (matching, dynamic pricing) — makes athletes return. Unlocks the commission revenue line.

AI is the connective tissue between the two revenue lines in `obsidian_doc/4-Monetization/Monetization.md`.

### Defensibility

The matched bookings, attendance histories, review embeddings, and per-athlete development arcs we accumulate become a moat that's harder to clone the longer we run. Booksy adding "AI" tomorrow doesn't catch up — they don't have the data at the coach-fit grain or the longitudinal coaching context we do. The feedback loop in particular is one of the few places where data accumulates faster than competitors can ever recover.

---

## Adjacent surfaces (later, not first-class)

These are real but secondary. They live in the doc to show depth without diluting the pitch.

**Coach business intelligence**
- Pricing intelligence ("you're 90% booked at 200 PLN, market supports 250")
- Cancellation anomaly detection ("3 cancellations Tuesday 18:00 vs your average 1")
- Income forecast (next-month revenue from confirmed sessions + attendance)
- Burnout warning (track hours, response time degradation, suggest a day off)

**Lesson quality**
- AI drill library — *"want a drill for Anna's backhand drop?"*
- Video form review (premium, golf/tennis especially)
- Curriculum adherence — for academies, flag when coach drifts from program
- Group composition optimizer — pair athletes by level/age/goals

**Discovery polish**
- Review summary on coach profile — *"athletes consistently mention: patience, flexibility. Some mention: late starts."*
- Voice search — *"tennis coach Mokotów Sundays under 200"*
- Auto-translation — coach writes PL, expat athlete reads UK/EN (i18n is already EN/PL/UK)

**Acquisition / growth**
- Auto-generated social content from voice memos (IG captions, TikTok scripts)
- Smart timing for review asks — after high-engagement session, prompt coach to ask
- Lead qualification — new "hi I want to start" DM → AI captures level, schedule, goals

**Cross-coach / school**
- Substitute coach matching when a coach is sick
- School quality drift — owner sees when a coach drifts from school standards
- Conversational stats — *"how's my school this month?"*
- Performance benchmarking — *"you fill 70% of slots, top 25% of tennis coaches in Warsaw"*

**Athlete-side**
- Personal progress journal sourced from coach notes
- Goal tracking — *"compete in June"* → AI breaks down sessions, milestones, syncs with coach plan
- Internal referrals when coach is full or off-season
- Smart waitlist conversion — predict claim likelihood, suggest alternatives proactively

---

## What this is not (scope discipline)

- Not a chatbot. Not "AI everywhere." Not generative slop in marketing.
- Not on the critical confirmation path — the core loop in `ConfirmationFlow.md` works without AI.
- Not auto-send in the coach's voice without consent. Reply suggestions are always one-tap-to-approve, never automatic.
- Not an excuse to ship without measurement. Every surface has a metric and must move it before scaling.
- Not a why-now if it's bolted on. AI is the reason the platform works, not a feature on top of it.

---

## Open questions

- **Cold start.** Matching needs reviews. Reviews need users. How does v1 read with ≤10 reviews per coach?
- **Coach trust.** AI replies in the coach's voice could feel like fraud. Coach approval before send, always. Document this clearly in T&Cs.
- **Pricing transparency.** Athletes seeing different prices for the same slot is a trust risk. Always label *"happy hour"*, never hide the discount logic.
- **Privacy.** Chat content sent to third-party LLMs needs T&Cs language and a coach opt-out for the privacy-sensitive.
- **Defensibility under attack.** Does the "coach adoption economics" wedge hold if Booksy ships AI tomorrow? Honest answer: yes for ~18 months because of the data moat (feedback loop, longitudinal coaching context), and after that it's about execution. Don't dodge the question in the pitch — own it.
