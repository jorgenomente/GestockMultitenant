import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface CompactKPICardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  icon: LucideIcon;
  accentColor?: string;
}

export function CompactKPICard({ 
  title, 
  value, 
  trend,
  icon: Icon,
  accentColor = '#7DAA92'
}: CompactKPICardProps) {
  const trendColors = {
    up: '#7DAA92',
    down: '#C1643B',
    neutral: '#7394B0',
  };

  return (
    <div 
      className="flex-shrink-0 w-[160px] rounded-xl p-3.5 border"
      style={{ 
        animation: 'fadeInUp 0.3s ease-out',
        backgroundColor: '#3C4A44',
        borderColor: '#4B5B53',
      }}
    >
      <div className="flex items-start justify-between mb-2.5">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center" 
          style={{ 
            backgroundColor: `${accentColor}30` 
          }}
        >
          <Icon className="h-4 w-4" style={{ color: accentColor }} strokeWidth={2} />
        </div>
        {trend && (
          <div className="flex items-center gap-0.5">
            {trend.direction === 'up' && <TrendingUp className="w-3 h-3" style={{ color: trendColors.up }} strokeWidth={2.5} />}
            {trend.direction === 'down' && <TrendingDown className="w-3 h-3" style={{ color: trendColors.down }} strokeWidth={2.5} />}
            <span 
              className="text-[10px] tabular-nums" 
              style={{ 
                color: trendColors[trend.direction], 
                fontFamily: 'var(--font-family-mono)',
                fontWeight: 600
              }}
            >
              {trend.value}
            </span>
          </div>
        )}
      </div>
      
      <div className="mb-1.5">
        <div 
          className="text-[1.75rem] leading-none mb-0 tabular-nums"
          style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#F5F5F2'
          }}
        >
          {value}
        </div>
      </div>
      
      <div 
        className="text-[11px] leading-tight"
        style={{ 
          fontFamily: 'var(--font-family-body)', 
          color: '#E9E3D0',
          opacity: 0.9
        }}
      >
        {title}
      </div>
    </div>
  );
}
