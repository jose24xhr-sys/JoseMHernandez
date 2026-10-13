# MonoBot custom booking setup

The private prototype is available at `/monobot-studio/agenda-custom` and uses the serverless endpoint `/api/monobot-booking`.

## Required Vercel environment variables

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (preferred) or `SUPABASE_SERVICE_ROLE_KEY` (legacy)
- `ZOOM_ACCOUNT_ID`
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`
- `ZOOM_HOST_EMAIL`

The Supabase project is `jose24xhr` (`bqaqfeyqpneurguisjmx`). Never expose a Supabase secret key in browser code or commit it to Git.

## Optional Google Calendar integration

Add these variables to check the host calendar for conflicts and send calendar invitations automatically:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_CALENDAR_ID` (defaults to `primary`)

Without the Google variables, Zoom bookings still work and the confirmation page displays the meeting link, but no email invitation is sent.

## Zoom app configuration

Create a Server-to-Server OAuth app owned by the Zoom account that hosts the meetings. Grant the minimum meeting-write and user-read scopes required to create meetings for `ZOOM_HOST_EMAIL`. Keep the credentials only in Vercel environment variables.

## Current booking rules

- Duration: 30 minutes
- Timezone: `America/Mexico_City`
- Days: Monday through Friday
- Times: every 30 minutes from 15:00 through 22:30; the final meeting ends at 23:00
- Minimum notice: 2 hours
- Availability window: next 14 business days
- Pending reservation expiry: 15 minutes
- Form rate limit: 3 attempts per email every 10 minutes

Change these constants in `api/monobot-booking.js` when the business rules are approved.
