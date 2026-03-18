# School

A school is a **business entity** that groups coaches under one brand. The school owner manages everything; coaches focus on coaching.

---

## Three coach types

- **School owner** (`profiles.role = 'school_owner'`) — created the school. Gets school management dashboard. Can also coach by adding self to school's coach list.
- **School coach** (`profiles.role = 'coach'`, row in `school_members`) — joined a school via invite. Manages own trainings. Can belong to multiple schools. Trainings tagged with school name.
- **Solo coach** (`profiles.role = 'coach'`, no school) — no school. Personal dashboard only. Same management capabilities — just no school entity. Can create a school anytime.

---

## School owner ≠ coach by default

A school owner signs up to **run a business**. They might never coach a session. The school dashboard is their primary view: all coaches, all trainings, all confirmations.

If they also coach, they tap **"I also coach"** in the Coaches tab → adds themselves to `school_members` → they can be assigned trainings like any other coach.

---

## School coach experience

No new UI. Their Lessons and Calendar show a school badge:

> **Tuesday Advanced** · Warszawianka TC · 4/4 · 16:00

If they coach at two schools, each lesson carries the right tag. That's it.

---

## How a coach joins a school

1. School owner shares invite link
2. Coach taps link → signs up or logs in → prompted to join the school
3. Their profile appears on the school's Coaches page
4. Trainings created under that school get the school tag

A coach can also join during signup → "Join a school" path.

---

## School owner view

**School view nav: Dashboard, Calendar, Coaches, School Profile.**

Accessed via context switcher (top-left) if owner also coaches, or as the default view if they don't.

→ [[Dashboard]] · [[Calendar]] · [[Coaches]] · [[SchoolProfile]]

---

## Ownership & permissions

Owner has **full control** over all school trainings and coaches:
- Create, edit, cancel any training
- Assign trainings to any coach
- Send reminders, manage rosters
- Set school-wide automation defaults (reminder timing, no-response behavior)
- Override per-training settings
- View confirmation status across all trainings (the main dashboard)

Coaches manage day-to-day for their own trainings, but owner can override anything. The school tag on a training means the school owns it.

---

## Solo coach → school upgrade

A solo coach who decides to start a school:
1. Settings → "Create a school"
2. Enter school name, optional logo
3. `profiles.role` updated to `school_owner`
4. `schools` row created
5. Existing trainings can be associated with the school (optional)
6. Start inviting coaches

All existing trainings and athletes stay intact. Zero migration for the coach's current clients.

---

## DB model

```
schools
  id, name, sport, city, description, logo_url
  owner_id → profiles.id

school_members (many-to-many: coaches ↔ schools)
  school_id → schools.id
  coach_id → profiles.id
  role: 'coach' | 'head_coach' (future)
  joined_at

trainings
  coach_id → profiles.id (who teaches it)
  school_id → schools.id (which school it belongs to, nullable)
```

A training always has a `coach_id`. It optionally has a `school_id`. School owner can create trainings and assign `coach_id` to any coach in the school.
