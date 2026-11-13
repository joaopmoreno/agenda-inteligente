import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Navbar } from './components/common/Navbar';
import { ConfigPendingBanner } from './components/common/ConfigPendingBanner';
import { CalendarProvider } from './contexts/CalendarContext';
import { CalendarPage } from './pages/CalendarPage';
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

function AccountCalendar({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <CalendarProvider key={user?.id || 'guest'}>{children}</CalendarProvider>;
}

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfileProvider>
          <AccountCalendar>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-brand-700 selection:text-white">
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

                    <Route
                      path="/calendario"
                      element={
                        <ProtectedRoute>
                          <CalendarPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </BrowserRouter>
          </AccountCalendar>
        </ProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
