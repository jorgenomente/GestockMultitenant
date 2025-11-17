import { FileText, FileCheck, FileX, ShoppingBag } from 'lucide-react';

interface DocumentIconProps {
  type: 'factura' | 'remito' | 'nota-credito' | 'compra-local';
  size?: 'sm' | 'md' | 'lg';
}

export function DocumentIcon({ type, size = 'md' }: DocumentIconProps) {
  const getIconConfig = () => {
    switch (type) {
      case 'factura':
        return {
          icon: FileText,
          bgColor: '#EAF2FF',
          iconColor: '#4A90E2'
        };
      case 'remito':
        return {
          icon: FileCheck,
          bgColor: '#EAF8EB',
          iconColor: '#16A34A'
        };
      case 'nota-credito':
        return {
          icon: FileX,
          bgColor: '#FEF2F2',
          iconColor: '#DC2626'
        };
      case 'compra-local':
        return {
          icon: ShoppingBag,
          bgColor: '#FFF3E9',
          iconColor: '#D97706'
        };
    }
  };

  const config = getIconConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: { container: 'w-10 h-10', icon: 'w-5 h-5' },
    md: { container: 'w-12 h-12', icon: 'w-6 h-6' },
    lg: { container: 'w-16 h-16', icon: 'w-8 h-8' }
  };

  const { container, icon } = sizeClasses[size];

  return (
    <div
      className={`${container} rounded-lg flex items-center justify-center`}
      style={{ backgroundColor: config.bgColor }}
    >
      <Icon className={icon} style={{ color: config.iconColor }} strokeWidth={2} />
    </div>
  );
}
