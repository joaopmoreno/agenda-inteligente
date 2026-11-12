import React from 'react';
import { Sparkles } from 'lucide-react';
import { useAssistant } from '../../contexts/AssistantContext';

export const AssistantFAB: React.FC = () => {
  const { toggleAssistant, isOpen } = useAssistant();

  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={toggleAssistant}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3.5 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-900/25 hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-brand-500/30 group"
      aria-label="Abrir assistente inteligente de IA"
    >
      <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-300 flex items-center justify-center group-hover:rotate-12 transition-transform">
        <Sparkles className="w-4 h-4" />
      </div>
      <span className="text-sm font-semibold tracking-tight pr-1">
        Assistente IA
      </span>
    </button>
  );
};
