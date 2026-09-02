import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper padrão do shadcn/ui. `clsx` resolve condicionais e arrays;
// `twMerge` desempata classes do Tailwind que brigam pela mesma
// propriedade (px-2 vs px-4), ficando com a última — sem ele, a prop
// `className` de um componente não conseguiria sobrescrever o default
// dele, que é o mecanismo em que todo componente do shadcn se apoia.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
