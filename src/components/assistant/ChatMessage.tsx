import React from 'react';
import { Sparkles, User, AlertCircle, Volume2, Check } from 'lucide-react';
import { ChatMessageItem } from '../../contexts/AssistantContext';

interface ChatMessageProps {
  message: ChatMessageItem;
  onSpeak?: (text: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSpeak }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <span className="leading-relaxed">{message.content}</span>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-brand-600 text-white'
            : 'bg-slate-900 text-brand-300 shadow-2xs'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>

      <div className={`max-w-[85%] space-y-1.5`}>
        <div
          className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-brand-600 text-white rounded-tr-xs'
              : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/60'
          }`}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>

          {message.actionExecuted && (
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-2xs font-semibold text-emerald-700">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Agenda atualizada no banco</span>
            </div>
          )}
        </div>

        {!isUser && onSpeak && (
          <button
            type="button"
            onClick={() => onSpeak(message.content)}
            className="text-2xs font-medium text-slate-400 hover:text-slate-700 flex items-center gap-1 px-1 py-0.5"
            aria-label="Ouvir resposta"
          >
            <Volume2 className="w-3 h-3" />
            <span>Ouvir</span>
          </button>
        )}
      </div>
    </div>
  );
};
