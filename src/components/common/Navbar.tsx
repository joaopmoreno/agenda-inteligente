import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Calendar,
  Home,
  Settings,
  Sparkles,
  LogOut,
  Menu,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useAssistant } from '../../contexts/AssistantContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { toggleAssistant } = useAssistant();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const toggleVoicePreference = async () => {
    if (!profile) return;
    await updateProfile({ voice_enabled: !profile.voice_enabled });
  };

  const navLinks = [
    { to: '/', label: 'Início', icon: Home },
    { to: '/agenda', label: 'Agenda', icon: Calendar },
    { to: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 font-bold text-slate-900 text-lg tracking-tight hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm shadow-brand-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <span>Agenda Inteligente</span>
          </Link>

          {/* Desktop Nav */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(to)
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right Actions (Desktop) */}
          {user ? (
            <div className="hidden md:flex items-center gap-3">
              {/* Botão de voz rápida */}
              <button
                type="button"
                onClick={toggleVoicePreference}
                title={profile?.voice_enabled ? 'Voz ativada (clique para desativar)' : 'Voz desativada (clique para ativar)'}
                className={`p-2 rounded-lg text-sm transition-colors border ${
                  profile?.voice_enabled
                    ? 'bg-brand-50 text-brand-700 border-brand-200'
                    : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
                aria-label="Alternar voz do assistente"
              >
                {profile?.voice_enabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>

              {/* Botão Assistente IA */}
              <button
                type="button"
                onClick={toggleAssistant}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-brand-300" />
                <span>Assistente</span>
              </button>

              <div className="h-6 w-px bg-slate-200" />

              {/* Perfil & Logout */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600 max-w-[120px] truncate">
                  {profile?.name || user.email?.split('@')[0]}
                </span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  title="Sair da conta"
                  className="p-2 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/auth"
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors shadow-xs"
              >
                Entrar
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <button
                type="button"
                onClick={toggleAssistant}
                className="p-2 bg-brand-50 text-brand-700 rounded-lg"
                aria-label="Abrir assistente"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
          {user ? (
            <>
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Conectado como {profile?.name || user.email}
              </div>
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium min-h-[44px] ${
                    isActive(to)
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5 text-slate-500" />
                  {label}
                </Link>
              ))}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-3 py-2">
                <span className="text-sm text-slate-700">Leitura de Voz da IA</span>
                <button
                  type="button"
                  onClick={toggleVoicePreference}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border min-h-[44px] ${
                    profile?.voice_enabled
                      ? 'bg-brand-50 text-brand-700 border-brand-200'
                      : 'text-slate-600 border-slate-200'
                  }`}
                >
                  {profile?.voice_enabled ? 'Ativada' : 'Desativada'}
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 text-rose-600 font-medium rounded-lg hover:bg-rose-50 min-h-[44px]"
                >
                  <LogOut className="w-5 h-5" />
                  Sair da Conta
                </button>
              </div>
            </>
          ) : (
            <Link
              to="/auth"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full py-3 text-center text-white bg-brand-600 font-semibold rounded-lg"
            >
              Entrar ou Cadastrar
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
