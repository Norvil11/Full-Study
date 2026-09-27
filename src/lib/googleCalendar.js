// Integración con Google Calendar desde el navegador:
// Google Identity Services (token client OAuth 2.0) + Google Calendar API v3.
// El access token vive solo en memoria y sessionStorage; nunca se envía a Supabase.
import { useState, useEffect, useCallback, useRef } from 'react';

const CLIENT_ID   = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPE       = 'https://www.googleapis.com/auth/calendar.events';
const GIS_SRC     = 'https://accounts.google.com/gsi/client';
const API_BASE    = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const STORAGE_KEY = 'gcal_token';

export class GoogleAuthError extends Error {
  constructor(message = 'La sesión de Google expiró. Vuelve a conectar Google Calendar.') {
    super(message);
    this.isAuthError = true;
  }
}

// ─── Script GIS ──────────────────────────────────────────────────────────────
let gisPromise = null;
function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = GIS_SRC; s.async = true; s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => { gisPromise = null; reject(new Error('No se pudo cargar Google Identity Services.')); };
      document.head.appendChild(s);
    });
  }
  return gisPromise;
}

// ─── Token en sessionStorage ─────────────────────────────────────────────────
function readStoredToken() {
  try {
    const t = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    return t && t.access_token ? t : null;
  } catch { return null; }
}
function storeToken(t) {
  try { t ? sessionStorage.setItem(STORAGE_KEY, JSON.stringify(t)) : sessionStorage.removeItem(STORAGE_KEY); } catch { /* sin storage: solo memoria */ }
}
const isExpired = (t) => !t || Date.now() >= t.expires_at;

// ─── Llamadas a la API ───────────────────────────────────────────────────────
async function apiFetch(token, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: 'Bearer ' + token.access_token, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (res.status === 401) throw new GoogleAuthError();
  if (!res.ok) {
    let msg = 'Error ' + res.status;
    try { msg = (await res.json()).error?.message || msg; } catch { /* cuerpo vacío */ }
    const err = new Error(msg); err.status = res.status; throw err;
  }
  return res.status === 204 ? null : res.json();
}

// start/end en formato de la API para un evento con hora
export function timedRange(start, end) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return { start: { dateTime: start.toISOString(), timeZone }, end: { dateTime: end.toISOString(), timeZone } };
}

// Evento que representa el bloque programado de una tarea
export function taskEventBody(task) {
  return {
    summary: '📌 ' + task.title,
    description: task.description || '',
    ...timedRange(new Date(task.scheduled_start), new Date(task.scheduled_end)),
    extendedProperties: { private: { myworkspaceTaskId: task.id } },
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────
// status: 'disconnected' | 'connected' | 'expired'
export function useGoogleCalendar() {
  const configured = Boolean(CLIENT_ID);
  const [token, setToken] = useState(() => (configured ? readStoredToken() : null));
  const [status, setStatus] = useState(() => {
    const t = configured ? readStoredToken() : null;
    return !t ? 'disconnected' : isExpired(t) ? 'expired' : 'connected';
  });
  const tokenClientRef = useRef(null);
  const pendingRef = useRef(null);

  // Precargar GIS para que el popup se abra dentro del gesto del usuario
  useEffect(() => { if (configured) loadGis().catch(() => {}); }, [configured]);

  // Marcar como expirado cuando pase la hora de vida del token
  useEffect(() => {
    if (status !== 'connected' || !token) return;
    const ms = token.expires_at - Date.now();
    if (ms <= 0) { setStatus('expired'); return; }
    const id = setTimeout(() => setStatus('expired'), ms);
    return () => clearTimeout(id);
  }, [status, token]);

  const connect = useCallback(async () => {
    if (!configured) return;
    await loadGis();
    if (!tokenClientRef.current) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (resp) => {
          const pending = pendingRef.current; pendingRef.current = null;
          if (resp.error) { pending?.reject(new Error(resp.error_description || resp.error)); return; }
          // Margen de 60 s para no usar un token a punto de vencer
          const t = { access_token: resp.access_token, expires_at: Date.now() + (Number(resp.expires_in) - 60) * 1000 };
          storeToken(t); setToken(t); setStatus('connected');
          pending?.resolve(t);
        },
        error_callback: (err) => {
          const pending = pendingRef.current; pendingRef.current = null;
          pending?.reject(new Error(err?.message || 'Conexión con Google cancelada.'));
        },
      });
    }
    return new Promise((resolve, reject) => {
      pendingRef.current = { resolve, reject };
      tokenClientRef.current.requestAccessToken({ prompt: '' });
    }).catch(err => { console.warn('Google Calendar:', err.message); return null; });
  }, [configured]);

  const disconnect = useCallback(() => {
    const t = token;
    storeToken(null); setToken(null); setStatus('disconnected');
    if (t && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(t.access_token, () => {});
  }, [token]);

  // Envuelve cada llamada: si el token venció o Google responde 401, pasa a 'expired'
  const call = useCallback(async (fn) => {
    if (!token || isExpired(token)) { setStatus(token ? 'expired' : 'disconnected'); throw new GoogleAuthError(); }
    try {
      return await fn(token);
    } catch (err) {
      if (err.isAuthError) { storeToken(null); setStatus('expired'); }
      throw err;
    }
  }, [token]);

  const listEvents = useCallback((timeMin, timeMax) => call(async (t) => {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(),
      singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
    });
    const data = await apiFetch(t, API_BASE + '?' + params);
    return (data.items || []).filter(ev => ev.status !== 'cancelled');
  }), [call]);

  // body en formato de la API v3 (summary, start, end, description, location…). Devuelve el evento.
  const insertEvent = useCallback((body) => call(t =>
    apiFetch(t, API_BASE, { method: 'POST', body: JSON.stringify(body) })
  ), [call]);

  const patchEvent = useCallback((eventId, body) => call(t =>
    apiFetch(t, API_BASE + '/' + encodeURIComponent(eventId), { method: 'PATCH', body: JSON.stringify(body) })
  ), [call]);

  const deleteEvent = useCallback((eventId) => call(async (t) => {
    try {
      await apiFetch(t, API_BASE + '/' + encodeURIComponent(eventId), { method: 'DELETE' });
    } catch (err) {
      if (err.status === 404 || err.status === 410) return; // ya no existe
      throw err;
    }
  }), [call]);

  return { configured, status, connect, disconnect, listEvents, insertEvent, patchEvent, deleteEvent };
}
