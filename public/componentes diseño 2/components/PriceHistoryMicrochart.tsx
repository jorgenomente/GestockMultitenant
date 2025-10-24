import { useState, useEffect } from 'react';

interface PricePoint {
  date: string;
  time?: string;
  price: number;
}

interface PriceHistoryMicrochartProps {
  data: PricePoint[];
  width?: number;
  height?: number;
}

export function PriceHistoryMicrochart({ 
  data, 
  width = 280, 
  height = 60 
}: PriceHistoryMicrochartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Trigger animation on mount
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);
  
  if (!data || data.length < 2) {
    return null;
  }

  // Take last 5 data points
  const chartData = data.slice(0, 5).reverse();
  
  // Calculate scales
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1; // Avoid division by zero
  
  const padding = { top: 8, right: 8, bottom: 8, left: 8 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Generate points for the line
  const points = chartData.map((d, i) => {
    const x = padding.left + (i / (chartData.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.price - minPrice) / priceRange) * chartHeight;
    return { x, y, data: d, index: i };
  });
  
  // Generate path string for the line
  const linePath = points.map((p, i) => {
    return `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`;
  }).join(' ');
  
  // Determine trend (comparing first and last price)
  const isAscending = chartData[chartData.length - 1].price > chartData[0].price;
  const isDescending = chartData[chartData.length - 1].price < chartData[0].price;
  
  return (
    <div 
      className="relative transition-opacity duration-300"
      style={{ opacity: mounted ? 1 : 0 }}
    >
      <svg 
        width={width} 
        height={height} 
        className="overflow-visible"
        style={{ display: 'block' }}
      >
        {/* Gradient for trend glow */}
        <defs>
          <linearGradient id="trendGradientAscending" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C1643B" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#C1643B" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="trendGradientDescending" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7DAA92" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#7DAA92" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        
        {/* Area fill under the line */}
        {(isAscending || isDescending) && (
          <path
            d={`${linePath} L ${points[points.length - 1].x},${height - padding.bottom} L ${padding.left},${height - padding.bottom} Z`}
            fill={isAscending ? 'url(#trendGradientAscending)' : 'url(#trendGradientDescending)'}
            opacity="0.8"
          />
        )}
        
        {/* Main line */}
        <path
          d={linePath}
          fill="none"
          stroke="#C1643B"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-draw-line"
        />
        
        {/* Data points */}
        {points.map((point, i) => (
          <g 
            key={i}
            style={{
              animation: `fadeIn 0.3s ease-out ${0.5 + i * 0.1}s both`
            }}
          >
            {/* Outer circle for hover area */}
            <circle
              cx={point.x}
              cy={point.y}
              r="10"
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(i)}
              onMouseLeave={() => setHoveredPoint(null)}
              onTouchStart={() => setHoveredPoint(i)}
            />
            
            {/* Visible dot */}
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredPoint === i ? "4" : "3"}
              fill="#F5F5F2"
              stroke="#C1643B"
              strokeWidth="2"
              className="transition-all duration-150 pointer-events-none"
              style={{
                filter: hoveredPoint === i ? 'drop-shadow(0 2px 4px rgba(193, 100, 59, 0.3))' : 'none',
              }}
            />
          </g>
        ))}
      </svg>
      
      {/* Tooltip */}
      {hoveredPoint !== null && (
        <div
          className="absolute z-50 px-2.5 py-1.5 rounded-lg border transition-all duration-150"
          style={{
            backgroundColor: '#F5F5F2',
            borderColor: '#E9E3D0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            left: `${points[hoveredPoint].x}px`,
            top: `${points[hoveredPoint].y - 45}px`,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}
        >
          <p 
            className="text-xs m-0 mb-0.5" 
            style={{ 
              fontFamily: 'var(--font-family-mono)', 
              color: 'rgba(31, 31, 31, 0.7)',
              whiteSpace: 'nowrap',
            }}
          >
            {chartData[hoveredPoint].date}
            {chartData[hoveredPoint].time && ` · ${chartData[hoveredPoint].time}`}
          </p>
          <p 
            className="text-sm m-0 tabular-nums" 
            style={{ 
              fontFamily: 'var(--font-family-heading)', 
              fontWeight: 600,
              color: '#C1643B',
            }}
          >
            ${chartData[hoveredPoint].price.toFixed(2)}
          </p>
          
          {/* Tooltip arrow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1"
            style={{
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid #E9E3D0',
            }}
          />
        </div>
      )}
      
      {/* Date labels below chart */}
      <div className="flex justify-between mt-1 px-2">
        <span 
          className="text-[9px]" 
          style={{ 
            fontFamily: 'var(--font-family-mono)', 
            color: 'rgba(31, 31, 31, 0.5)' 
          }}
        >
          {chartData[0].date}
        </span>
        <span 
          className="text-[9px]" 
          style={{ 
            fontFamily: 'var(--font-family-mono)', 
            color: 'rgba(31, 31, 31, 0.5)' 
          }}
        >
          {chartData[chartData.length - 1].date}
        </span>
      </div>
    </div>
  );
}
