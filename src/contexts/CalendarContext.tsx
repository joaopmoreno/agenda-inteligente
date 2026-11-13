import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';
import { authorizeCalendar, CalendarError, type CalendarAccess } from '../lib/calendar/google';
import { syncCalendar } from '../lib/calendar/sync';

interface CalendarState {
  connected: boolean;
  busy: boolean;
  error: string;
  lastSync: Date | null;
  clientId: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  synchronize: () => void;
}
const CalendarContext = createContext<CalendarState | null>(null);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const cache = useQueryClient();
  const [access, setAccess] = useState<CalendarAccess | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);
  const running = useRef(false);
  const clientId = profile?.calendar_client_id || import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID || '';
  const email = user?.email || '';
  const connect = async () => {
    setError('');
    try {
      setAccess(await authorizeCalendar(clientId, email));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao autorizar o calendário.');
    }
  };
  function disconnect() {
    setAccess(null);
    setError('');
    setLastSync(null);
  }

  useEffect(() => {
    if (!access || !user || access.email !== email) return;
    let active = true;
    const update = async () => {
      if (!active || document.hidden || running.current) return;
      if (access.expires <= Date.now() + 5000) {
        setError('A autorização expirou. Conecte novamente para continuar sincronizando.');
        setAccess(null);
        return;
      }
      running.current = true;
      setBusy(true);
      setError('');
      try {
        const count = await syncCalendar(user.id, access, profile?.timezone || 'America/Sao_Paulo');
        if (active) {
          setLastSync(new Date());
          if (count)
            setError(
              'Houve alterações simultâneas ou eventos sem permissão de edição. Os valores do Google foram preservados.'
            );
          await cache.invalidateQueries({ queryKey: ['tasks'] });
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Falha na sincronização.');
          if (err instanceof CalendarError && err.status === 401) setAccess(null);
        }
      } finally {
        running.current = false;
        if (active) setBusy(false);
      }
    };
    void update();
    const interval = window.setInterval(update, 60000);
    document.addEventListener('visibilitychange', update);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
    };
  }, [access, user?.id, email, profile?.timezone, cache, tick]);

  return (
    <CalendarContext.Provider
      value={{
        connected: !!access && access.email === email,
        busy: !!access && busy,
        error,
        lastSync,
        clientId,
        connect,
        disconnect,
        synchronize: () => setTick((v) => v + 1),
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const value = useContext(CalendarContext);
  if (!value) throw new Error('Calendário indisponível.');
  return value;
}
