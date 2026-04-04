---

kanban-plugin: board

---

## Backlog

- [ ] Assign pass search for people think through, different search button, through names of all app users in the given country?
- [ ] AI chat to voice over and then implement or implement from text, premium feature
- [ ] Write down the roadmap - mobile app, more complex dash for computer, when DEMO, who to DEMO etc
- [ ] Phone number at registration — ideally auth by phone not email. SMS OTP needs paid service (Twilio) #dev #decision
- [ ] Chat photo sending — attachment_url column on messages, chat-attachments bucket, file picker in ChatView, image rendering in bubbles #dev
- [ ] Work with Yoodli.ai #gtm
- [ ] Reach out for funding https://www.linkedin.com/in/bartosz-jakubowski-20978b26/?originalSubdomain=fr


## Doing

- [ ] **Makeup balance tracking** — cancelled = +1 makeup owed. Makeup attended = -1. No-show = no makeup (wasted spot). Auto-calculated from attendance data. Rolling 60-day expiry per makeup (coach configurable). Manual override with logged adjustments (who, when, old→new). Parents see their balance + expiry dates, coach sees overview per athlete #dev #core
- [ ] Switch off abonaments fully funtinality
- [ ] Waitlist flow.
- [ ] Rework the landing page
- [ ] Avatar photo upload — Supabase Storage bucket + upload button on both player and coach profiles #dev
- [ ] **Attendance history view** — monthly view per training showing attended/missed/cancelled/no-show per athlete. Log with timestamps for disputes #dev
- [ ] Add the reuse nieobecnosci
- [ ] Additional lesson inside the group
- [ ] Add the people to invite to directly in the lesson creation if they are your contancts? Ask Claude how that should be handled
- [ ] **Google Calendar sync** — export/sync sessions via .ics or Google Calendar API. Low prio, high value #dev #later


## Review

- [ ] Add the possibility of assigning the misses
- [ ] I am puchasing the abonament at place - then coach should confirm that this person will buy at place
- [ ] test if I can join training from the date when the pass becomes active


## Done

**Complete**
- [x] make sure you have customers page
- [x] Abonament days actually work how? I still see 30 days
- [x] Assigning pass to the Dinosaurs
- [x] Players should be able to join for one-off or sign for a series.
- [x] Add to the solocoach/school owner/coach dashboard the button passes where you pout the passes that exist, add passes, active passes. Baseically like there is on school page, but additional page that you can deep dive instead of everything on the home page
- [x] Null city impossible, you can not deselt city
- [x] Add abonament info to each person's profile
- [x] Make the get directions to etc bigger font, people do not see
- [x] Change fonts and make sure the trainings are readible
- [x] Change wording EN/PL/UA each screen
- [x] Make sure people can not get more that x people in the training alrady, there is a max
- [x] Add cities for Ukraine, you should choose the location(Country only for now)
- [x] Merge after testing the dev
- [x] Android testing
- [x] Relogin - all messages get unread
- [x] **Push notification landing** — tapping a push should open the relevant screen (e.g. training detail, confirmation card), not just the app home #dev #push
- [x] **Scheduled push + cancel flow** — send push X hours before lesson ("Cancel if you're not coming"). If athlete cancels via push → free their spot, notify waitlist. If no cancel → assumed attending, no-show = charged #dev #push #automation
- [x] Polish language and UA at the beginning
- [x] Fix Athlete counter, I need geenral unique atheleted, not sign ups
- [x] **Phone number with country code** — make phone required, add country code picker. Format validation + check if number already used by another account #dev
- [x] Made the lesson for Wed and it start on Monday (BUG)
- [x] **Calendar: show all sessions until end date** — currently cuts off at 28 days, should show through training's end date #dev
- [x] **Toast notifications position** — toasts appear at the bottom and block UI. Move to top or make non-blocking #dev #ux
- [x] **Invite link flow: auto-join after signup** — athlete opens invite link → signs up → should auto-join the training. Currently requires re-opening the link. Persist invite through auth #dev #ux
- [x] **Simplify coach/school model** — removed personal vs school distinction. Coach in school = read-only. School owner always creates school lessons. Deleted OwnershipFilter, SchoolViewToggle, SchoolViewContext #dev
- [x] **Design refresh** — use Figma to design screens, share for implementation. Or pick a reference app and I'll match the style #design
- [x] **School home scroll** — after registration, school owner's home starts too low. School name should be visible at top #dev #ux
- [x] Cold calling Marta
- [x] **Rework call script** — update Playbook PL based on core value prop discussion. Sharper questions, clearer pain points to validate #gtm
- [x] Fix messages UX — fixed header + input bar, stays visible when keyboard opens #dev
- [x] Add city filter to Find Coach search — ~20 Polish cities as scrollable pills #dev
- [x] Confirmation prompts only show for sessions within 3 days #dev
- [x] Remove "My Training" section from player Profile page — clutters the view #dev
- [x] Replace Lovable favicon with Sessio icon #dev
- [x] Remove "switch to coach view" toggle — unnecessary for MVP, coaches are coaches #dev




%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[false,false,false,false]}
```
%%