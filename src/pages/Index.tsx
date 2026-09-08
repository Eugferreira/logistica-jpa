import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Truck,
  FileSpreadsheet,
  Users,
  Ban,
  LogOut,
  History,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { LoginForm } from '@/components/LoginForm';
import { OrderItemsTable } from '@/components/OrderItemsTable';
import { ExcelImportModal } from '@/components/ExcelImportModal';
import { IgnoredProductsModal } from '@/components/IgnoredProductsModal';
import { UserManagementModal } from '@/components/UserManagementModal';
import { AuditLogModal } from '@/components/AuditLogModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  UserProfile,
  ItemPedido,
  ImportSummary,
  UserRole,
} from '@/types/logistics';
import { isSupabaseConfigured } from '@/lib/supabase';
import * as api from '@/lib/api';
import { showSuccess, showError } from '@/utils/toast';

const Index: React.FC = () => {
  const queryClient = useQueryClient();

  // Usuário logado (a partir da sessão real do Supabase)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [checandoSessao, setChecandoSessao] = useState(true);

  // Modals
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [ignoredModalOpen, setIgnoredModalOpen] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  // Ao abrir o app, tenta recuperar a sessão (mantém login ao atualizar a página)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setChecandoSessao(false);
      return;
    }
    api
      .getCurrentUser()
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null))
      .finally(() => setChecandoSessao(false));
  }, []);

  // ----- CARREGAMENTO DE DADOS (React Query, só depois de logado) -----
  const habilitado = !!currentUser && isSupabaseConfigured;

  const itensQuery = useQuery({
    queryKey: ['itens'],
    queryFn: api.fetchItens,
    enabled: habilitado,
  });
  const produtosQuery = useQuery({
    queryKey: ['produtos_ignorados'],
    queryFn: api.fetchProdutosIgnorados,
    enabled: habilitado,
  });
  const profilesQuery = useQuery({
    queryKey: ['profiles'],
    queryFn: api.fetchProfiles,
    enabled: habilitado,
  });
  const logsQuery = useQuery({
    queryKey: ['logs'],
    queryFn: api.fetchLogs,
    enabled: habilitado,
  });

  const items = itensQuery.data ?? [];
  const produtosIgnorados = produtosQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];
  const logs = logsQuery.data ?? [];

  // ----- HANDLERS (gravam no banco e revalidam) -----

  const handleUpdateItem = async (itemId: string, updatedFields: Partial<ItemPedido>) => {
    if (!currentUser) return;
    try {
      await api.updateItemManual(itemId, updatedFields, currentUser.id);
      await queryClient.invalidateQueries({ queryKey: ['itens'] });
      await queryClient.invalidateQueries({ queryKey: ['logs'] });
    } catch (err: any) {
      showError(err.message || 'Falha ao salvar alteração.');
    }
  };

  const handleImportComplete = async (newItems: ItemPedido[], _summary: ImportSummary) => {
    try {
      await api.upsertNovosItens(newItems);
      await queryClient.invalidateQueries({ queryKey: ['itens'] });
    } catch (err: any) {
      showError(err.message || 'Falha ao gravar itens importados no banco.');
    }
  };

  const handleAddProdutoIgnorado = async (nome: string) => {
    try {
      await api.addProdutoIgnorado(nome);
      await queryClient.invalidateQueries({ queryKey: ['produtos_ignorados'] });
      showSuccess('Produto adicionado à lista de ignorados.');
    } catch (err: any) {
      showError(err.message || 'Falha ao adicionar produto.');
    }
  };

  const handleRemoveProdutoIgnorado = async (id: string) => {
    try {
      await api.removeProdutoIgnorado(id);
      await queryClient.invalidateQueries({ queryKey: ['produtos_ignorados'] });
    } catch (err: any) {
      showError(err.message || 'Falha ao remover produto.');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      await api.updateUserRole(userId, newRole);
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
      showSuccess('Papel do usuário atualizado.');
    } catch (err: any) {
      showError(err.message || 'Falha ao atualizar papel.');
    }
  };

  // Criação de usuário não é possível com a chave pública (anon).
  // O fluxo correto: a pessoa se cadastra na tela de login e o admin promove o papel.
  const handleAddUser = (_email: string, _nome: string, _role: UserRole) => {
    showError(
      'Por segurança, novos usuários se cadastram na tela de login (botão "Criar conta"). Depois, promova o papel aqui.'
    );
  };

  const handleLogout = async () => {
    try {
      await api.signOut();
    } finally {
      setCurrentUser(null);
      showSuccess('Sessão encerrada com sucesso.');
    }
  };

  // ----- TELAS DE ESTADO -----

  // Supabase não configurado: instrui a preencher o .env (sem fingir com mock)
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertCircle className="h-6 w-6" />
            <h1 className="text-lg font-bold">Configуração do Supabase pendente</h1>
          </div>
          <p className="text-sm text-slate-300">
            Crie um arquivo <code className="bg-slate-800 px-1 rounded">.env</code> na raiz do
            projeto com as suas credenciais (encontradas no painel do Supabase em Settings → API):
          </p>
          <pre className="bg-slate-800 text-emerald-300 text-xs p-3 rounded overflow-x-auto">
{`VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-public-key`}
          </pre>
          <p className="text-xs text-slate-400">
            Depois de salvar o .env, reinicie o servidor de desenvolvimento.
          </p>
        </div>
      </div>
    );
  }

  // Verificando sessão
  if (checandoSessao) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
      </div>
    );
  }

  // Não logado
  if (!currentUser) {
    return <LoginForm onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const isAdmin = currentUser.role === 'admin';
  const carregando = itensQuery.isLoading;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* BARRA DE NAVEGAÇÃO / CABEÇALHO */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-950">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">JPA Agro</h1>
                <Badge variant="outline" className="border-emerald-500 text-emerald-400 text-[10px] py-0">
                  Gestão de Fretes
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Substituição automatizada de planilha de fretes
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {isAdmin && (
              <>
                <Button
                  size="sm"
                  onClick={() => setImportModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 shadow"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Importar ERP (.xlsx)
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIgnoredModalOpen(true)}
                  className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs gap-1.5"
                >
                  <Ban className="h-3.5 w-3.5 text-rose-400" /> Produtos Ignorados
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setUsersModalOpen(true)}
                  className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs gap-1.5"
                >
                  <Users className="h-3.5 w-3.5 text-indigo-400" /> Usuários
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setAuditModalOpen(true)}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs gap-1.5"
            >
              <History className="h-3.5 w-3.5 text-amber-400" /> Auditoria Logs
            </Button>

            <ThemeToggle />

            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right text-xs hidden md:block">
                <span className="font-semibold block text-slate-200">{currentUser.nome}</span>
                <span className="text-[10px] text-slate-400 block">{currentUser.email}</span>
              </div>

              <Badge
                className={
                  isAdmin
                    ? 'bg-indigo-600 text-white text-[10px]'
                    : 'bg-slate-700 text-slate-300 text-[10px]'
                }
              >
                {isAdmin ? 'ADMIN' : 'OPERADOR'}
              </Badge>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-400 hover:bg-slate-800 h-8 w-8 p-0"
                title="Sair do sistema"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">
        {itensQuery.isError && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 text-sm rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {(itensQuery.error as Error)?.message || 'Erro ao carregar os itens.'}
          </div>
        )}

        {carregando ? (
          <div className="flex items-center justify-center gap-2 text-slate-500 py-20">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando itens...
          </div>
        ) : (
          <OrderItemsTable
            items={items}
            currentUser={currentUser}
            onUpdateItem={handleUpdateItem}
          />
        )}
      </main>

      {/* MODALS */}
      <ExcelImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        existingItems={items}
        produtosIgnorados={produtosIgnorados}
        onImportComplete={handleImportComplete}
      />

      <IgnoredProductsModal
        open={ignoredModalOpen}
        onOpenChange={setIgnoredModalOpen}
        produtos={produtosIgnorados}
        onAddProduto={handleAddProdutoIgnorado}
        onRemoveProduto={handleRemoveProdutoIgnorado}
      />

      <UserManagementModal
        open={usersModalOpen}
        onOpenChange={setUsersModalOpen}
        profiles={profiles}
        onUpdateRole={handleUpdateUserRole}
        onAddUser={handleAddUser}
      />

      <AuditLogModal open={auditModalOpen} onOpenChange={setAuditModalOpen} logs={logs} />

    </div>
  );
};

export default Index;
