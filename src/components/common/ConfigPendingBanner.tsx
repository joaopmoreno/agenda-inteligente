import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase/client';

export const ConfigPendingBanner: React.FC = () => {
  if (isSupabaseConfigured) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-900" role="alert">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <span className="font-semibold">Configuração Pendente:</span> Conexão com o Lovable Cloud / Supabase não configurada no arquivo <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs text-amber-950">.env</code>.
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto text-xs font-medium">
          <span className="text-amber-800">
            Adicione <code className="font-mono">VITE_SUPABASE_URL</code> e <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>.
          </span>
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 underline"
          >
            Ver painel <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
