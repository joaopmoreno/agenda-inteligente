import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Mail, Lock, User as UserIcon, Loader2, AlertCircle } from 'lucide-react';

export const AuthForm: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signInWithEmail, signUpWithEmail, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Rota de retorno após login
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const { error } = await signUpWithEmail(email, password, name);
        if (error) throw error;
        navigate(from, { replace: true });
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
      {/* Cabeçalho */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-100 shadow-xs">
          <Calendar className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {isSignUp ? 'Criar nova conta' : 'Acesse sua Agenda'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isSignUp
            ? 'Comece a organizar suas tarefas por categoria'
            : 'Organize suas tarefas pessoais, escolares e de trabalho'}
        </p>
      </div>

      {!isConfigured && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Aviso de Configuração Pendente</p>
            O Lovable Cloud / Supabase precisa ser configurado com suas variáveis no arquivo <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env</code> para que o login real e o banco funcionem.
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-2.5" role="alert">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <span className="leading-snug">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="name">
              Nome Completo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Como deseja ser chamado?"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="email">
            E-mail
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="password">
            Senha
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold rounded-xl text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isSignUp ? (
            'Cadastrar Conta'
          ) : (
            'Entrar na Agenda'
          )}
        </button>
      </form>

      {/* Alternância Login / Cadastro */}
      <div className="mt-6 text-center text-sm text-slate-500">
        {isSignUp ? (
          <>
            Já possui uma conta?{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg(null);
              }}
              className="text-brand-600 hover:text-brand-700 font-semibold underline"
            >
              Fazer login
            </button>
          </>
        ) : (
          <>
            Ainda não tem conta?{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMsg(null);
              }}
              className="text-brand-600 hover:text-brand-700 font-semibold underline"
            >
              Criar agora
            </button>
          </>
        )}
      </div>
    </div>
  );
};
