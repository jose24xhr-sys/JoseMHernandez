import process from 'node:process';
import { Buffer } from 'node:buffer';

const TIME_ZONE = 'America/Mexico_City';
const SLOT_TIMES = [
  '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30'
];
const SLOT_DURATION_MINUTES = 30;
const MEXICO_CITY_OFFSET = '-06:00';

const json = (res, status, body) => res.status(status).json(body);

function allowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    return host === 'josemhernandez.com' || host === 'www.josemhernandez.com' || host === 'localhost' || host.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

function envConfig() {
  const env = (name) => process.env[name]?.trim();
  return {
    supabaseUrl: env('SUPABASE_URL'),
    supabaseKey: env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY'),
    zoomAccountId: env('ZOOM_ACCOUNT_ID'),
    zoomClientId: env('ZOOM_CLIENT_ID'),
    zoomClientSecret: env('ZOOM_CLIENT_SECRET'),
    zoomHost: env('ZOOM_HOST_EMAIL'),
    googleClientId: env('GOOGLE_CLIENT_ID'),
    googleClientSecret: env('GOOGLE_CLIENT_SECRET'),
    googleRefreshToken: env('GOOGLE_REFRESH_TOKEN'),
    googleCalendarId: env('GOOGLE_CALENDAR_ID') || 'primary'
  };
}

function supabaseHeaders(key, extra = {}) {
  const headers = { apikey: key, ...extra };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  return headers;
}

async function supabaseRequest(config, path, options = {}) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: supabaseHeaders(config.supabaseKey, options.headers)
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.message || `Database request failed (${response.status})`);
    error.status = response.status;
    error.code = data?.code;
    throw error;
  }
  return data;
}

function dateInMexicoCity(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function localDatePlusDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function endOfNextMonth(dateString) {
  const [year, month] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
}

function createSlot(date, time) {
  const start = new Date(`${date}T${time}:00${MEXICO_CITY_OFFSET}`);
  const end = new Date(start.getTime() + SLOT_DURATION_MINUTES * 60_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function zoomLocalDateTime(isoDateTime) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date(isoDateTime))
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

function isWeekday(date) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

function allCandidateSlots() {
  const today = dateInMexicoCity();
  const finalDate = endOfNextMonth(today);
  const minimumStart = Date.now() + 2 * 60 * 60_000;
  const days = [];
  let offset = 0;
  while (offset < 62) {
    const date = localDatePlusDays(today, offset++);
    if (date > finalDate) break;
    if (!isWeekday(date)) continue;
    const slots = SLOT_TIMES.map((time) => createSlot(date, time)).filter((slot) => new Date(slot.start).getTime() >= minimumStart);
    days.push({ date, slots });
  }
  return days;
}

async function googleAccessToken(config) {
  if (!config.googleClientId || !config.googleClientSecret || !config.googleRefreshToken) return null;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      refresh_token: config.googleRefreshToken,
      grant_type: 'refresh_token'
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Google authorization failed');
  return data.access_token;
}

async function googleBusyRanges(config, timeMin, timeMax) {
  const token = await googleAccessToken(config);
  if (!token) return [];
  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeMin, timeMax, timeZone: TIME_ZONE, items: [{ id: config.googleCalendarId }] })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Could not read Google Calendar');
  return data.calendars?.[config.googleCalendarId]?.busy || [];
}

function overlaps(slot, range) {
  return new Date(slot.start) < new Date(range.end) && new Date(slot.end) > new Date(range.start);
}

async function availability(config) {
  const staleBefore = new Date(Date.now() - 15 * 60_000).toISOString();
  await supabaseRequest(config, `monobot_bookings?status=eq.pending&created_at=lt.${encodeURIComponent(staleBefore)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'failed', error_message: 'Pending reservation expired before confirmation.', updated_at: new Date().toISOString() })
  });
  const days = allCandidateSlots();
  const flat = days.flatMap((day) => day.slots);
  if (!flat.length) return days;
  const timeMin = flat[0].start;
  const timeMax = flat.at(-1).end;
  const params = new URLSearchParams({
    select: 'start_time,end_time,status',
    start_time: `gte.${timeMin}`,
    end_time: `lte.${timeMax}`,
    status: 'in.(pending,confirmed)'
  });
  const [bookings, googleBusy] = await Promise.all([
    supabaseRequest(config, `monobot_bookings?${params}`),
    googleBusyRanges(config, timeMin, timeMax)
  ]);
  const busy = [
    ...bookings.map((booking) => ({ start: booking.start_time, end: booking.end_time })),
    ...googleBusy
  ];
  return days.map((day) => ({ ...day, slots: day.slots.filter((slot) => !busy.some((range) => overlaps(slot, range))) }));
}

async function enforceRateLimit(config, email) {
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const params = new URLSearchParams({
    select: 'id',
    email: `eq.${email}`,
    created_at: `gte.${since}`,
    limit: '4'
  });
  const recent = await supabaseRequest(config, `monobot_bookings?${params}`);
  if (recent.length >= 3) {
    throw Object.assign(new Error('Demasiados intentos recientes. Espera diez minutos e inténtalo nuevamente.'), { status: 429 });
  }
}

function validateBooking(body, availableDays) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const startTime = String(body.startTime || '');
  if (body.website) throw Object.assign(new Error('Solicitud no válida.'), { status: 400 });
  if (Date.now() - Number(body.submittedAt || 0) < 2_000) throw Object.assign(new Error('Espera un momento e inténtalo nuevamente.'), { status: 400 });
  if (name.length < 2 || name.length > 100) throw Object.assign(new Error('Ingresa un nombre válido.'), { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw Object.assign(new Error('Ingresa un email válido.'), { status: 400 });
  const slot = availableDays.flatMap((day) => day.slots).find((item) => item.start === startTime);
  if (!slot) throw Object.assign(new Error('Ese horario ya no está disponible. Selecciona otro.'), { status: 409 });
  return {
    name,
    email,
    startTime: slot.start,
    endTime: slot.end,
    company: String(body.company || '').trim().slice(0, 120),
    phone: String(body.phone || '').trim().slice(0, 40),
    notes: String(body.notes || '').trim().slice(0, 1000)
  };
}

async function zoomAccessToken(config) {
  const credentials = Buffer.from(`${config.zoomClientId}:${config.zoomClientSecret}`).toString('base64');
  const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(config.zoomAccountId)}`, {
    method: 'POST', headers: { Authorization: `Basic ${credentials}` }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.reason || data.error || 'Zoom authorization failed');
  return data.access_token;
}

async function createZoomMeeting(config, booking) {
  const token = await zoomAccessToken(config);
  const response = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(config.zoomHost)}/meetings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: `MonoBot Studio — ${booking.name}`,
      type: 2,
      start_time: zoomLocalDateTime(booking.startTime),
      duration: SLOT_DURATION_MINUTES,
      timezone: TIME_ZONE,
      agenda: booking.notes || 'Llamada de descubrimiento con MonoBot Studio.',
      settings: { waiting_room: true, join_before_host: false, mute_upon_entry: true, host_video: true, participant_video: true }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Could not create Zoom meeting');
  return data;
}

async function createGoogleEvent(config, booking, joinUrl) {
  const token = await googleAccessToken(config);
  if (!token) return null;
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.googleCalendarId)}/events?sendUpdates=all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: `MonoBot Studio — ${booking.name}`,
      description: `${booking.notes || 'Llamada de descubrimiento.'}\n\nZoom: ${joinUrl}`,
      location: joinUrl,
      start: { dateTime: booking.startTime, timeZone: TIME_ZONE },
      end: { dateTime: booking.endTime, timeZone: TIME_ZONE },
      attendees: [{ email: booking.email, displayName: booking.name }]
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Could not create Google Calendar event');
  return data;
}

async function reserveBooking(config, booking) {
  const result = await supabaseRequest(config, 'monobot_bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      start_time: booking.startTime,
      end_time: booking.endTime,
      timezone: TIME_ZONE,
      name: booking.name,
      email: booking.email,
      company: booking.company || null,
      phone: booking.phone || null,
      notes: booking.notes || null,
      status: 'pending',
      source: 'monobot-custom'
    })
  });
  return result[0];
}

async function updateBooking(config, id, values) {
  await supabaseRequest(config, `monobot_bookings?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...values, updated_at: new Date().toISOString() })
  });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!allowedOrigin(req)) return json(res, 403, { error: 'Origen no permitido.' });
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Método no permitido.' });
  }

  const config = envConfig();
  const databaseReady = Boolean(config.supabaseUrl && config.supabaseKey);
  if (req.method === 'GET' && !databaseReady) {
    return json(res, 200, {
      days: allCandidateSlots(),
      timezone: TIME_ZONE,
      duration: SLOT_DURATION_MINUTES,
      preview: true
    });
  }
  if (!databaseReady) return json(res, 503, { error: 'La agenda privada todavía requiere configuración del servidor.' });

  try {
    const days = await availability(config);
    if (req.method === 'GET') return json(res, 200, { days, timezone: TIME_ZONE, duration: SLOT_DURATION_MINUTES });
    if (!config.zoomAccountId || !config.zoomClientId || !config.zoomClientSecret || !config.zoomHost) {
      return json(res, 503, { error: 'La conexión segura con Zoom todavía no está configurada.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const booking = validateBooking(body, days);
    await enforceRateLimit(config, booking.email);
    let record;
    try {
      record = await reserveBooking(config, booking);
    } catch (error) {
      if (error.status === 409 || error.code === '23505') return json(res, 409, { error: 'Ese horario acaba de reservarse. Selecciona otro.' });
      throw error;
    }

    try {
      const zoom = await createZoomMeeting(config, booking);
      let googleEvent = null;
      try {
        googleEvent = await createGoogleEvent(config, booking, zoom.join_url);
      } catch (calendarError) {
        console.error('Google Calendar event failed', calendarError.message);
      }
      await updateBooking(config, record.id, {
        status: 'confirmed',
        zoom_meeting_id: String(zoom.id),
        zoom_join_url: zoom.join_url,
        zoom_start_url: zoom.start_url,
        google_event_id: googleEvent?.id || null
      });
      return json(res, 201, { joinUrl: zoom.join_url, calendarInviteSent: Boolean(googleEvent), startTime: booking.startTime });
    } catch (integrationError) {
      await updateBooking(config, record.id, { status: 'failed', error_message: integrationError.message.slice(0, 500) });
      throw integrationError;
    }
  } catch (error) {
    console.error('Monobot booking error', error);
    const status = error.status && error.status >= 400 && error.status < 500 ? error.status : 500;
    return json(res, status, { error: status === 500 ? 'No pudimos completar la solicitud. Inténtalo nuevamente.' : error.message });
  }
}
