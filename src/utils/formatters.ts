/**
 * Normaliza um texto para comparação robusta.
 * Remove acentos, pontuações especiais, transforma em caixa baixa e colapsa múltiplos espaços em um único espaço.
 * Exemplo: "05 - 25 - 25 " e " 05-25-25" -> "05-25-25"
 */
export function normalizeProductName(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, ' ') // colapsa múltiplos espaços
    .trim();
}

/**
 * Formata um valor numérico para Moeda Brasileira (R$)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata peso em KG para milhar com sufixo (ex: 32.000 kg)
 */
export function formatWeight(kg: number | null | undefined): string {
  if (kg === null || kg === undefined || isNaN(kg)) return '-';
  return new Intl.NumberFormat('pt-BR').format(kg) + ' kg';
}

/**
 * Formata data no padrão brasileiro DD/MM/AAAA
 */
export function formatDateBR(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  // Trata formato YYYY-MM-DD sem fuso horário
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }

  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Formata data e hora para exibição na auditoria DD/MM/AAAA HH:mm
 */
export function formatDateTimeBR(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}
