# ActiveNow — Sales Call Analysis

**Date:** 2026-03-19

---

## Key takeaway

ActiveNow has real features (payments, no-shows, waitlist, SMS) but **setup and UX are the weakness**. Every part could be so much easier. Sessio's edge is not feature parity — it's friction elimination.

---

## Sales process observations

- **1-hour setup call required.** Sales rep walks you through settings. This is structural — the product can't be self-serve because it's too complex to configure alone.
- Email sending requires separate setup somewhere in settings — not automatic.
- To accept bookings/signups: you embed their code into your website or link their page from Instagram. No native flow, no app-first experience.

## What works (features that exist)

- Custom fields on registration forms (![[Pasted image 20260319105049.png]])
  - Could be useful but not UX-friendly
- Seasons and breaks — bulk pause/resume all trainings for a week (vacation mode)
- Stripe connection for payments (works for Poland + international)
- Instructor substitution button
- Waiting list
- No-show handling tools
- SMS notifications (0.10 PLN/msg, extra cost)
- Client-facing app exists (![[Pasted image 20260319120742.png]])
- Embed signup form for websites

## What's bad

- **Client app UX is poor.** App exists but experience is bad when actually using it.
- Adding a venue for training is painful
- Clicking "send SMS" when person has no contact info → nothing happens (silent failure)
- Embedded signup form is bad UX — better to handle everything natively, but some schools may need it
- Useless feature bloat (![[Pasted image 20260319120457.png]])

## Admin panel

While logged in:
![[Pasted image 20260319103759.png]]

---

## Sessio implications

| ActiveNow reality | Sessio opportunity |
| --- | --- |
| 1-hour setup call needed | Zero-call onboarding. Coach is live in 5 minutes. |
| Embed code / link page for bookings | Native booking flow inside the app. No website needed. |
| Client app exists but bad UX | Mobile-first, modern athlete experience. |
| Features are scattered, each needs config | Opinionated defaults that just work. |
| Email/SMS require separate setup | Push notifications by default, no config. |
| Silent failures (SMS with no contact) | Proper error handling and feedback. |
| Enterprise DNA — hand-holding → upselling | Self-serve product that scales without sales team. |
