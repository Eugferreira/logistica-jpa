// ====================================================================
// CAMADA DE ACESSO AO BANCO (Supabase)
// --------------------------------------------------------------------
// Todo acesso real ao banco fica AQUI. Os componentes não falam direto
// com o Supabase — eles chamam estas funções. Isso mantém o código
// organizado e fácil de manter (boas práticas de "data layer").
// ====================================================================

import { supabase } from './supabase';
import {
  ItemPedido,
  ProdutoIgnorado,
  UserProfile,
  ItemPedidoLog,
  UserRole,
} from '@/types/logistics';

// Garante que o cliente Supabase existe. Se o .env não estiver
// configurado, avisamos claramente em vez de "fingir" que funciona.
function getClient() {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.'
    );
  }
  return supabase;
}

// Só as colunas automáticas (vindas do ERP) vão para o INSERT.
// As 6 colunas manuais ficam com o default do banco (status = 'Pendente').
function toInsertPayload(item: ItemPedido) {
  return {
    cod_item: item.cod_item,
    cod_pedido: item.cod_pedido,
    data_venda: item.data_venda,
    frete: item.frete,
    vendedor: item.vendedor,
    produto: item.produto,
    peso_kg: item.peso_kg,
    cliente: item.cliente,
    cidade: item.cidade,
    uf: item.uf,
    veiculo: item.veiculo,
    data_est_carreg: item.data_est_carreg,
    tipo_operacao: item.tipo_operacao,
    preco: item.preco,
  };
}

// -------------------- AUTENTICAÇÃO --------------------

// Busca o perfil (profiles) de um usuário autenticado pelo id.
async function fetchProfileById(userId: string): Promise<UserProfile | null> {
  const sb = getClient();
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as UserProfile;
}

// Retorna o usuário logado (ou null) a partir da sessão atual do Supabase.
// Usado para manter o login ao atualizar a página.
export async function getCurrentUser(): Promise<UserProfile | null> {
  const sb = getClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  return fetchProfileById(data.user.id);
}

// Login com e-mail e senha (sem 2FA).
export async function signIn(email: string, password: string): Promise<UserProfile> {
  const sb = getClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(traduzErroAuth(error.message));
  if (!data.user) throw new Error('Não foi possível autenticar.');

  const profile = await fetchProfileById(data.user.id);
  if (!profile) {
    throw new Error('Usuário autenticado, mas sem perfil cadastrado. Contate o administrador.');
  }
  return profile;
}

// Cadastro de novo usuário (self-service). O trigger do banco cria o
// perfil automaticamente com papel 'user'. Um admin promove depois.
export async function signUp(email: string, password: string, nome: string): Promise<void> {
  const sb = getClient();
  const { error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { nome, role: 'user' } },
  });
  if (error) throw new Error(traduzErroAuth(error.message));
}

export async function signOut(): Promise<void> {
  const sb = getClient();
  await sb.auth.signOut();
}

// Traduz mensagens comuns do Supabase para português.
function traduzErroAuth(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
  if (m.includes('user already registered')) return 'Este e-mail já está cadastrado.';
  if (m.includes('password should be at least')) return 'A senha é muito curta (mínimo de 6 caracteres).';
  return msg;
}

// -------------------- ITENS DE PEDIDO --------------------

export async function fetchItens(): Promise<ItemPedido[]> {
  const sb = getClient();
  // Junta o nome de quem alterou por último (atualizado_por -> profiles.nome)
  const { data, error } = await sb
    .from('itens_pedido')
    .select('*, autor:atualizado_por(nome)')
    .order('data_est_carreg', { ascending: false, nullsFirst: false });
  if (error) throw new Error('Erro ao carregar itens: ' + error.message);

  return (data || []).map((row: any) => ({
    ...row,
    atualizado_por_nome: row.autor?.nome ?? undefined,
  })) as ItemPedido[];
}

// Atualiza SOMENTE as 6 colunas manuais + auditoria (atualizado_por/_em).
// O trigger do banco grava o histórico em itens_pedido_log automaticamente.
export async function updateItemManual(
  itemId: string,
  fields: Partial<ItemPedido>,
  userId: string
): Promise<void> {
  const sb = getClient();
  const permitidos: (keyof ItemPedido)[] = [
    'sugestao_frete',
    'status',
    'transportador',
    'motorista',
    'frete_combinado',
    'obs',
  ];

  const payload: Record<string, any> = {};
  for (const campo of permitidos) {
    if (campo in fields) payload[campo] = fields[campo];
  }
  payload.atualizado_por = userId;
  payload.atualizado_em = new Date().toISOString();

  const { error } = await sb.from('itens_pedido').update(payload).eq('id', itemId);
  if (error) throw new Error('Erro ao salvar alteração: ' + error.message);
}

// Insere SOMENTE itens novos. onConflict + ignoreDuplicates garante que
// itens já existentes (mesmo cod_item) sejam IGNORADOS, nunca alterados.
export async function upsertNovosItens(itens: ItemPedido[]): Promise<void> {
  const sb = getClient();
  if (itens.length === 0) return;
  const payload = itens.map(toInsertPayload);
  const { error } = await sb
    .from('itens_pedido')
    .upsert(payload, { onConflict: 'cod_item', ignoreDuplicates: true });
  if (error) throw new Error('Erro ao inserir novos itens: ' + error.message);
}

// -------------------- PRODUTOS IGNORADOS --------------------

export async function fetchProdutosIgnorados(): Promise<ProdutoIgnorado[]> {
  const sb = getClient();
  const { data, error } = await sb
    .from('produtos_ignorados')
    .select('*')
    .order('produto', { ascending: true });
  if (error) throw new Error('Erro ao carregar produtos ignorados: ' + error.message);
  return (data || []) as ProdutoIgnorado[];
}

export async function addProdutoIgnorado(nome: string): Promise<void> {
  const sb = getClient();
  const { error } = await sb.from('produtos_ignorados').insert({ produto: nome.trim() });
  if (error) throw new Error('Erro ao adicionar produto: ' + error.message);
}

export async function removeProdutoIgnorado(id: string): Promise<void> {
  const sb = getClient();
  const { error } = await sb.from('produtos_ignorados').delete().eq('id', id);
  if (error) throw new Error('Erro ao remover produto: ' + error.message);
}

// -------------------- PERFIS / USUÁRIOS --------------------

export async function fetchProfiles(): Promise<UserProfile[]> {
  const sb = getClient();
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error('Erro ao carregar usuários: ' + error.message);
  return (data || []) as UserProfile[];
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const sb = getClient();
  const { error } = await sb.from('profiles').update({ role }).eq('id', userId);
  if (error) throw new Error('Erro ao alterar papel do usuário: ' + error.message);
}

// -------------------- AUDITORIA (LOGS) --------------------

export async function fetchLogs(): Promise<ItemPedidoLog[]> {
  const sb = getClient();
  const { data, error } = await sb
    .from('itens_pedido_log')
    .select('*, autor:usuario_id(nome,email)')
    .order('data', { ascending: false })
    .limit(500);
  if (error) throw new Error('Erro ao carregar histórico: ' + error.message);

  return (data || []).map((row: any) => ({
    ...row,
    usuario_nome: row.autor?.nome ?? undefined,
    usuario_email: row.autor?.email ?? undefined,
  })) as ItemPedidoLog[];
}
