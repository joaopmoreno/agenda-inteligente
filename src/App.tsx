import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { AssistantProvider } from './contexts/AssistantContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Navbar } from './components/common/Navbar';
import { ConfigPendingBanner } from './components/common/ConfigPendingBanner';
import { ChatDrawer } from './components/assistant/ChatDrawer';
import { AssistantFAB } from './components/assistant/AssistantFAB';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { AgendaPage } from './pages/AgendaPage';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfileProvider>
          <AssistantProvider>
            <BrowserRouter>
              <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-brand-500 selection:text-white">
                <ConfigPendingBanner />
                <Navbar />

                <main className="flex-1 pb-16">
                  <Routes>
                    <Route path="/auth" element={<AuthPage />} />

                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/agenda"
                      element={
                        <ProtectedRoute>
                          <AgendaPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/configuracoes"
                      element={
                        <ProtectedRoute>
                          <SettingsPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>

                {/* Assistente de IA Flutuante e Lateral */}
                <ChatDrawer />
                <AssistantFAB />
              </div>
            </BrowserRouter>
          </AssistantProvider>
        </ProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
