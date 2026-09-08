import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Botão que alterna entre modo claro e escuro.
// O next-themes guarda a escolha no navegador e aplica a classe "dark" no <html>,
// que é o que o Tailwind usa para as classes "dark:...".
export const ThemeToggle: React.FC = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs gap-1.5"
      title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5 text-amber-300" />
      ) : (
        <Moon className="h-3.5 w-3.5 text-sky-300" />
      )}
      {isDark ? 'Claro' : 'Escuro'}
    </Button>
  );
};
