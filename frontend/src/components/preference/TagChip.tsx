import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
}

export function TagChip({ label, selected, onToggle }: TagChipProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.93 }}
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      aria-pressed={selected}
      aria-label={`${label} 태그 ${selected ? '선택됨' : '선택 안됨'}`}
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium',
        'border transition-colors duration-200 cursor-pointer select-none',
        selected
          ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-900/40'
          : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400 hover:text-slate-100',
      )}
    >
      {selected && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center"
        >
          <Check className="size-3.5" aria-hidden="true" />
        </motion.span>
      )}
      {label}
    </motion.button>
  );
}
