import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Home, Settings, CalendarDays, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { to: '/', label: 'Início', icon: Home },
    { to: '/agenda', label: 'Agenda', icon: Calendar },
    { to: '/calendario', label: 'Calendário', icon: CalendarDays },
    { to: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="w-full px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between gap-1 sm:gap-3 h-16 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          {/* Logo */}
          <Link
            to="/"
            className="w-fit flex items-center gap-2 sm:gap-2.5 font-bold text-slate-900 text-lg tracking-tight hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm shadow-brand-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <span>Agenda Digital</span>
          </Link>

          {/* Desktop Nav */}
          {user && (
            <nav className="hidden lg:flex items-center gap-1">
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
            <div className="order-last lg:col-start-3 flex shrink-0 items-center gap-2">
              {/* Perfil & Logout */}
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-xs font-medium text-slate-600 max-w-[48px] min-[375px]:max-w-[72px] sm:max-w-[120px] truncate">
                  {profile?.name || user.email?.split('@')[0]}
                </span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  title="Sair da conta"
                  className="min-h-[44px] min-w-[40px] grid place-items-center text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                  aria-label="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="order-last lg:col-start-3 flex shrink-0 items-center gap-2">
              <Link
                to="/auth"
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors shadow-xs"
              >
                Entrar
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          {user && (
            <div className="ml-auto flex lg:hidden items-center">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
                aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {user && mobileMenuOpen && (
        <nav
          id="mobile-navigation"
          className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2"
        >
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
        </nav>
      )}
    </header>
  );
};
