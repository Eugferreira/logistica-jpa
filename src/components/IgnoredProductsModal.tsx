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
import { Ban, Plus, Trash2, CheckCircle } from 'lucide-react';
import { ProdutoIgnorado } from '@/types/logistics';
import { showSuccess, showError } from '@/utils/toast';

interface IgnoredProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: ProdutoIgnorado[];
  onAddProduto: (nome: string) => void;
  onRemoveProduto: (id: string) => void;
}

export const IgnoredProductsModal: React.FC<IgnoredProductsModalProps> = ({
  open,
  onOpenChange,
  produtos,
  onAddProduto,
  onRemoveProduto,
}) => {
  const [novoProduto, setNovoProduto] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoProduto.trim()) return;

    if (
      produtos.some(
        (p) => p.produto.toLowerCase().trim() === novoProduto.toLowerCase().trim()
      )
    ) {
      showError('Este produto já está cadastrado na lista de exclusão.');
      return;
    }

    onAddProduto(novoProduto.trim());
    showSuccess(`"${novoProduto}" adicionado aos produtos ignorados.`);
    setNovoProduto('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <Ban className="h-6 w-6" />
            <DialogTitle className="text-xl font-bold">Produtos Fora do Escopo</DialogTitle>
          </div>
          <DialogDescription>
            Itens de pedido contendo estes produtos na planilha do ERP serão desconsiderados automaticamente durante a importação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              placeholder="Ex.: UREIA 46% ou Pacote Especial..."
              value={novoProduto}
              onChange={(e) => setNovoProduto(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="bg-rose-600 hover:bg-rose-500 text-white gap-1">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </form>

          <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
            {produtos.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                Nenhum produto cadastrado na lista de ignorados.
              </div>
            ) : (
              produtos.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 flex items-center justify-between text-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {p.produto}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onRemoveProduto(p.id);
                      showSuccess(`Produto "${p.produto}" removido.`);
                    }}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};