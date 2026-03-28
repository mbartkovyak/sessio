# Cancellation & Reminders

Athletes are **assumed attending by default**. No confirmation needed. The only action is to cancel if you can't make it.

---

## How it works

1. Coach creates a training → sessions are generated → all members are auto-enrolled as **confirmed**
2. Before each session, Sessio sends a reminder: "Cancel if you can't make it"
3. If the athlete can't come, they cancel → spot opens for backfill
4. If the athlete does nothing → they're coming (default)

---

## Cancellation settings (coach configures per training)

| Setting | Default | Options |
|---|---|---|
| Cancellation deadline | 24h before | 12h / 24h / 48h / 72h |
| Notification channel | Push + email | Push only / Push + email |

Set during training creation. Editable from training settings.

---

## The flow

```
[Reminder window opens]
        ↓
Athlete gets push notification
  "Tuesday Tennis tomorrow at 16:00 — cancel if you can't make it."
        ↓
    ┌──────────────────┐
    │ Does nothing     │ → Athlete is coming. Done.
    └──────────────────┘
    ┌──────────────────┐
    │ Cancels          │ → Spot opens. Backfill triggers.
    └──────────────────┘
    ┌──────────────────┐
    │ Re-joins later   │ → Back in the session.
    └──────────────────┘
```

---

## Cancel → Backfill

When someone cancels, an open spot is created. Waitlist or flex members can claim it first-come-first-served via `claim_training_spot()` RPC.

---

## Late cancellation

- Cancel allowed until X hours before training (coach configures, default: 24h)
- Late cancellation → counted in reliability/strike system
- Cancelled spot → triggers backfill

---

## Coach override

Coach can always:
- Manually add/remove an athlete
- Cancel a session entirely (all athletes notified)
- Mark no-show post-session

---

## Notifications summary

| Event | Athlete gets | Coach gets |
|---|---|---|
| Reminder (before session) | Push | — |
| Athlete cancels | — | Push ("Player cancelled") |
| Athlete re-joins after cancel | — | Push ("Player is back") |
| Spot available (backfill) | Push (waitlist) | — |
| Spot claimed | — | Push (spot filled) |
| Training cancelled by coach | Push + chat message | — |
