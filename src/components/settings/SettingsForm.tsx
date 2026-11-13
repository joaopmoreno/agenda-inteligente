import React, { useState, useEffect } from 'react';
import type { Theme } from '../../lib/tasks/types';
import { useProfile } from '../../contexts/ProfileContext';
import {
  User,
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const SettingsForm: React.FC = () => {
  const { profile, updateProfile, isLoading } = useProfile();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [theme, setTheme] = useState<Theme>('system');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setTheme(profile.theme || 'system');
      setName(profile.name || '');
      setTimezone(profile.timezone || 'America/Sao_Paulo');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      await updateProfile({
        name: name.trim(),
        timezone,
        theme,
      });
      setFeedback({ type: 'success', text: 'Configurações salvas no banco de dados.' });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: (err as Error).message || 'Falha ao salvar preferências no banco de dados.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const timezones = [
    { value: 'America/Sao_Paulo', label: 'Brasília / São Paulo (UTC-3)' },
    { value: 'America/Manaus', label: 'Manaus / Amazonas (UTC-4)' },
    { value: 'America/Cuiaba', label: 'Cuiabá / Mato Grosso (UTC-4)' },
    { value: 'America/Belem', label: 'Belém / Pará (UTC-3)' },
    { value: 'America/Fortaleza', label: 'Fortaleza / Nordeste (UTC-3)' },
    { value: 'America/Recife', label: 'Recife / Pernambuco (UTC-3)' },
    { value: 'America/Rio_Branco', label: 'Rio Branco / Acre (UTC-5)' },
    { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)' },
    { value: 'Europe/Lisbon', label: 'Lisboa / Portugal (WET/WEST)' },
    { value: 'UTC', label: 'Tempo Universal Coordenado (UTC)' },
  ];

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600 mr-2" />
        <span>Carregando preferências...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-start gap-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
          role="alert"
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{feedback.text}</span>
        </div>
      )}

      {/* Nome */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="settings-name">
          Nome de Exibição
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <User className="w-4 h-4" />
          </div>
          <input
            id="settings-name"
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Nome exibido no início da agenda.
        </p>
      </div>

      {/* Fuso Horário */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="settings-timezone">
          Fuso Horário Padrão
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Clock className="w-4 h-4" />
          </div>
          <select
            id="settings-timezone"
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          >
            {timezones.map(tz => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Todas as datas de tarefas e cálculos de atraso serão ajustados para este fuso.
        </p>
      </div>

      <label className="block space-y-2 text-sm font-semibold" htmlFor="theme">
        <span>Aparência</span>
        <select id="theme" value={theme} onChange={e => setTheme(e.target.value as Theme)}
          className="block w-full p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <option value="system">Seguir o navegador</option>
          <option value="light">Claro</option>
          <option value="dark">Escuro</option>
        </select>
      </label>

      {/* Botão Salvar */}
      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center gap-2 min-h-[44px] disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Salvando no banco...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
