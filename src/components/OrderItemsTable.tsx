import React, { useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Search,
  Filter,
  X,
  Truck,
  CheckCircle2,
  Clock,
  User,
  Info,
  Calendar,
  DollarSign,
  Package,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react';
import { ItemPedido, ItemStatus, ItemFilters, UserProfile } from '@/types/logistics';
import { formatCurrency, formatDateBR, formatDateTimeBR, formatWeight } from '@/utils/formatters';
import { showSuccess } from '@/utils/toast';

interface OrderItemsTableProps {
  items: ItemPedido[];
  currentUser: UserProfile;
  onUpdateItem: (itemId: string, updatedFields: Partial<ItemPedido>) => void;
}

const STATUS_OPTIONS: ItemStatus[] = [
  'Pendente',
  'Frete combinado',
  'Carregado',
  'Entregue',
  'Cancelado',
];

// Data de hoje no formato YYYY-MM-DD (fuso local), usada como padrão do filtro de carregamento
const hojeISO = (): string => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export const OrderItemsTable: React.FC<OrderItemsTableProps> = ({
  items,
  currentUser,
  onUpdateItem,
}) => {
  // Estado dos filtros
  const [filters, setFilters] = useState<ItemFilters>({
    busca: '',
    produto: 'ALL',
    cidade: 'ALL',
    uf: 'ALL',
    frete: 'ALL',
    status: 'ALL',
    vendedor: 'ALL',
    transportador: 'ALL',
    dataEstCarregInicio: hojeISO(),
    dataEstCarregFim: '',
  });

  // Painel de filtros avançados (recolhido por padrão)
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Ordenação por coluna (clique no cabeçalho: A→Z, clique de novo: Z→A)
  const [sortKey, setSortKey] = useState<keyof ItemPedido | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const handleSort = (key: keyof ItemPedido) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  // Linhas em edição de inputs numéricos/textuais
  const [editingValues, setEditingValues] = useState<Record<string, Partial<ItemPedido>>>({});

  // Opções únicas para dropdowns de filtros
  const uniqueProdutos = useMemo(
    () => Array.from(new Set(items.map((i) => i.produto).filter(Boolean))).sort((a, b) => a!.localeCompare(b!, 'pt-BR')),
    [items]
  );
  const uniqueCidades = useMemo(
    () => Array.from(new Set(items.map((i) => i.cidade).filter(Boolean))).sort((a, b) => a!.localeCompare(b!, 'pt-BR')),
    [items]
  );
  const uniqueUFs = useMemo(() => Array.from(new Set(items.map((i) => i.uf).filter(Boolean))), [items]);
  const uniqueVendedores = useMemo(
    () => Array.from(new Set(items.map((i) => i.vendedor).filter(Boolean))),
    [items]
  );
  const uniqueTransportadores = useMemo(
    () => Array.from(new Set(items.map((i) => i.transportador).filter(Boolean))),
    [items]
  );

  // Filtragem dos dados
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Busca geral em Cliente, Produto, Cod.Pedido
      if (filters.busca.trim()) {
        const q = filters.busca.toLowerCase().trim();
        const matchCliente = item.cliente?.toLowerCase().includes(q);
        const matchProduto = item.produto?.toLowerCase().includes(q);
        const matchCodPedido = item.cod_pedido?.toString().includes(q);
        if (!matchCliente && !matchProduto && !matchCodPedido) return false;
      }

      // Filtro Produto
      if (filters.produto !== 'ALL' && item.produto !== filters.produto) return false;

      // Filtro Cidade
      if (filters.cidade !== 'ALL' && item.cidade !== filters.cidade) return false;

      // Filtro UF
      if (filters.uf !== 'ALL' && item.uf !== filters.uf) return false;

      // Filtro Frete CIF/FOB
      if (filters.frete !== 'ALL' && item.frete !== filters.frete) return false;

      // Filtro Status
      if (filters.status !== 'ALL' && item.status !== filters.status) return false;

      // Filtro Vendedor
      if (filters.vendedor !== 'ALL' && item.vendedor !== filters.vendedor) return false;

      // Filtro Transportador
      if (filters.transportador !== 'ALL' && item.transportador !== filters.transportador)
        return false;

      // Data de Carregamento
      if (filters.dataEstCarregInicio && item.data_est_carreg) {
        if (item.data_est_carreg < filters.dataEstCarregInicio) return false;
      }
      if (filters.dataEstCarregFim && item.data_est_carreg) {
        if (item.data_est_carreg > filters.dataEstCarregFim) return false;
      }

      return true;
    });
  }, [items, filters]);

  // Aplica a ordenação escolhida no cabeçalho (nulos sempre no fim)
  const sortedItems = useMemo(() => {
    if (!sortKey) return filteredItems;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filteredItems].sort((a, b) => {
      const va = a[sortKey]; const vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true, sensitivity: 'base' }) * dir;
    });
  }, [filteredItems, sortKey, sortDir]);

  // Cabeçalho clicável com indicador de ordenação
  const renderSortableHead = (label: string, colKey: keyof ItemPedido, className = '') => (
    <TableHead
      className={`${className} cursor-pointer select-none hover:bg-slate-200/70 dark:hover:bg-slate-700/60`}
      onClick={() => handleSort(colKey)}
      title="Clique para ordenar (A→Z / Z→A)"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === colKey ? (
          sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </TableHead>
  );

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const totalItens = filteredItems.length;
    const semTransportador = filteredItems.filter((i) => !i.transportador).length;
    const comFreteCombinado = filteredItems.filter((i) => i.status === 'Frete combinado').length;
    const pesoTotalKg = filteredItems.reduce((acc, curr) => acc + (curr.peso_kg || 0), 0);
    const valorFreteTotal = filteredItems.reduce(
      (acc, curr) => acc + (curr.frete_combinado || curr.sugestao_frete || 0),
      0
    );

    return {
      totalItens,
      semTransportador,
      comFreteCombinado,
      pesoTotalTons: (pesoTotalKg / 1000).toFixed(1),
      valorFreteTotal,
    };
  }, [filteredItems]);

  const handleFieldChange = (itemId: string, field: keyof ItemPedido, value: any) => {
    setEditingValues((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const handleSaveInlineField = (item: ItemPedido, field: keyof ItemPedido) => {
    const draft = editingValues[item.id];
    if (!draft || !(field in draft)) return;

    const newValue = draft[field];
    if (newValue === item[field]) return; // Sem alteração

    onUpdateItem(item.id, {
      [field]: newValue,
      atualizado_por: currentUser.id,
      atualizado_por_nome: currentUser.nome,
      atualizado_em: new Date().toISOString(),
    });

    showSuccess('Alteração salva com sucesso.');
  };

  const clearFilters = () => {
    setFilters({
      busca: '',
      produto: 'ALL',
      cidade: 'ALL',
      uf: 'ALL',
      frete: 'ALL',
      status: 'ALL',
      vendedor: 'ALL',
      transportador: 'ALL',
      dataEstCarregInicio: hojeISO(),
      dataEstCarregFim: '',
    });
  };

  const getStatusBadge = (status: ItemStatus) => {
    switch (status) {
      case 'Pendente':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Pendente</Badge>;
      case 'Frete combinado':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Frete combinado</Badge>;
      case 'Carregado':
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Carregado</Badge>;
      case 'Entregue':
        return <Badge className="bg-slate-700 hover:bg-slate-800 text-white">Entregue</Badge>;
      case 'Cancelado':
        return <Badge className="bg-rose-600 hover:bg-rose-700 text-white">Cancelado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* BARRA DE ESTATÍSTICAS RÁPIDAS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Total de Itens</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {stats.totalItens}
            </span>
          </div>
        </div>

        <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-amber-800 dark:text-amber-300 block font-semibold">
              Sem Transportador
            </span>
            <span className="text-lg font-bold text-amber-900 dark:text-amber-200">
              {stats.semTransportador}
            </span>
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Frete Combinado</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {stats.comFreteCombinado}
            </span>
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Volume Total (ton)</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {stats.pesoTotalTons} t
            </span>
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Valor Fretes</span>
            <span className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(stats.valorFreteTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* PAINEL DE FILTROS */}
      <div className="p-4 bg-white dark:bg-slate-900 border rounded-xl shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Busca textual */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar Cliente, Produto ou Cód.Pedido..."
              value={filters.busca}
              onChange={(e) => setFilters((f) => ({ ...f, busca: e.target.value }))}
              className="pl-9 text-xs"
            />
          </div>

          {/* Produto */}
          <Select value={filters.produto} onValueChange={(val) => setFilters((f) => ({ ...f, produto: val }))}>
            <SelectTrigger className="w-[190px] text-xs"><SelectValue placeholder="Produto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos Produtos</SelectItem>
              {uniqueProdutos.map((p) => (<SelectItem key={p} value={p!}>{p}</SelectItem>))}
            </SelectContent>
          </Select>

          {/* Frete CIF/FOB */}
          <Select value={filters.frete} onValueChange={(val) => setFilters((f) => ({ ...f, frete: val }))}>
            <SelectTrigger className="w-[110px] text-xs"><SelectValue placeholder="Frete" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">CIF / FOB</SelectItem>
              <SelectItem value="CIF">CIF</SelectItem>
              <SelectItem value="FOB">FOB</SelectItem>
            </SelectContent>
          </Select>

          {/* Cidade */}
          <Select value={filters.cidade} onValueChange={(val) => setFilters((f) => ({ ...f, cidade: val }))}>
            <SelectTrigger className="w-[170px] text-xs"><SelectValue placeholder="Cidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas Cidades</SelectItem>
              {uniqueCidades.map((c) => (<SelectItem key={c} value={c!}>{c}</SelectItem>))}
            </SelectContent>
          </Select>

          {/* Opção avançada de filtro */}
          <Button
            variant={showAdvanced ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs gap-1.5 h-9"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Opção avançada de filtro
            {(filters.uf !== 'ALL' || filters.status !== 'ALL' || filters.vendedor !== 'ALL' || filters.transportador !== 'ALL') && (
              <span className="ml-1 rounded-full bg-emerald-600 text-white px-1.5 text-[10px]">ativo</span>
            )}
          </Button>

          {/* Limpar Filtros */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs text-slate-500 hover:text-slate-800 gap-1 h-9"
          >
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        </div>

        {/* Filtros avançados (UF, Status, Vendedor, Transportador) */}
        {showAdvanced && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 mr-1">Avançado:</span>

            <Select value={filters.uf} onValueChange={(val) => setFilters((f) => ({ ...f, uf: val }))}>
              <SelectTrigger className="w-[110px] text-xs"><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas UFs</SelectItem>
                {uniqueUFs.map((uf) => (<SelectItem key={uf} value={uf!}>{uf}</SelectItem>))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(val) => setFilters((f) => ({ ...f, status: val }))}>
              <SelectTrigger className="w-[150px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos Status</SelectItem>
                {STATUS_OPTIONS.map((st) => (<SelectItem key={st} value={st}>{st}</SelectItem>))}
              </SelectContent>
            </Select>

            <Select value={filters.vendedor} onValueChange={(val) => setFilters((f) => ({ ...f, vendedor: val }))}>
              <SelectTrigger className="w-[170px] text-xs"><SelectValue placeholder="Vendedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos Vendedores</SelectItem>
                {uniqueVendedores.map((v) => (<SelectItem key={v} value={v!}>{v}</SelectItem>))}
              </SelectContent>
            </Select>

            <Select value={filters.transportador} onValueChange={(val) => setFilters((f) => ({ ...f, transportador: val }))}>
              <SelectTrigger className="w-[170px] text-xs"><SelectValue placeholder="Transportador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos Transp.</SelectItem>
                {uniqueTransportadores.map((t) => (<SelectItem key={t} value={t!}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Filtro por Intervalo de Data de Carregamento */}
        <div className="flex items-center gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100 dark:border-slate-800">
          <Calendar className="h-3.5 w-3.5 text-emerald-600" />
          <span>Data Est. Carregamento:</span>
          <Input
            type="date"
            value={filters.dataEstCarregInicio}
            onChange={(e) => setFilters((f) => ({ ...f, dataEstCarregInicio: e.target.value }))}
            className="w-[130px] h-7 text-xs"
          />
          <span>até</span>
          <Input
            type="date"
            value={filters.dataEstCarregFim}
            onChange={(e) => setFilters((f) => ({ ...f, dataEstCarregFim: e.target.value }))}
            className="w-[130px] h-7 text-xs"
          />
        </div>
      </div>

      {/* TABELA PRINCIPAL DE ITENS */}
      <div className="border rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-auto max-h-[calc(100vh-300px)] min-h-[300px]">
        <Table className="text-xs min-w-[1700px]">
          <TableHeader className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 z-10">
            <TableRow>
              {/* Ordem exata de colunas conforme especificação */}
              {renderSortableHead("1. Data Venda", "data_venda", "w-24")}
              {renderSortableHead("2. Frete", "frete", "w-16")}
              {renderSortableHead("3. Cód.Pedido", "cod_pedido", "w-24")}
              {renderSortableHead("4. Vendedor", "vendedor", "w-32")}
              {renderSortableHead("5. Produto", "produto", "w-44")}
              {renderSortableHead("6. Peso(kg)", "peso_kg", "w-24 text-right")}
              {renderSortableHead("7. Cliente", "cliente", "w-48")}
              {renderSortableHead("8. Cidade", "cidade", "w-32")}
              {renderSortableHead("9. UF", "uf", "w-12")}
              {renderSortableHead("10. Veículo", "veiculo", "w-32")}
              {renderSortableHead("11. Data.Est.Carreg.", "data_est_carreg", "w-28")}

              {/* Colunas Manuais (12 a 16 + 19) */}
              {renderSortableHead("12. Sugestão Frete", "sugestao_frete", "w-32 bg-emerald-100/70 text-emerald-950 font-bold dark:bg-emerald-950/80 dark:text-emerald-300")}
              {renderSortableHead("13. Status", "status", "w-36 bg-emerald-100/70 text-emerald-950 font-bold dark:bg-emerald-950/80 dark:text-emerald-300")}
              {renderSortableHead("14. Transportador", "transportador", "w-40 bg-emerald-100/70 text-emerald-950 font-bold dark:bg-emerald-950/80 dark:text-emerald-300")}
              {renderSortableHead("15. Motorista", "motorista", "w-36 bg-emerald-100/70 text-emerald-950 font-bold dark:bg-emerald-950/80 dark:text-emerald-300")}
              {renderSortableHead("16. Frete Combinado", "frete_combinado", "w-32 bg-emerald-100/70 text-emerald-950 font-bold dark:bg-emerald-950/80 dark:text-emerald-300")}

              {renderSortableHead("17. Tipo.Operação", "tipo_operacao", "w-36")}
              {renderSortableHead("18. Preço", "preco", "w-28 text-right")}
              {renderSortableHead("19. OBS", "obs", "w-44 bg-emerald-100/70 text-emerald-950 font-bold dark:bg-emerald-950/80 dark:text-emerald-300")}

              <TableHead className="w-24 text-center">Info Auditoria</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={20} className="h-32 text-center text-slate-500">
                  Nenhum item de pedido encontrado com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              sortedItems.map((item) => {
                // Destaque para frete sem transportador em amarelo claro
                const isFretePendente = !item.transportador;
                const draft = editingValues[item.id] || {};

                return (
                  <TableRow
                    key={item.id}
                    className={`transition-colors ${
                      isFretePendente
                        ? 'bg-amber-50/90 hover:bg-amber-100/90 dark:bg-amber-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* 1. Data.Venda */}
                    <TableCell className="font-mono">{formatDateBR(item.data_venda)}</TableCell>

                    {/* 2. Frete */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          item.frete === 'CIF'
                            ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950'
                            : 'border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950'
                        }
                      >
                        {item.frete || 'CIF'}
                      </Badge>
                    </TableCell>

                    {/* 3. Cód.Pedido */}
                    <TableCell className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      #{item.cod_pedido}
                    </TableCell>

                    {/* 4. Vendedor */}
                    <TableCell className=" whitespace-nowrap">{item.vendedor || '-'}</TableCell>

                    {/* 5. Produto */}
                    <TableCell className="font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {item.produto || '-'}
                    </TableCell>

                    {/* 6. Peso(kg) */}
                    <TableCell className="text-right font-mono font-medium">
                      {formatWeight(item.peso_kg)}
                    </TableCell>

                    {/* 7. Cliente */}
                    <TableCell className=" whitespace-nowrap font-medium" title={item.cliente || ''}>
                      {item.cliente || '-'}
                    </TableCell>

                    {/* 8. Cidade */}
                    <TableCell className=" whitespace-nowrap">{item.cidade || '-'}</TableCell>

                    {/* 9. UF */}
                    <TableCell className="font-bold">{item.uf || '-'}</TableCell>

                    {/* 10. Veículo */}
                    <TableCell className=" whitespace-nowrap">{item.veiculo || '-'}</TableCell>

                    {/* 11. Data.Est.Carreg. */}
                    <TableCell className="font-mono">{formatDateBR(item.data_est_carreg)}</TableCell>

                    {/* ======================================================== */}
                    {/* EDITÁVEIS (COLUNAS MANUAIS: 12 A 16 + 19) */}
                    {/* ======================================================== */}

                    {/* 12. Sugestão de Frete (R$) */}
                    <TableCell className="bg-emerald-50/40 dark:bg-emerald-950/20">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={
                          draft.sugestao_frete !== undefined
                            ? draft.sugestao_frete ?? ''
                            : item.sugestao_frete ?? ''
                        }
                        onChange={(e) =>
                          handleFieldChange(
                            item.id,
                            'sugestao_frete',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                        onBlur={() => handleSaveInlineField(item, 'sugestao_frete')}
                        className="h-7 text-xs bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800 font-mono"
                      />
                    </TableCell>

                    {/* 13. Status */}
                    <TableCell className="bg-emerald-50/40 dark:bg-emerald-950/20">
                      <Select
                        value={item.status}
                        onValueChange={(val: ItemStatus) => {
                          onUpdateItem(item.id, {
                            status: val,
                            atualizado_por: currentUser.id,
                            atualizado_por_nome: currentUser.nome,
                            atualizado_em: new Date().toISOString(),
                          });
                          showSuccess(`Status alterado para "${val}".`);
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((st) => (
                            <SelectItem key={st} value={st}>
                              {st}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* 14. Transportador */}
                    <TableCell className="bg-emerald-50/40 dark:bg-emerald-950/20">
                      <Input
                        placeholder="Nome transportadora"
                        value={
                          draft.transportador !== undefined
                            ? draft.transportador ?? ''
                            : item.transportador ?? ''
                        }
                        onChange={(e) =>
                          handleFieldChange(item.id, 'transportador', e.target.value || null)
                        }
                        onBlur={() => handleSaveInlineField(item, 'transportador')}
                        className={`h-7 text-xs bg-white dark:bg-slate-900 ${
                          isFretePendente
                            ? 'border-amber-400 focus:border-amber-500 font-semibold text-amber-900 dark:text-amber-300'
                            : 'border-emerald-300 dark:border-emerald-800'
                        }`}
                      />
                    </TableCell>

                    {/* 15. Motorista */}
                    <TableCell className="bg-emerald-50/40 dark:bg-emerald-950/20">
                      <Input
                        placeholder="Nome e Placa"
                        value={
                          draft.motorista !== undefined
                            ? draft.motorista ?? ''
                            : item.motorista ?? ''
                        }
                        onChange={(e) =>
                          handleFieldChange(item.id, 'motorista', e.target.value || null)
                        }
                        onBlur={() => handleSaveInlineField(item, 'motorista')}
                        className="h-7 text-xs bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800"
                      />
                    </TableCell>

                    {/* 16. Frete Combinado (R$) */}
                    <TableCell className="bg-emerald-50/40 dark:bg-emerald-950/20">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={
                          draft.frete_combinado !== undefined
                            ? draft.frete_combinado ?? ''
                            : item.frete_combinado ?? ''
                        }
                        onChange={(e) =>
                          handleFieldChange(
                            item.id,
                            'frete_combinado',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                        onBlur={() => handleSaveInlineField(item, 'frete_combinado')}
                        className="h-7 text-xs bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800 font-mono font-bold text-emerald-700 dark:text-emerald-400"
                      />
                    </TableCell>

                    {/* 17. Tipo.Operação */}
                    <TableCell className="text-slate-600 dark:text-slate-400">
                      {item.tipo_operacao || '-'}
                    </TableCell>

                    {/* 18. Preço */}
                    <TableCell className="text-right font-mono">
                      {item.preco ? formatCurrency(item.preco) : '-'}
                    </TableCell>

                    {/* 19. OBS */}
                    <TableCell className="bg-emerald-50/40 dark:bg-emerald-950/20">
                      <Input
                        placeholder="Observações de frete..."
                        value={
                          draft.obs !== undefined ? draft.obs ?? '' : item.obs ?? ''
                        }
                        onChange={(e) => handleFieldChange(item.id, 'obs', e.target.value || null)}
                        onBlur={() => handleSaveInlineField(item, 'obs')}
                        className="h-7 text-xs bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800"
                      />
                    </TableCell>

                    {/* 20. Auditoria / Info */}
                    <TableCell className="text-center">
                      {item.atualizado_em ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 cursor-pointer bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-600 hover:text-emerald-600">
                              <Info className="h-3 w-3 text-emerald-600" />
                              {item.atualizado_por_nome ? item.atualizado_por_nome.split(' ')[0] : 'Auditado'}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs space-y-1">
                            <p className="font-bold flex items-center gap-1">
                              <User className="h-3 w-3 text-emerald-400" />
                              Alterado por: {item.atualizado_por_nome || 'Usuário'}
                            </p>
                            <p className="flex items-center gap-1 text-slate-300">
                              <Clock className="h-3 w-3 text-slate-400" />
                              Data: {formatDateTimeBR(item.atualizado_em)}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};