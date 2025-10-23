import { DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const weeklyBudget = [
  { week: 'Semana 1', budget: 12600, spent: 11200, remaining: 1400 },
  { week: 'Semana 2', budget: 12600, spent: 8450, remaining: 4150 },
  { week: 'Semana 3', budget: 12600, spent: 13100, remaining: -500 },
  { week: 'Semana 4', budget: 12600, spent: 9800, remaining: 2800 },
];

const categorySpending = [
  { name: 'Verduras', value: 2800, color: '#3BA275' },
  { name: 'Lácteos', value: 2100, color: '#8EA68B' },
  { name: 'Panadería', value: 1500, color: '#2C3A33' },
  { name: 'Frutas', value: 1250, color: '#E9E3D0' },
  { name: 'Cereales', value: 800, color: '#C07953' },
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
        <div className="flex gap-2">
          <Button variant="outline">Ver Histórico</Button>
          <Button className="gap-2 bg-accent hover:bg-accent/90">
            Ajustar Límites
          </Button>
        </div>
      </div>

      {/* Current Week Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="gestock-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
                  Presupuesto Semanal
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-2xl)' }}>
                  ${currentWeek.budget.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gestock-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <div>
                <div className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
                  Gastado
                </div>
                <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-2xl)' }}>
                  ${currentWeek.spent.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gestock-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#A3D4A4]/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-[#3BA275]" />
              </div>
              <div>
                <div className="text-muted-foreground mb-1" style={{ fontSize: 'var(--text-sm)' }}>
                  Disponible
                </div>
                <div className="text-[#3BA275]" style={{ fontFamily: 'var(--font-family-heading)', fontSize: 'var(--text-2xl)' }}>
                  ${currentWeek.remaining.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="gestock-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="m-0 mb-1" style={{ fontFamily: 'var(--font-family-heading)' }}>
                Uso del Presupuesto - Semana Actual
              </h3>
              <p className="text-muted-foreground m-0" style={{ fontSize: 'var(--text-sm)' }}>
                {budgetPercentage.toFixed(1)}% utilizado
              </p>
            </div>
            <div className="text-right">
              <div style={{ fontFamily: 'var(--font-family-mono)' }}>
                ${currentWeek.spent.toLocaleString()} / ${currentWeek.budget.toLocaleString()}
              </div>
            </div>
          </div>
          <Progress value={budgetPercentage} className="h-3" />
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Budget Comparison */}
        <Card className="gestock-shadow">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'var(--font-family-heading)' }}>
              Presupuesto por Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyBudget}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DAD7CD" />
                <XAxis 
                  dataKey="week" 
                  style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px' }}
                />
                <YAxis 
                  style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    fontFamily: 'var(--font-family-body)',
                    borderRadius: '8px',
                    border: '1px solid #DAD7CD'
                  }}
                />
                <Bar dataKey="budget" fill="#8EA68B" name="Presupuesto" radius={[8, 8, 0, 0]} />
                <Bar dataKey="spent" fill="#3BA275" name="Gastado" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Spending */}
        <Card className="gestock-shadow">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'var(--font-family-heading)' }}>
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
                  labelStyle={{ fontSize: '12px', fontFamily: 'var(--font-family-body)' }}
                >
                  {categorySpending.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    fontFamily: 'var(--font-family-body)',
                    borderRadius: '8px',
                    border: '1px solid #DAD7CD'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Comparison */}
      <Card className="gestock-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle style={{ fontFamily: 'var(--font-family-heading)' }}>
              Comparación Mensual
            </CardTitle>
            <div className="flex items-center gap-2">
              {monthlyChange > 0 ? (
                <TrendingUp className="h-5 w-5 text-[#C07953]" />
              ) : (
                <TrendingDown className="h-5 w-5 text-[#A3D4A4]" />
              )}
              <span className={monthlyChange > 0 ? 'text-[#C07953]' : 'text-[#A3D4A4]'}>
                {Math.abs(monthlyChange).toFixed(1)}%
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DAD7CD" />
              <XAxis 
                dataKey="month" 
                style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px' }}
              />
              <YAxis 
                style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  fontFamily: 'var(--font-family-body)',
                  borderRadius: '8px',
                  border: '1px solid #DAD7CD'
                }}
              />
              <Bar dataKey="amount" fill="#2C3A33" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
