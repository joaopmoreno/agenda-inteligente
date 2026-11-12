import React from 'react';
import { User, BookOpen, Briefcase, ArrowDownUp, Hand } from 'lucide-react';
import { TaskCategory, SortMode } from '../../lib/tasks/types';

interface AgendaTabsProps {
  activeTab: TaskCategory;
  onTabChange: (tab: TaskCategory) => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  taskCounts: Record<TaskCategory, number>;
}

export const AgendaTabs: React.FC<AgendaTabsProps> = ({
  activeTab,
  onTabChange,
  sortMode,
  onSortModeChange,
  taskCounts,
}) => {
  const tabs: { key: TaskCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'Pessoal', label: 'Pessoal', icon: User },
    { key: 'Escolar', label: 'Escolar', icon: BookOpen },
    { key: 'Trabalho', label: 'Trabalho', icon: Briefcase },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
      {/* Abas */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => {
          const isSelected = activeTab === key;
          const count = taskCounts[key] || 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                isSelected
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-brand-600' : 'text-slate-500'}`} />
              <span>{label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isSelected
                    ? 'bg-brand-50 text-brand-700 font-bold'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Interruptor Automático / Manual */}
      <div className="flex items-center self-end sm:self-auto gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => onSortModeChange('automatico')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
            sortMode === 'automatico'
              ? 'bg-brand-50 text-brand-700 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Ordenação automática: Atrasadas primeiro, depois por prazo mais próximo"
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
          <span>Automático</span>
        </button>

        <button
          type="button"
          onClick={() => onSortModeChange('manual')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
            sortMode === 'manual'
              ? 'bg-brand-50 text-brand-700 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Ordenação manual: Arraste para organizar como preferir"
        >
          <Hand className="w-3.5 h-3.5" />
          <span>Manual</span>
        </button>
      </div>
    </div>
  );
};
