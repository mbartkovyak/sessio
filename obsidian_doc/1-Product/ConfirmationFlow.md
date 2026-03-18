# Confirmation & Backfill Flow

The core loop. This is what replaces WhatsApp.

---

## Confirmation settings (coach configures per training)

| Setting | Default | Options |
|---|---|---|
| Confirmation required | Yes | Yes / No (auto-confirm everyone) |
| Confirmation window | 48h before | 12h / 24h / 48h / 72h / custom |
| No-response behavior | Coach decides | Mark absent / Keep pending / Auto-decline |
| Cancel option | Enabled | Enabled / Disabled |
| Notification channel | Push + email | Push only / Push + email |

All set during training creation. Editable anytime from training settings. Quick menu — not buried in advanced settings.

---

## The loop

```
[Confirmation window opens]
        ↓
Athlete gets push notification + email (if enabled)
  "Tuesday Tennis tomorrow at 16:00 — are you coming?"
        ↓
    ┌─────────┐
    │ Confirm │ → Athlete locked in. Done.
    └─────────┘
    ┌─────────┐
    │ Decline │ → Spot opens. Backfill triggers.
    └─────────┘
    ┌─────────────┐
    │ No response │ → Coach's default kicks in.
    └─────────────┘
```

---

## Decline → Backfill

**TBD — asking the coach tomorrow.** Questions to answer:

1. Who gets offered the spot? Options:
   - Everyone in the group who isn't already in this training
   - A waitlist (athletes who explicitly signed up for "notify me")
   - All athletes of this coach across all trainings
   - Open to all athletes on the platform (marketplace mode)
2. Is it first-come-first-served or does the coach approve?
3. Is there a deadline to claim? (e.g. 2h before training)
4. What if nobody claims? Coach gets notified → decides (run with fewer or cancel)

Coach needs to be informed about backfill mechanics before we finalize.

---

## Cancel after confirming

Athlete confirmed but needs to cancel later:

- Cancel allowed until X hours before training (coach configures, default: 2h before?)
- Late cancellation → counted in reliability/strike system
- Cancelled spot → triggers same backfill as decline

---

## Coach override

Coach can always:
- Manually add a athlete to a training
- Remove a athlete from a training
- Close a training (cancel entirely, all athletes notified)
- Override the no-response behavior for specific athletes

---

## Notifications summary

| Event | Athlete gets | Coach gets |
|---|---|---|
| Confirmation window opens | Push + email | — |
| Athlete confirms | — | — (silent, visible in dashboard) |
| Athlete declines | — | Push (spot opened) |
| Spot available (backfill) | Push (TBD: who) | — |
| Spot claimed | — | Push (spot filled) |
| No response at deadline | Depends on setting | Push (if still pending) |
| Training cancelled by coach | Push + email | — |
| Coach message in chat | Push | — |
