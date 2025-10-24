import { DollarSign, TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const weeklyBudget = [
  { week: 'Semana 1', budget: 12600, spent: 11200, remaining: 1400, variation: -8.2 },
  { week: 'Semana 2', budget: 12600, spent: 8450, remaining: 4150, variation: 12.5 },
  { week: 'Semana 3', budget: 12600, spent: 13100, remaining: -500, variation: -15.8 },
  { week: 'Semana 4', budget: 12600, spent: 9800, remaining: 2800, variation: 6.3 },
];

const categorySpending = [
  { name: 'Verduras', value: 2800, color: '#7DAA92' },
  { name: 'Lácteos', value: 2100, color: '#A9CDB6' },
  { name: 'Panadería', value: 1500, color: '#7292B2' },
  { name: 'Frutas', value: 1250, color: '#8EA68B' },
  { name: 'Cereales', value: 800, color: '#4B5B53' },
];

const monthlyComparison = [
  { month: 'Julio', amount: 42000 },
  { month: 'Agosto', amount: 45500 },
  { month: 'Septiembre', amount: 48200 },
  { month: 'Octubre', amount: 44300 },
];

export function Budget() {
  const currentWeek = weeklyBudget[1];
  const budgetPercentage = (currentWeek.spent / currentWeek.budget) * 100;
  const monthlyTotal = monthlyComparison[monthlyComparison.length - 1].amount;
  const previousMonth = monthlyComparison[monthlyComparison.length - 2].amount;
  const monthlyChange = ((monthlyTotal - previousMonth) / previousMonth) * 100;
  
  // Calculate threshold for warning (80% of budget)
  const warningThreshold = 80;
  const isNearThreshold = budgetPercentage >= warningThreshold;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'var(--font-family-heading)', marginBottom: '0.5rem' }}>
            Presupuesto
          </h1>
          <p className="text-muted-foreground m-0">
            Controla tus gastos y optimiza tu capital de trabajo
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            className="h-10 rounded-lg transition-all duration-150 hover:bg-[#3A4A42]"
            style={{
              borderColor: 'rgba(169, 205, 182, 0.3)',
              color: '#A9CDB6',
            }}
          >
            Ver Histórico
          </Button>
          <Button className="gestock-btn-secondary gap-2 rounded-xl h-11">
            Ajustar Límites
          </Button>
        </div>
      </div>

      {/* Current Week Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card 
          className="gestock-shadow transition-all duration-150 hover:shadow-lg"
          style={{
            borderRadius: '12px',
            border: '1px solid rgba(114, 146, 178, 0.2)',
          }}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(114, 146, 178, 0.15)' }}
              >
                <DollarSign className="h-6 w-6" style={{ color: '#7292B2' }} />
              </div>
              <div>
                <div className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
                  Presupuesto Semanal
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-2xl)', color: '#7292B2' }}>
                  ${currentWeek.budget.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="gestock-shadow transition-all duration-150 hover:shadow-lg"
          style={{
            borderRadius: '12px',
            border: '1px solid rgba(125, 170, 146, 0.2)',
          }}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(125, 170, 146, 0.15)' }}
              >
                <TrendingUp className="h-6 w-6" style={{ color: '#7DAA92' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
                    Gastado
                  </span>
                  {currentWeek.variation !== undefined && (
                    <div 
                      className="flex items-center gap-1 px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: currentWeek.variation > 0 ? 'rgba(193, 100, 59, 0.1)' : 'rgba(125, 170, 146, 0.1)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        color: currentWeek.variation > 0 ? '#C1643B' : '#7DAA92',
                      }}
                    >
                      {currentWeek.variation > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(currentWeek.variation).toFixed(1)}%
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-2xl)', color: '#7DAA92' }}>
                  ${currentWeek.spent.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="gestock-shadow transition-all duration-150 hover:shadow-lg"
          style={{
            borderRadius: '12px',
            border: currentWeek.remaining < 0 
              ? '1px solid rgba(193, 100, 59, 0.3)' 
              : '1px solid rgba(169, 205, 182, 0.2)',
            backgroundColor: currentWeek.remaining < 0 
              ? 'rgba(193, 100, 59, 0.05)' 
              : 'transparent',
          }}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ 
                  backgroundColor: currentWeek.remaining < 0 
                    ? 'rgba(193, 100, 59, 0.15)' 
                    : 'rgba(169, 205, 182, 0.15)' 
                }}
              >
                <Calendar 
                  className="h-6 w-6" 
                  style={{ color: currentWeek.remaining < 0 ? '#C1643B' : '#A9CDB6' }} 
                />
              </div>
              <div>
                <div className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
                  {currentWeek.remaining < 0 ? 'Excedido' : 'Disponible'}
                </div>
                <div 
                  style={{ 
                    fontFamily: 'var(--font-family-heading)', 
                    fontSize: 'var(--text-2xl)',
                    color: currentWeek.remaining < 0 ? '#C1643B' : '#A9CDB6'
                  }}
                >
                  ${Math.abs(currentWeek.remaining).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar with Threshold Marker */}
      <Card 
        className="gestock-shadow"
        style={{
          borderRadius: '12px',
          border: isNearThreshold 
            ? '1px solid rgba(193, 100, 59, 0.3)' 
            : '1px solid rgba(75, 91, 83, 0.15)',
          backgroundColor: isNearThreshold ? 'rgba(193, 100, 59, 0.03)' : 'transparent',
        }}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="m-0 mb-1" style={{ fontFamily: 'var(--font-family-heading)', color: '#F5F5F2' }}>
                Uso del Presupuesto - Semana Actual
              </h3>
              <p className="text-muted-foreground m-0" style={{ fontSize: 'var(--text-sm)' }}>
                {budgetPercentage.toFixed(1)}% utilizado
                {isNearThreshold && (
                  <span style={{ color: '#C1643B', marginLeft: '8px', fontWeight: 600 }}>
                    • Acercándose al límite
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <div style={{ fontFamily: 'var(--font-family-mono)', color: '#7292B2' }}>
                ${currentWeek.spent.toLocaleString()} / ${currentWeek.budget.toLocaleString()}
              </div>
            </div>
          </div>
          
          {/* Progress bar with threshold marker */}
          <div className="relative">
            <div className="relative w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(75, 91, 83, 0.2)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(budgetPercentage, 100)}%`,
                  backgroundColor: budgetPercentage >= 100 
                    ? '#C1643B' 
                    : budgetPercentage >= warningThreshold 
                      ? '#E9A668' 
                      : '#7292B2',
                }}
              />
            </div>
            
            {/* Threshold marker at 80% */}
            <div 
              className="absolute top-0 h-3 w-0.5"
              style={{
                left: `${warningThreshold}%`,
                backgroundColor: '#C1643B',
                opacity: 0.5,
              }}
            />
            <div 
              className="absolute -top-5 text-xs"
              style={{
                left: `${warningThreshold}%`,
                transform: 'translateX(-50%)',
                color: '#C1643B',
                fontFamily: 'var(--font-family-mono)',
                fontSize: 'var(--text-xs)',
              }}
            >
              {warningThreshold}%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Budget Comparison */}
        <Card 
          className="gestock-shadow"
          style={{
            borderRadius: '12px',
            border: '1px solid rgba(75, 91, 83, 0.15)',
          }}
        >
          <CardHeader>
            <CardTitle style={{ fontFamily: 'var(--font-family-heading)', color: '#F5F5F2' }}>
              Presupuesto por Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyBudget}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 91, 83, 0.2)" />
                <XAxis 
                  dataKey="week" 
                  style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px', fill: '#B9BBB8' }}
                  stroke="#4B5B53"
                />
                <YAxis 
                  style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px', fill: '#B9BBB8' }}
                  stroke="#4B5B53"
                />
                <Tooltip 
                  contentStyle={{ 
                    fontFamily: 'var(--font-family-body)',
                    borderRadius: '10px',
                    border: '1px solid rgba(75, 91, 83, 0.3)',
                    backgroundColor: '#2C3A33',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    color: '#F5F5F2',
                  }}
                  cursor={{ fill: 'rgba(114, 146, 178, 0.1)' }}
                />
                <Bar dataKey="budget" fill="#7292B2" name="Presupuesto" radius={[6, 6, 0, 0]} />
                <Bar dataKey="spent" fill="#7DAA92" name="Gastado" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Spending */}
        <Card 
          className="gestock-shadow"
          style={{
            borderRadius: '12px',
            border: '1px solid rgba(75, 91, 83, 0.15)',
          }}
        >
          <CardHeader>
            <CardTitle style={{ fontFamily: 'var(--font-family-heading)', color: '#F5F5F2' }}>
              Distribución por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categorySpending}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={(entry) => `${entry.name}: $${entry.value}`}
                  labelStyle={{ fontSize: '12px', fontFamily: 'var(--font-family-body)', fill: '#F5F5F2' }}
                >
                  {categorySpending.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    fontFamily: 'var(--font-family-body)',
                    borderRadius: '10px',
                    border: '1px solid rgba(75, 91, 83, 0.3)',
                    backgroundColor: '#2C3A33',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    color: '#F5F5F2',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Comparison */}
      <Card 
        className="gestock-shadow"
        style={{
          borderRadius: '12px',
          border: '1px solid rgba(75, 91, 83, 0.15)',
        }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle style={{ fontFamily: 'var(--font-family-heading)', color: '#F5F5F2' }}>
              Comparación Mensual
            </CardTitle>
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                backgroundColor: monthlyChange > 0 
                  ? 'rgba(193, 100, 59, 0.1)' 
                  : 'rgba(125, 170, 146, 0.1)',
              }}
            >
              {monthlyChange > 0 ? (
                <TrendingUp className="h-5 w-5" style={{ color: '#C1643B' }} />
              ) : (
                <TrendingDown className="h-5 w-5" style={{ color: '#7DAA92' }} />
              )}
              <span 
                style={{ 
                  color: monthlyChange > 0 ? '#C1643B' : '#7DAA92',
                  fontFamily: 'var(--font-family-mono)',
                  fontWeight: 600,
                }}
              >
                {Math.abs(monthlyChange).toFixed(1)}%
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 91, 83, 0.2)" />
              <XAxis 
                dataKey="month" 
                style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px', fill: '#B9BBB8' }}
                stroke="#4B5B53"
              />
              <YAxis 
                style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px', fill: '#B9BBB8' }}
                stroke="#4B5B53"
              />
              <Tooltip 
                contentStyle={{ 
                  fontFamily: 'var(--font-family-body)',
                  borderRadius: '10px',
                  border: '1px solid rgba(75, 91, 83, 0.3)',
                  backgroundColor: '#2C3A33',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  color: '#F5F5F2',
                }}
                cursor={{ fill: 'rgba(114, 146, 178, 0.1)' }}
              />
              <Bar dataKey="amount" fill="#7292B2" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
