import React, { createContext, useContext, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';
import { TaskCategory } from '../lib/tasks/types';
import { sendGeminiChatMessage } from '../lib/ai/gemini';
import { supabase } from '../lib/supabase/client';

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actionExecuted?: boolean;
}

interface AssistantContextType {
  messages: ChatMessageItem[];
  isOpen: boolean;
  isLoading: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  error: string | null;
  activeCategory: TaskCategory;
  setActiveCategory: (cat: TaskCategory) => void;
  openAssistant: () => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  startVoiceInput: () => Promise<void>;
  stopVoiceInput: () => void;
  speakText: (text: string) => Promise<void>;
  stopSpeaking: () => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  // Histórico em memória volátil apenas (desaparece ao recarregar a página)
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Olá! Sou seu assistente da Agenda Inteligente. Você pode me pedir para adicionar tarefas, consultar prazos de hoje ou das próximas 48 horas, concluir itens ou reagendar compromissos.',
      timestamp: new Date(),
    },
  ]);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<TaskCategory>('Pessoal');

  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const openAssistant = () => setIsOpen(true);
  const closeAssistant = () => setIsOpen(false);
  const toggleAssistant = () => setIsOpen(prev => !prev);

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: 'Conversa reiniciada. Como posso ajudar com sua agenda agora?',
        timestamp: new Date(),
      },
    ]);
    setError(null);
  };

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speakText = async (text: string) => {
    if (!profile?.voice_enabled) return;
    stopSpeaking();
    setIsSpeaking(true);

    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
      }
    } catch (err) {
      console.warn('Síntese de voz falhou:', err);
      setIsSpeaking(false);
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      if (!user?.id) {
        throw new Error('Você precisa estar autenticado para interagir com o assistente.');
      }

      // Se a chave do Gemini estiver configurada no perfil, usa o Gemini diretamente!
      if (profile?.gemini_api_key && profile.gemini_api_key.trim()) {
        const payloadMessages = [...messages, userMsg].map(m => ({
          role: m.role,
          content: m.content,
        }));

        const result = await sendGeminiChatMessage({
          apiKey: profile.gemini_api_key,
          messages: payloadMessages,
          activeCategory,
          userTimezone: profile?.timezone || 'America/Sao_Paulo',
          userId: user.id,
        });

        const assistantMsg: ChatMessageItem = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.reply,
          timestamp: new Date(),
          actionExecuted: result.actionExecuted,
        };

        setMessages(prev => [...prev, assistantMsg]);

        if (result.actionExecuted) {
          await queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }

        if (profile?.voice_enabled) {
          speakText(result.reply);
        }
        return;
      }

      // Caso não tenha a chave do Gemini configurada ainda, tenta a Edge Function ou instrui o usuário
      if (session?.access_token) {
        const payloadMessages = [...messages, userMsg].map(m => ({
          role: m.role,
          content: m.content,
        }));

        const res = await supabase.functions.invoke('chat', {
          body: {
            messages: payloadMessages,
            activeCategory,
            userTimezone: profile?.timezone || 'America/Sao_Paulo',
          },
        });

        if (!res.error && res.data?.reply) {
          const reply = res.data.reply;
          const actionExecuted = Boolean(res.data?.actionExecuted);

          const assistantMsg: ChatMessageItem = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: reply,
            timestamp: new Date(),
            actionExecuted,
          };

          setMessages(prev => [...prev, assistantMsg]);

          if (actionExecuted) {
            await queryClient.invalidateQueries({ queryKey: ['tasks'] });
          }

          if (profile?.voice_enabled) {
            speakText(reply);
          }
          return;
        }
      }

      // Mensagem orientando a cadastrar a chave
      const noKeyMessage =
        'Para ativar o Assistente de IA, adicione sua chave de API do Google Gemini nas Configurações do site. Ela é gratuita e você pode obter em: https://aistudio.google.com/app/apikey';

      setMessages(prev => [
        ...prev,
        {
          id: `assistant-nokey-${Date.now()}`,
          role: 'assistant',
          content: noKeyMessage,
          timestamp: new Date(),
        },
      ]);
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || 'Ocorreu um erro ao falar com o assistente.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceInput = async () => {
    setError(null);

    // Suporte nativo à Web Speech API (funciona sem precisar de chave externa no Chrome, Edge e celulares)
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0]?.[0]?.transcript;
          if (transcript) {
            sendMessage(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Erro de reconhecimento de fala:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err: any) {
        console.warn('Falha ao iniciar SpeechRecognition:', err);
      }
    }

    setError('Seu navegador não suporta reconhecimento de voz direto.');
    setIsListening(false);
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  return (
    <AssistantContext.Provider
      value={{
        messages,
        isOpen,
        isLoading,
        isListening,
        isSpeaking,
        error,
        activeCategory,
        setActiveCategory,
        openAssistant,
        closeAssistant,
        toggleAssistant,
        sendMessage,
        clearChat,
        startVoiceInput,
        stopVoiceInput,
        speakText,
        stopSpeaking,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant deve ser utilizado dentro de um AssistantProvider');
  }
  return context;
}
