export interface CalendarAccess {
  token: string;
  subject: string;
  email: string;
  expires: number;
}

interface TokenResponse {
  access_token?: string;
  expires_in: number;
  error?: string;
}
interface GoogleOAuth {
  initTokenClient(options: {
    client_id: string;
    scope: string;
    hint: string;
    callback: (response: TokenResponse) => void;
    error_callback: () => void;
  }): { requestAccessToken(): void };
}
declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth } };
  }
}

let loading: Promise<void> | undefined;
export function loadGoogle() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        loading = undefined;
        reject(new Error('Não foi possível carregar a conexão com o Google.'));
      };
      document.head.append(script);
    });
  }
  return loading;
}

export function authorizeCalendar(clientId: string, email: string): Promise<CalendarAccess> {
  return new Promise((resolve, reject) => {
    const oauth = window.google?.accounts?.oauth2;
    if (!oauth) throw new Error('A conexão com o Google ainda está carregando.');
    oauth
      .initTokenClient({
        client_id: clientId,
        hint: email,
        scope: 'openid email https://www.googleapis.com/auth/calendar.events',
        error_callback: () =>
          reject(new Error('A autorização foi interrompida. Abra a conexão novamente.')),
        callback: async (response) => {
          try {
            if (!response.access_token || response.error)
              throw new Error('O Google não autorizou o acesso ao calendário.');
            const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
              headers: { Authorization: 'Bearer ' + response.access_token },
            });
            if (!res.ok) throw new Error('Falha ao conferir a conta Google.');
            const identity = await res.json();
            if (
              !identity.email_verified ||
              !identity.sub ||
              identity.email?.toLowerCase() !== email.toLowerCase()
            )
              throw new Error('Escolha a conta Google com o mesmo e-mail usado nesta agenda.');
            resolve({
              token: response.access_token,
              subject: identity.sub,
              email,
              expires: Date.now() + Number(response.expires_in) * 1000,
            });
          } catch (err) {
            reject(err);
          }
        },
      })
      .requestAccessToken();
  });
}

export interface EventTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}
export interface GoogleEvent {
  id: string;
  etag: string;
  status?: string;
  eventType?: string;
  summary?: string;
  description?: string;
  start?: EventTime;
  end?: EventTime;
  updated?: string;
  locked?: boolean;
  organizer?: { self?: boolean };
  guestsCanModify?: boolean;
}

export class CalendarError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}
export async function googleRequest<T>(
  access: CalendarAccess,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events' + path,
    {
      ...init,
      headers: {
        Authorization: 'Bearer ' + access.token,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    }
  );
  if (!response.ok) {
    const message =
      response.status === 401
        ? 'Autorização expirada. Reconecte sua conta Google.'
        : response.status === 403
          ? 'Acesso negado. Confira a permissão de eventos e se a Google Calendar API está ativada no projeto OAuth.'
          : response.status === 412
            ? 'Este evento mudou durante a sincronização. Tente novamente.'
            : `O Google Agenda retornou o erro ${response.status}.`;
    throw new CalendarError(response.status, message);
  }
  return response.json();
}

export async function listEvents(access: CalendarAccess, min: Date, max: Date) {
  const events: GoogleEvent[] = [];
  const params = new URLSearchParams({
    timeMin: min.toISOString(),
    timeMax: max.toISOString(),
    singleEvents: 'true',
    eventTypes: 'default',
    maxResults: '2500',
  });
  let page: string | undefined;
  do {
    if (page) params.set('pageToken', page);
    const data = await googleRequest<{ items?: GoogleEvent[]; nextPageToken?: string }>(
      access,
      '?' + params
    );
    events.push(...(data.items || []));
    page = data.nextPageToken;
  } while (page);
  return events;
}
