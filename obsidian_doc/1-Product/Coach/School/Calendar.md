# School — Calendar

All lessons across all coaches in one view. Useful for the owner to spot scheduling conflicts, see peak days, and understand how full the school's week is.

## Sections

- **Weekly view** — every lesson from every coach. Each lesson shows: coach name, lesson name, time, venue, fill status.
- **Filter by coach** — toggle individual coaches on/off to isolate their schedule.
- **Lesson detail** (tap into a lesson):
  - Coach name, lesson name, venue, time
  - Fill status (confirmed/pending/declined)
  - Location with map link
  - Read-only — owner cannot modify other coaches' lessons

## Design notes

- Same color coding as individual calendar: full (green), open spots (yellow), at risk (red).
- If two coaches have lessons at the same time and same venue — surface that as a conflict alert.
- Owner's own lessons also appear here with the same treatment as other coaches'.
