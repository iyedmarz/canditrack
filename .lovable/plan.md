# Keep a candidature in place after editing

## Problem

The list is ordered only by application date (descending). When several candidatures share the same date, the database returns them in no guaranteed order, so editing one moves it to the end of that date group.

## Fix

Make the order fully deterministic by adding a tie-breaker after the date:

1. Order by application date (descending), then by creation timestamp (descending), then by id — so rows with the same date always keep the same position, before and after an edit.
2. Keep the edited date at a stable time-of-day so an edit that doesn't change the date can't shift the row within its group.

## Technical details

- `listApplications` in `src/lib/applications.functions.ts`: chain `.order("date_applied", { ascending: false })` with `.order("created_at", { ascending: false })` and `.order("id", { ascending: true })`.
- `updateApplicationDetails` in the same file: normalize `date_applied` consistently (same conversion used at import/creation) so re-saving an unchanged date is a no-op for ordering.
- No UI or schema changes; the dashboard keeps rendering the server order.
