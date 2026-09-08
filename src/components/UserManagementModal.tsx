import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Shield, User, Mail, Check } from 'lucide-react';
import { UserProfile, UserRole } from '@/types/logistics';
import { showSuccess } from '@/utils/toast';

interface UserManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: UserProfile[];
  onUpdateRole: (userId: string, newRole: UserRole) => void;
  onAddUser: (email: string, nome: string, role: UserRole) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  open,
  onOpenChange,
  profiles,
  onUpdateRole,
  onAddUser,
}) => {
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [role, setRole] = useState<UserRole>('user');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !nome.trim()) return;

    onAddUser(email.trim(), nome.trim(), role);
    showSuccess(`Usuário ${nome} cadastrado com perfil ${role.toUpperCase()}.`);
    setEmail('');
    setNome('');
    setRole('user');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Users className="h-6 w-6" />
            <DialogTitle className="text-xl font-bold">Usuários & Permissões</DialogTitle>
          </div>
          <DialogDescription>
            Gerencie o nível de acesso da equipe. Administradores podem importar planilhas e gerenciar dados; Operadores possuem permissão de edição apenas nas 6 colunas de frete.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Formulário de convite / cadastro */}
          <form onSubmit={handleCreate} className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 rounded-xl space-y-3">
            <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
              <UserPlus className="h-4 w-4" /> Cadastrar / Convidar Novo Usuário
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="text-xs bg-white dark:bg-slate-900"
                required
              />
              <Input
                placeholder="email@jpaagro.com.br"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-xs bg-white dark:bg-slate-900"
                required
              />
              <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                <SelectTrigger className="text-xs bg-white dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Operador (user)</SelectItem>
                  <SelectItem value="admin">Administrador (admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white w-full sm:w-auto text-xs">
              Cadastrar Usuário
            </Button>
          </form>

          {/* Lista de usuários */}
          <div className="border rounded-xl divide-y overflow-hidden">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-sm">
                    {p.nome ? p.nome.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      {p.nome}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {p.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={p.role}
                    onValueChange={(val) => {
                      onUpdateRole(p.id, val as UserRole);
                      showSuccess(`Permissão de ${p.nome} alterada para ${val}.`);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Operador</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>

                  <Badge
                    variant={p.role === 'admin' ? 'default' : 'secondary'}
                    className={p.role === 'admin' ? 'bg-indigo-600 text-white' : ''}
                  >
                    {p.role === 'admin' ? 'Admin' : 'Operador'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};