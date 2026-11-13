import React from 'react';
import { Settings } from 'lucide-react';
import { SettingsForm } from '../components/settings/SettingsForm';

export const SettingsPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Configurações
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Ajuste seu perfil, fuso horário e aparência.
          </p>
        </div>
      </div>

      <SettingsForm />
    </div>
  );
};
