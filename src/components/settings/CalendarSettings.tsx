import { useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import { useCalendar } from '../../contexts/CalendarContext';
import { useAuth } from '../../contexts/AuthContext';
import { loadGoogle } from '../../lib/calendar/google';
import { AutoPreference } from './AutoPreference';

const button =
  'rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50';
export function CalendarSettings() {
  const { user } = useAuth();
  const calendar = useCalendar();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!calendar.clientId) return;
    let active = true;
    loadGoogle()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [calendar.clientId, attempt]);

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
      <h2 className="font-bold flex gap-2 items-center">
        <CalendarDays size={20} />
        Google Agenda
      </h2>
      <p className="text-sm text-slate-600">
        Conecte o calendário principal de {user?.email}. Tarefas com prazo viram eventos. Compromissos
        dos últimos 30 dias e dos próximos 12 meses entram na aba Pessoal.
      </p>
      <p className="text-xs text-slate-500">
        Criações e edições sincronizam a cada minuto enquanto o site estiver aberto e conectado. Excluir
        um item em um dos lados preserva a cópia no outro.
      </p>
      <p className="text-xs text-slate-500">
        Ative a Google Calendar API e cadastre {location.origin} como origem JavaScript do cliente Web.
      </p>
      <AutoPreference
        field="calendar_client_id"
        label="ID de cliente OAuth do Google Cloud"
        fallback={import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID || ''}
        disabled={calendar.connected || calendar.busy}
      />
      {calendar.clientId && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={button}
            disabled={calendar.busy || (!calendar.connected && !ready)}
            onClick={calendar.connected ? calendar.synchronize : calendar.connect}
          >
            {calendar.busy
              ? 'Sincronizando…'
              : calendar.connected
                ? 'Sincronizar agora'
                : 'Conectar Google Agenda'}
          </button>
          {calendar.connected && (
            <button className={button} disabled={calendar.busy} onClick={calendar.disconnect}>
              Desconectar
            </button>
          )}
          {!ready && error && (
            <button
              className={button}
              onClick={() => {
                setError('');
                setAttempt((v) => v + 1);
              }}
            >
              Carregar novamente
            </button>
          )}
          {calendar.lastSync && (
            <span className="text-xs text-slate-500">
              Última sincronização às {calendar.lastSync.toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>
      )}
      {(calendar.error || error) && (
        <p role="alert" className="text-sm text-rose-700">
          {calendar.error || error}
        </p>
      )}
    </section>
  );
}
