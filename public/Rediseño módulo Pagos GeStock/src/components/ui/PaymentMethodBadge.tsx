import { CreditCard, ArrowRightLeft, Banknote } from 'lucide-react';

interface PaymentMethodBadgeProps {
  method: 'credito' | 'transferencia' | 'efectivo';
  size?: 'sm' | 'md';
}

export function PaymentMethodBadge({ method, size = 'md' }: PaymentMethodBadgeProps) {
  const getMethodConfig = () => {
    switch (method) {
      case 'credito':
        return {
          label: 'Crédito',
          icon: CreditCard,
          bgColor: '#FFF3E9',
          textColor: '#D97706'
        };
      case 'transferencia':
        return {
          label: 'Transferencia',
          icon: ArrowRightLeft,
          bgColor: '#EAF2FF',
          textColor: '#2563EB'
        };
      case 'efectivo':
        return {
          label: 'Efectivo',
          icon: Banknote,
          bgColor: '#EAF8EB',
          textColor: '#16A34A'
        };
    }
  };

  const config = getMethodConfig();
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg ${padding}`}
      style={{ backgroundColor: config.bgColor }}
    >
      <Icon className={iconSize} style={{ color: config.textColor }} />
      <span className={textSize} style={{ color: config.textColor }}>
        {config.label}
      </span>
    </div>
  );
}
