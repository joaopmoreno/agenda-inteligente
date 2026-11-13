import { upcomingQuestion, overdueQuestion } from '../../lib/ai/agendaQueries';
import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Mic,
  MicOff,
  RotateCcw,
  Loader2,
  Volume2,
  VolumeX,
  AlertTriangle,
} from 'lucide-react';
import { useAssistant } from '../../contexts/AssistantContext';
import { useProfile } from '../../contexts/ProfileContext';
import { ChatMessage } from './ChatMessage';

export const ChatDrawer: React.FC = () => {
  const {
    messages,
    isOpen,
    isLoading,
    isListening,
    isSpeaking,
    error,
    activeCategory,
    closeAssistant,
    sendMessage,
    clearChat,
    startVoiceInput,
    stopVoiceInput,
    speakText,
    stopSpeaking,
  } = useAssistant();

  const { profile, updateProfile } = useProfile();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    await sendMessage(text);
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const toggleVoice = async () => {
    if (!profile) return;
    if (isSpeaking) stopSpeaking();
    await updateProfile({ voice_enabled: !profile.voice_enabled });
  };

  const quickPrompts = [
    upcomingQuestion,
    overdueQuestion,
    `Adicione estudar amanhã às 19h na aba ${activeCategory}`,
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-xs flex justify-end">
      <div
        className="w-full sm:w-[440px] h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-title"
      >
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-brand-300 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="assistant-title" className="text-base font-bold text-slate-900">
                Assistente de IA
              </h2>
              <div className="flex items-center gap-2 text-2xs text-slate-500">
                <span>Contexto: Aba {activeCategory}</span>
                <span>•</span>
                <span className="text-amber-600 font-medium">Memória temporária</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleVoice}
              title={profile?.voice_enabled ? 'Voz ativada' : 'Voz desativada'}
              className={`p-2 rounded-lg text-sm transition-colors ${
                profile?.voice_enabled
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label="Alternar leitura por voz"
            >
              {profile?.voice_enabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={clearChat}
              title="Limpar conversa"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Reiniciar conversa"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={closeAssistant}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Fechar assistente"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Aviso de Memória Temporária */}
        <div className="px-4 py-2 bg-slate-100/60 border-b border-slate-200/50 text-2xs text-slate-500 flex items-center justify-between">
          <span>Esta conversa fica apenas na memória ativa da página e não é salva no banco.</span>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onSpeak={profile?.voice_enabled ? speakText : undefined}
            />
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl w-fit text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
              <span>Consultando ou atualizando agenda...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sugestões Rápidas */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickPrompt(prompt)}
              className="text-2xs font-medium bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-full px-3 py-1.5 whitespace-nowrap transition-colors flex-shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Barra de Entrada de Mensagem */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            {/* Botão Microfone (STT) */}
            <button
              type="button"
              onClick={isListening ? stopVoiceInput : startVoiceInput}
              title={isListening ? 'Parar gravação' : 'Gravar comando de voz'}
              className={`p-2.5 rounded-xl border transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              aria-label={isListening ? 'Parar gravação de voz' : 'Iniciar entrada por voz'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Input de Texto */}
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Digite um pedido em linguagem natural..."
              disabled={isLoading || isListening}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors disabled:opacity-50"
            />

            {/* Botão Enviar */}
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-xl shadow-xs transition-all disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Enviar mensagem"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
