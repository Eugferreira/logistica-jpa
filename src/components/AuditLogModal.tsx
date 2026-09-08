import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { History, User, Clock, ArrowRight } from 'lucide-react';
import { ItemPedidoLog } from '@/types/logistics';
import { formatDateTimeBR } from '@/utils/formatters';

interface AuditLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: ItemPedidoLog[];
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ open, onOpenChange, logs }) => {
  const getFieldLabel = (field: string) => {
    const map: Record<string, string> = {
      sugestao_frete: 'Sugestão de Frete',
      status: 'Status',
      transportador: 'Transportador',
      motorista: 'Motorista',
      frete_combinado: 'Frete Combinado',
      obs: 'Observação (OBS)',
    };
    return map[field] || field;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <History className="h-6 w-6" />
            <DialogTitle className="text-xl font-bold">Histórico de Auditoria de Fretes</DialogTitle>
          </div>
          <DialogDescription>
            Registro de auditoria automática do banco de dados para alterações manuais de negociação e pagamento com transportadores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Nenhuma alteração manual registrada até o momento.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <User className="h-3.5 w-3.5 text-emerald-600" />
                    {log.usuario_nome || log.usuario_email || 'Usuário do Sistema'}
                  </span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="h-3 w-3" />
                    {formatDateTimeBR(log.data)}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-300 font-semibold">
                    {getFieldLabel(log.campo_alterado)}
                  </Badge>

                  <div className="flex items-center gap-1.5 font-mono text-slate-800 dark:text-slate-200">
                    <span className="text-slate-400 line-through bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {log.valor_antigo || 'vazio'}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                      {log.valor_novo || 'vazio'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};