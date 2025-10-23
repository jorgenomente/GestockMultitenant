import { cn } from './ui/utils';

interface StatusChipProps {
  status: 'pending' | 'ordered' | 'received' | 'paid' | 'urgent' | 'warning' | 'normal';
  label: string;
}

const statusStyles = {
  pending: 'bg-[#E6DDC5] text-[#47685C]',
  ordered: 'bg-[#47685C]/20 text-[#47685C]',
  received: 'bg-[#A9C9A4]/30 text-[#47685C]',
  paid: 'bg-[#A9C9A4] text-[#1F1F1F]',
  urgent: 'bg-[#C1643B] text-[#FAFAF9]',
  warning: 'bg-[#C1643B]/20 text-[#B85535]',
  normal: 'bg-[#5A8070]/15 text-[#47685C]',
};

export function StatusChip({ status, label }: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full',
        statusStyles[status]
      )}
      style={{ 
        fontFamily: 'var(--font-family-body)', 
        fontSize: 'var(--text-xs)',
        fontWeight: 500
      }}
    >
      {label}
    </span>
  );
}
