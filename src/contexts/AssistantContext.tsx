import React, { createContext, useContext, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';
import { TaskCategory } from '../lib/tasks/types';
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
  const { session } = useAuth();
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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
      // Tenta chamar a server function de síntese (TTS)
      if (session?.access_token) {
        const res = await supabase.functions.invoke('synthesize', {
          body: { text },
        });

        if (res.data && res.data instanceof Blob) {
          const audioUrl = URL.createObjectURL(res.data);
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;
          audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };
          await audio.play();
          return;
        }
      }

      // Fallback para SpeechSynthesis nativo do navegador caso a function esteja sem chave
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
      if (!session?.access_token) {
        throw new Error('Você precisa estar autenticado para interagir com o assistente.');
      }

      // Monta payload com histórico recente (apenas em memória)
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

      if (res.error) {
        throw new Error(res.error.message || 'Erro de comunicação com o assistente.');
      }

      const reply = res.data?.reply || 'Não foi possível processar a resposta.';
      const actionExecuted = Boolean(res.data?.actionExecuted);

      const assistantMsg: ChatMessageItem = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
        actionExecuted,
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Se uma ferramenta alterou o banco, invalida o cache do TanStack Query imediatamente!
      if (actionExecuted) {
        await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }

      // Se o usuário ativou a voz, lê a resposta
      if (profile?.voice_enabled) {
        speakText(reply);
      }
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || 'Ocorreu um erro ao falar com o assistente.';
      setError(errorMsg);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `Atenção: ${errorMsg}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceInput = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Seu navegador não suporta gravação de áudio.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setIsListening(false);

        if (audioChunksRef.current.length === 0) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        try {
          setIsLoading(true);
          const formData = new FormData();
          formData.append('file', audioBlob, 'audio.webm');

          const { data, error } = await supabase.functions.invoke('transcribe', {
            body: formData,
          });

          if (error) throw new Error(error.message);
          if (data?.text) {
            sendMessage(data.text);
          }
        } catch (sttErr: unknown) {
          setError(`Erro na transcrição de voz: ${(sttErr as Error).message}`);
        } finally {
          setIsLoading(false);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (micErr: unknown) {
      setError(`Permissão de microfone negada ou indisponível: ${(micErr as Error).message}`);
      setIsListening(false);
    }
  };

  const stopVoiceInput = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
    }
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
