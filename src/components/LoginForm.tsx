import React, { useState } from 'react';
import { Truck, LogIn, Loader2, UserPlus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserProfile } from '@/types/logistics';
import * as api from '@/lib/api';
import { showSuccess, showError } from '@/utils/toast';

interface LoginFormProps {
  onLoginSuccess: (user: UserProfile) => void;
}

// Tela de autenticação — login com e-mail e senha (sem 2FA).
// Também permite criar conta (self-service); um admin promove o papel depois.
export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [modo, setModo] = useState<'login' | 'cadastro'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showError('Preencha e-mail e senha.');
      return;
    }
    setCarregando(true);
    try {
      const user = await api.signIn(email.trim(), password);
      showSuccess(`Bem-vindo, ${user.nome}!`);
      onLoginSuccess(user);
    } catch (err: any) {
      showError(err.message || 'Falha ao entrar.');
    } finally {
      setCarregando(false);
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !password) {
      showError('Preencha nome, e-mail e senha.');
      return;
    }
    if (password.length < 6) {
      showError('A senha precisa ter ao menos 6 caracteres.');
      return;
    }
    setCarregando(true);
    try {
      await api.signUp(email.trim(), password, nome.trim());
      showSuccess('Conta criada! Se a confirmação por e-mail estiver ativa, confirme antes de entrar.');
      setModo('login');
      setPassword('');
    } catch (err: any) {
      showError(err.message || 'Falha ao criar conta.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-950">
            <Truck className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-white">JPA Agro</h1>
          <p className="text-xs text-slate-400">Gestão de Fretes — acesso restrito</p>
        </div>

        {modo === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-xs">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@jpaagro.com.br"
                className="bg-slate-800 border-slate-700 text-white"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300 text-xs">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-800 border-slate-700 text-white"
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={carregando}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            >
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Entrar
            </Button>

            <button
              type="button"
              onClick={() => setModo('cadastro')}
              className="w-full text-xs text-slate-400 hover:text-emerald-400 flex items-center justify-center gap-1"
            >
              <UserPlus className="h-3.5 w-3.5" /> Criar conta
            </button>
          </form>
        ) : (
          <form onSubmit={handleCadastro} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-slate-300 text-xs">Nome completo</Label>
              <Input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-c" className="text-slate-300 text-xs">E-mail</Label>
              <Input
                id="email-c"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@jpaagro.com.br"
                className="bg-slate-800 border-slate-700 text-white"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password-c" className="text-slate-300 text-xs">Senha (mín. 6 caracteres)</Label>
              <Input
                id="password-c"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-800 border-slate-700 text-white"
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              disabled={carregando}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            >
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Criar conta
            </Button>

            <button
              type="button"
              onClick={() => setModo('login')}
              className="w-full text-xs text-slate-400 hover:text-emerald-400 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o login
            </button>
          </form>
        )}

        <p className="text-[10px] text-slate-500 text-center">
          Novos usuários entram como "Operador". Um administrador ajusta o papel depois.
        </p>
      </div>
    </div>
  );
};
