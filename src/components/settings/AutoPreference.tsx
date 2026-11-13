import { useEffect, useRef, useState } from 'react';
import { useProfile } from '../../contexts/ProfileContext';

type Field = 'name' | 'theme' | 'timezone' | 'calendar_client_id';
interface Props {
  field: Field;
  label: string;
  fallback?: string;
  options?: { value: string; label: string }[];
  disabled?: boolean;
}

export function AutoPreference({ field, label, fallback = '', options, disabled }: Props) {
  const { profile, updateProfile } = useProfile();
  const saved = String(profile?.[field] ?? fallback);
  const [draft, setDraft] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pending = useRef<(() => void) | null>(null);
  const version = useRef(0);
  const mounted = useRef(true);
  function flush() {
    clearTimeout(timer.current);
    const write = pending.current;
    pending.current = null;
    write?.();
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      flush();
    };
  }, []);
  function change(value: string) {
    ++version.current;
    const current = version.current;
    clearTimeout(timer.current);
    pending.current = null;
    setDraft(value);
    setFailed(false);
    const clean = value.trim();
    if (
      (field === 'name' && !clean) ||
      (field === 'calendar_client_id' && clean && !/^[\w-]+\.apps\.googleusercontent\.com$/.test(clean))
    ) {
      setMessage(
        field === 'name'
          ? 'Informe seu nome.'
          : 'Informe um ID que termine em .apps.googleusercontent.com.'
      );
      setFailed(true);
      return;
    }
    setMessage('Salvando…');
    pending.current = () => {
      void updateProfile({ [field]: clean || null })
        .then(() => {
          if (mounted.current && version.current === current) {
            setDraft(null);
            setMessage('Salvo');
          }
        })
        .catch(() => {
          if (mounted.current && version.current === current) {
            setFailed(true);
            setMessage('Falha ao salvar.');
          }
        });
    };
    if (options) flush();
    else timer.current = setTimeout(flush, 600);
  }
  const style = 'block w-full mt-1 p-3 text-sm rounded-xl border border-slate-200 bg-slate-50';
  const id = 'pref-' + field;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {options ? (
        <select
          id={id}
          className={style}
          value={draft ?? saved}
          disabled={disabled}
          onChange={(e) => change(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className={style}
          value={draft ?? saved}
          onBlur={flush}
          disabled={disabled}
          placeholder={field === 'calendar_client_id' ? '…apps.googleusercontent.com' : undefined}
          onChange={(e) => change(e.target.value)}
        />
      )}
      {message && (
        <span role="status" className={'text-xs ' + (failed ? 'text-rose-700' : 'text-slate-500')}>
          {message}
          {message === 'Falha ao salvar.' && (
            <button type="button" className="underline ml-2" onClick={() => change(draft ?? saved)}>
              Tentar novamente
            </button>
          )}
        </span>
      )}
    </div>
  );
}
