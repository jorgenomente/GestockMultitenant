import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface DateSelectorProps {
  week?: number;
  month?: string;
  year?: number;
}

export function DateSelector({ 
  week = 43, 
  month = 'Octubre', 
  year = 2025 
}: DateSelectorProps) {
  return (
    <div className="flex items-center justify-between px-8 py-4 bg-[#E9E3D0]/30 border-b border-[#DAD7CD]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#2C3A33]" />
          <span 
            className="text-[#2C3A33]"
            style={{ 
              fontFamily: 'var(--font-family-heading)', 
              fontSize: '0.9375rem',
              fontWeight: 600
            }}
          >
            Semana {week}
          </span>
          <span 
            className="text-muted-foreground"
            style={{ 
              fontFamily: 'var(--font-family-body)', 
              fontSize: '0.875rem'
            }}
          >
            / {month} {year}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="h-8 px-3"
          style={{ fontSize: '0.8125rem' }}
        >
          Hoy
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
