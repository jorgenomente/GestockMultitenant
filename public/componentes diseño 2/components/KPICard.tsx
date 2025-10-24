import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
}

export function KPICard({ title, value, change, changeType = 'neutral', icon: Icon }: KPICardProps) {
  const changeColors = {
    positive: 'text-[#A9C9A4]',
    negative: 'text-[#C1643B]',
    neutral: 'text-[#5A8070]',
  };

  const iconColors = {
    positive: { bg: 'bg-[#A9C9A4]/15', icon: 'text-[#5A8070]' },
    negative: { bg: 'bg-[#C1643B]/15', icon: 'text-[#C1643B]' },
    neutral: { bg: 'bg-[#47685C]/8', icon: 'text-[#47685C]' },
  };

  return (
    <Card className="gestock-shadow gestock-hover-shadow border-l-4 border-l-[#47685C] rounded-xl md:p-6 p-4" style={{ backgroundColor: '#FAFAF9' }}>
      <CardContent className="md:p-6 p-0">
        <div className="flex items-start justify-between md:mb-4 mb-3">
          <div 
            className="md:text-[11px] text-[10px]"
            style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: '#5A8070',
              textTransform: 'uppercase'
            }}
          >
            {title}
          </div>
          <div className={`md:w-10 md:h-10 w-8 h-8 rounded-lg flex items-center justify-center ${iconColors[changeType].bg}`}>
            <Icon className={`md:h-5 md:w-5 h-4 w-4 ${iconColors[changeType].icon}`} strokeWidth={1.5} />
          </div>
        </div>
        
        <div className="space-y-2">
          <div 
            className="md:text-[2rem] text-[1.5rem]"
            style={{ 
              fontFamily: 'var(--font-family-heading)', 
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: '#1F1F1F'
            }}
          >
            {value}
          </div>
          
          {change && (
            <div className="pt-2 border-t" style={{ borderColor: '#E6DDC5' }}>
              <div 
                className={`${changeColors[changeType]} md:text-[13px] text-[12px]`}
                style={{ 
                  fontFamily: 'var(--font-family-body)', 
                  fontWeight: 500
                }}
              >
                {change}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
