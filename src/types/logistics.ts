export type ItemStatus = 'Pendente' | 'Frete combinado' | 'Carregado' | 'Entregue' | 'Cancelado';
export type FreteTipo = 'CIF' | 'FOB';
export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  created_at?: string;
}

export interface ItemPedido {
  id: string;
  cod_item: number; // ERP Unique Key (oculta na tabela principal)
  cod_pedido: number | null;
  data_venda: string | null;
  frete: FreteTipo | null;
  vendedor: string | null;
  produto: string | null;
  peso_kg: number | null;
  cliente: string | null;
  cidade: string | null;
  uf: string | null;
  veiculo: string | null;
  data_est_carreg: string | null;
  tipo_operacao: string | null;
  preco: number | null;

  // Manual fields
  sugestao_frete: number | null;
  status: ItemStatus;
  transportador: string | null;
  motorista: string | null;
  frete_combinado: number | null;
  obs: string | null;

  // Audit
  atualizado_por: string | null;
  atualizado_em: string | null;
  atualizado_por_nome?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ItemPedidoLog {
  id: string;
  item_id: string;
  usuario_id: string | null;
  usuario_nome?: string;
  usuario_email?: string;
  campo_alterado: string;
  valor_antigo: string | null;
  valor_novo: string | null;
  data: string;
}

export interface ProdutoIgnorado {
  id: string;
  produto: string;
  created_at?: string;
}

export interface ImportSummary {
  totalLidos: number;
  inseridos: number;
  ignoradosExistentes: number;
  ignoradosForaEscopo: number;
  ignoradosDuplicadosArquivo: number;
  ignoradosDataAnterior: number;
  erros: string[];
}

export interface ItemFilters {
  busca: string;
  uf: string;
  frete: string;
  status: string;
  vendedor: string;
  transportador: string;
  dataEstCarregInicio: string;
  dataEstCarregFim: string;
}