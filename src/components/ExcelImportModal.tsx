import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Info, RefreshCw } from 'lucide-react';
import { ItemPedido, ImportSummary, ProdutoIgnorado } from '@/types/logistics';
import { normalizeProductName } from '@/utils/formatters';
import { showSuccess, showError } from '@/utils/toast';

interface ExcelImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingItems: ItemPedido[];
  produtosIgnorados: ProdutoIgnorado[];
  onImportComplete: (newItems: ItemPedido[], summary: ImportSummary) => void;
}

// Data de hoje (YYYY-MM-DD, fuso local) — padrão do filtro "a partir de"
const hojeISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  open,
  onOpenChange,
  existingItems,
  produtosIgnorados,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  // Só importa linhas com Data.Est.Carreg. >= esta data (vazio = importa todas)
  const [dataMinima, setDataMinima] = useState<string>(hojeISO());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setSummary(null);
    }
  };

  const parseExcelDate = (excelValue: any): string | null => {
    if (!excelValue) return null;
    
    // Se for um objeto de data do JS
    if (excelValue instanceof Date) {
      return excelValue.toISOString().split('T')[0];
    }

    // Se for número serial de data do Excel
    if (typeof excelValue === 'number') {
      const dateObj = XLSX.SSF.parse_date_code(excelValue);
      if (dateObj) {
        const y = dateObj.y;
        const m = String(dateObj.m).padStart(2, '0');
        const d = String(dateObj.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    // Se for string no formato DD/MM/YYYY
    const str = String(excelValue).trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const [d, m, y] = str.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    return str;
  };

  const processFile = async () => {
    if (!file) {
      showError('Por favor, selecione o arquivo ItensDePedido.xlsx');
      return;
    }

    setProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

      if (!rawRows || rawRows.length === 0) {
        throw new Error('A planilha está vazia ou não contém dados válidos.');
      }

      // Validação de cabeçalhos
      const firstRow = rawRows[0];
      const keys = Object.keys(firstRow);

      // Função flexível para localizar o nome da coluna no arquivo
      const findHeader = (candidates: string[]) => {
        return keys.find((k) =>
          candidates.some(
            (c) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === c.toLowerCase().replace(/[^a-z0-9]/g, '')
          )
        );
      };

      const colCodItem = findHeader(['Cód.Item▲', 'Cod.Item', 'CodItem', 'Cód.Item']);
      const colCodPedido = findHeader(['Cód.Pedido', 'Cod.Pedido', 'CodPedido']);
      const colDataVenda = findHeader(['Data.Venda', 'Data Venda', 'DataVenda']);
      const colFrete = findHeader(['Frete']);
      const colVendedor = findHeader(['Vendedor']);
      const colProduto = findHeader(['Produto']);
      const colPeso = findHeader(['Peso(kg)', 'Peso (kg)', 'Peso']);
      const colCliente = findHeader(['Cliente']);
      const colCidade = findHeader(['Cidade']);
      const colUf = findHeader(['UF']);
      const colVeiculo = findHeader(['Veículo', 'Veiculo']);
      const colDataCarreg = findHeader(['Data.Est.Carreg.', 'Data Est Carreg', 'Data.Est.Carreg']);
      const colTipoOperacao = findHeader(['Tipo.Operação', 'Tipo Operação', 'Tipo.Operacao']);
      const colPreco = findHeader(['Preço', 'Preco']);

      if (!colCodItem) {
        throw new Error('Coluna obrigatória "Cód.Item▲" não foi encontrada na planilha.');
      }

      // Conjunto de cod_item que já existem no banco
      const existingCodItems = new Set(existingItems.map((i) => Number(i.cod_item)));

      // Conjunto de produtos ignorados (normalizados para comparação robusta)
      const setIgnoredProducts = new Set(
        produtosIgnorados.map((p) => normalizeProductName(p.produto))
      );

      const itemsToInsert: ItemPedido[] = [];
      const fileSeenCodItems = new Set<number>();

      let countLidos = 0;
      let countInseridos = 0;
      let countExistentes = 0;
      let countForaEscopo = 0;
      let countDuplicadosArquivo = 0;
      let countDataAnterior = 0;
      const erros: string[] = [];

      for (let index = 0; index < rawRows.length; index++) {
        const row = rawRows[index];
        countLidos++;

        const rawCodItem = row[colCodItem];
        if (!rawCodItem) continue;

        const codItemNum = Number(rawCodItem);
        if (isNaN(codItemNum)) {
          erros.push(`Linha ${index + 2}: Cód.Item inválido (${rawCodItem}).`);
          continue;
        }

        // 1. Checa se o produto está na lista de ignorados (fora do escopo)
        const rawProductName = colProduto ? String(row[colProduto] || '') : '';
        const normalizedProdName = normalizeProductName(rawProductName);

        // Comparação por IGUALDADE (após normalizar), não por substring —
        // evita excluir um produto só porque o nome contém um pedaço de outro.
        const isIgnoredProduct = setIgnoredProducts.has(normalizedProdName);

        if (isIgnoredProduct) {
          countForaEscopo++;
          continue;
        }

        // 1b. Filtro por data de carregamento (ex.: só cargas de hoje em diante)
        const dataCarregLinha = colDataCarreg ? parseExcelDate(row[colDataCarreg]) : null;
        if (dataMinima && dataCarregLinha && dataCarregLinha < dataMinima) {
          countDataAnterior++;
          continue;
        }

        // 2. Checa se já existe no banco de dados (se existir, IGNORAR por completo)
        if (existingCodItems.has(codItemNum)) {
          countExistentes++;
          continue;
        }

        // 3. Checa duplicidade dentro do próprio arquivo Excel
        if (fileSeenCodItems.has(codItemNum)) {
          countDuplicadosArquivo++;
          continue;
        }

        fileSeenCodItems.add(codItemNum);

        // Monta o novo registro com as 13 colunas automáticas limpas
        const newItem: ItemPedido = {
          id: 'item-' + codItemNum + '-' + Date.now(),
          cod_item: codItemNum,
          cod_pedido: colCodPedido && row[colCodPedido] ? Number(row[colCodPedido]) : null,
          data_venda: colDataVenda ? parseExcelDate(row[colDataVenda]) : null,
          frete: colFrete && row[colFrete] ? (String(row[colFrete]).trim().toUpperCase() === 'CIF' ? 'CIF' : 'FOB') : 'CIF',
          vendedor: colVendedor ? String(row[colVendedor] || '').trim() : null,
          produto: rawProductName.trim() || null,
          peso_kg: colPeso && row[colPeso] ? Math.round(Number(row[colPeso])) : null,
          cliente: colCliente ? String(row[colCliente] || '').trim() : null,
          cidade: colCidade ? String(row[colCidade] || '').trim() : null,
          uf: colUf ? String(row[colUf] || '').trim().toUpperCase() : null,
          veiculo: colVeiculo ? String(row[colVeiculo] || '').trim() : null,
          data_est_carreg: colDataCarreg ? parseExcelDate(row[colDataCarreg]) : null,
          tipo_operacao: colTipoOperacao ? String(row[colTipoOperacao] || '').trim() : null,
          preco: colPreco && row[colPreco] ? Number(row[colPreco]) : null,

          // 6 colunas manuais inicializadas zeradas / nulas para preenchimento no app
          sugestao_frete: null,
          status: 'Pendente',
          transportador: null,
          motorista: null,
          frete_combinado: null,
          obs: null,
          atualizado_por: null,
          atualizado_em: null,
          created_at: new Date().toISOString(),
        };

        itemsToInsert.push(newItem);
        countInseridos++;
      }

      const finalSummary: ImportSummary = {
        totalLidos: countLidos,
        inseridos: countInseridos,
        ignoradosExistentes: countExistentes,
        ignoradosForaEscopo: countForaEscopo,
        ignoradosDuplicadosArquivo: countDuplicadosArquivo,
        ignoradosDataAnterior: countDataAnterior,
        erros,
      };

      setSummary(finalSummary);
      onImportComplete(itemsToInsert, finalSummary);
      showSuccess(`Processamento concluído! ${countInseridos} novos itens importados.`);
    } catch (err: any) {
      showError(err.message || 'Falha ao processar arquivo do Excel.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <FileSpreadsheet className="h-6 w-6" />
            <DialogTitle className="text-xl font-bold">Importar ItensDePedido.xlsx</DialogTitle>
          </div>
          <DialogDescription>
            Envie a planilha bruta gerada pelo ERP. O app automatiza a limpeza, descarta produtos fora do escopo e insere apenas os novos registros.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-6 text-center hover:bg-emerald-50 transition-colors">
            <Upload className="h-10 w-10 mx-auto text-emerald-600 mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Selecione ou arraste o arquivo .xlsx
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-3">
              Somente formato .xlsx ou .xls do ERP
            </p>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label htmlFor="data-minima" className="text-slate-600 dark:text-slate-300 font-medium">
              Importar carregamentos a partir de:
            </label>
            <input
              id="data-minima"
              type="date"
              value={dataMinima}
              onChange={(e) => setDataMinima(e.target.value)}
              className="border rounded-md px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => setDataMinima('')}
              className="text-slate-500 hover:text-emerald-500 underline"
            >
              importar todas as datas
            </button>
          </div>

          {summary && (
            <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-3 text-xs border border-slate-800">
              <p className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Resumo do Processamento:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/80 p-2 rounded">
                  <span className="text-slate-400 block">Total de linhas lidas</span>
                  <span className="font-mono text-base font-bold">{summary.totalLidos}</span>
                </div>
                <div className="bg-emerald-950/80 border border-emerald-800/50 p-2 rounded">
                  <span className="text-emerald-300 block">Novas inseridas</span>
                  <span className="font-mono text-base font-bold text-emerald-400">
                    +{summary.inseridos}
                  </span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded">
                  <span className="text-slate-400 block">Ignoradas (já no banco)</span>
                  <span className="font-mono text-base font-bold text-amber-400">
                    {summary.ignoradosExistentes}
                  </span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded">
                  <span className="text-slate-400 block">Ignoradas (fora escopo)</span>
                  <span className="font-mono text-base font-bold text-rose-400">
                    {summary.ignoradosForaEscopo}
                  </span>
                </div>
              </div>

              {summary.ignoradosDataAnterior > 0 && (
                <p className="text-sky-300 text-[11px] flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  {summary.ignoradosDataAnterior} linhas ignoradas por carregamento anterior à data mínima.
                </p>
              )}

              {summary.ignoradosDuplicadosArquivo > 0 && (
                <p className="text-amber-300 text-[11px] flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  {summary.ignoradosDuplicadosArquivo} linhas com Cód.Item duplicado dentro da própria planilha foram ignoradas.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
            >
              Fechar
            </Button>
            <Button
              onClick={processFile}
              disabled={!file || processing}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {processing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Atualizar Banco de Dados
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};