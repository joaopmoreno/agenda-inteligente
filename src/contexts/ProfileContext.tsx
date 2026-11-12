import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { taskRepository } from '../lib/tasks/repository';
import { UserProfile } from '../lib/tasks/types';

interface ProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await taskRepository.getProfile(user.id);
      if (data) {
        setProfile(data);
      } else {
        // Inicializa se não existir no banco
        const initial = await taskRepository.saveProfile(user.id, {
          name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || (user.email?.split('@')[0]) || 'Usuário',
          timezone: 'America/Sao_Paulo',
          voice_enabled: false,
        });
        setProfile(initial);
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = await taskRepository.saveProfile(user.id, updates);
    setProfile(updated);
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isLoading,
        updateProfile,
        reloadProfile: fetchProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile deve ser utilizado dentro de um ProfileProvider');
  }
  return context;
}
