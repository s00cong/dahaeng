import { type LucideIcon } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { TagChip } from '@/components/preference/TagChip';

export interface TagOption {
  id: number;
  name: string;
}

interface TagCategorySectionProps {
  category: string;
  icon: LucideIcon;
  tags: TagOption[];
  selectedTagIds: number[];
  onToggle: (id: number) => void;
}

const chipListVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const chipItemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};

export function TagCategorySection({
  category,
  icon: Icon,
  tags,
  selectedTagIds,
  onToggle,
}: TagCategorySectionProps) {
  return (
    <section aria-label={`${category} 카테고리`} className="flex flex-col gap-3">
      {/* Category header */}
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-blue-400 shrink-0" aria-hidden="true" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {category}
        </h3>
      </div>

      {/* Tag chips */}
      <motion.div
        className="flex flex-wrap gap-2"
        variants={chipListVariants}
        initial="hidden"
        animate="visible"
        role="group"
        aria-label={`${category} 태그 목록`}
      >
        {tags.map((tag) => (
          <motion.div key={tag.id} variants={chipItemVariants}>
            <TagChip
              label={tag.name}
              selected={selectedTagIds.includes(tag.id)}
              onToggle={() => onToggle(tag.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
