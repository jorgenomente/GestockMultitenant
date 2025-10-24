# GeStock Component Showcase
### Visual Reference Guide for the Natural Data Design System

---

## 🎨 Color Usage Examples

### Primary Actions
```tsx
// Primary Button - Leaf Green
<Button style={{ 
  backgroundColor: '#47685C', 
  color: '#F5F5F2',
  borderRadius: '8px'
}}>
  Nuevo Pedido
</Button>

// Hover State
<Button style={{ 
  backgroundColor: '#3A5349', 
  color: '#F5F5F2'
}}>
  Nuevo Pedido (Hover)
</Button>
```

### Secondary Actions
```tsx
// Secondary Button - Petroleum Blue Outline
<Button variant="outline" style={{ 
  borderColor: '#2C4653',
  color: '#2C4653',
  borderRadius: '8px'
}}>
  Cancelar
</Button>
```

### Accent Actions
```tsx
// Accent Button - Soft Lime
<Button style={{ 
  backgroundColor: '#A9C9A4',
  color: '#1F1F1F',
  borderRadius: '8px'
}}>
  Confirmar
</Button>
```

---

## 📦 Card Variations

### Standard Card (Bone White)
```tsx
<Card 
  className="rounded-xl gestock-shadow" 
  style={{ backgroundColor: '#FAFAF9' }}
>
  <CardHeader>
    <CardTitle style={{ color: '#1F1F1F' }}>
      Card Title
    </CardTitle>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

### Chart Card (Light Sand)
```tsx
<Card 
  className="rounded-xl gestock-shadow" 
  style={{ backgroundColor: '#E6DDC5' }}
>
  <CardHeader>
    <CardTitle style={{ color: '#1F1F1F' }}>
      Compras Semanales
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Chart component */}
  </CardContent>
</Card>
```

---

## 🏷️ Status Chips

### Paid / Success
```tsx
<StatusChip 
  status="paid" 
  label="Pagado" 
  // Background: #A9C9A4, Text: #1F1F1F
/>
```

### Warning
```tsx
<StatusChip 
  status="warning" 
  label="Atención" 
  // Background: rgba(193, 100, 59, 0.2), Text: #B85535
/>
```

### Urgent / Alert
```tsx
<StatusChip 
  status="urgent" 
  label="Urgente" 
  // Background: #C1643B, Text: #FAFAF9
/>
```

### Pending
```tsx
<StatusChip 
  status="pending" 
  label="Pendiente" 
  // Background: #E6DDC5, Text: #47685C
/>
```

### Normal / Default
```tsx
<StatusChip 
  status="normal" 
  label="Normal" 
  // Background: rgba(90, 128, 112, 0.15), Text: #47685C
/>
```

---

## 📊 KPI Card Configurations

### Positive State (Growth)
```tsx
<KPICard
  title="Total Proveedores"
  value="32"
  change="+4 este mes"
  changeType="positive"
  icon={Users}
  // Icon background: rgba(169, 201, 164, 0.15)
  // Icon color: #5A8070
  // Change text: #A9C9A4
/>
```

### Negative State (Alert)
```tsx
<KPICard
  title="Stock Crítico"
  value="8"
  change="2 productos urgentes"
  changeType="negative"
  icon={AlertTriangle}
  // Icon background: rgba(193, 100, 59, 0.15)
  // Icon color: #C1643B
  // Change text: #C1643B
/>
```

### Neutral State (Information)
```tsx
<KPICard
  title="Pedidos Abiertos"
  value="18"
  change="6 pendientes"
  changeType="neutral"
  icon={ShoppingCart}
  // Icon background: rgba(71, 104, 92, 0.08)
  // Icon color: #47685C
  // Change text: #5A8070
/>
```

---

## 🔤 Typography Hierarchy

### Heading 1 (Page Title)
```tsx
<h1 style={{
  fontFamily: 'var(--font-family-heading)',
  fontSize: '1.75rem',
  fontWeight: 600,
  color: '#1F1F1F',
  letterSpacing: '-0.02em'
}}>
  Dashboard
</h1>
```

### Heading 2 (Section Title)
```tsx
<h2 style={{
  fontFamily: 'var(--font-family-heading)',
  fontSize: '1.375rem',
  fontWeight: 600,
  color: '#1F1F1F',
  letterSpacing: '-0.01em'
}}>
  Proveedores Activos
</h2>
```

### Body Text
```tsx
<p style={{
  fontFamily: 'var(--font-family-body)',
  fontSize: '0.9375rem',
  color: '#5A8070'
}}>
  Bienvenida, María. Aquí está tu resumen operativo.
</p>
```

### Label / Caption
```tsx
<label style={{
  fontFamily: 'var(--font-family-body)',
  fontSize: '0.6875rem',
  fontWeight: 600,
  letterSpacing: '0.05em',
  color: '#5A8070',
  textTransform: 'uppercase'
}}>
  Total Proveedores
</label>
```

### Data / Metrics (Monospace)
```tsx
<span style={{
  fontFamily: 'var(--font-family-mono)',
  fontSize: '2rem',
  fontWeight: 700,
  lineHeight: 1,
  letterSpacing: '-0.02em',
  color: '#1F1F1F'
}}>
  $24,580
</span>
```

---

## 🎯 Input Fields

### Standard Input
```tsx
<Input
  placeholder="Buscar productos..."
  className="rounded-lg border-[#D8D8D3] focus:border-[#47685C]"
  style={{ 
    backgroundColor: '#FAFAF9',
    color: '#1F1F1F',
    fontSize: '0.875rem'
  }}
/>
```

### Input with Icon
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5A8070]" />
  <Input
    placeholder="Buscar productos, proveedores..."
    className="pl-10 rounded-lg border-[#D8D8D3] focus:border-[#47685C]"
    style={{ 
      backgroundColor: '#F5F5F2',
      color: '#1F1F1F'
    }}
  />
</div>
```

---

## 🧭 Navigation Components

### Sidebar Navigation Item (Active)
```tsx
<Button
  className="w-full justify-start gap-3 bg-[#47685C] text-[#F5F5F2] border-l-2 border-l-[#A9C9A4] rounded-l-none"
  style={{
    fontFamily: 'var(--font-family-body)',
    fontSize: '0.875rem',
    fontWeight: 600
  }}
>
  <Package className="h-5 w-5" strokeWidth={2} />
  <span>Stock</span>
</Button>
```

### Sidebar Navigation Item (Inactive)
```tsx
<Button
  variant="ghost"
  className="w-full justify-start gap-3 text-[#F5F5F2]/70 hover:text-[#F5F5F2] hover:bg-[#3D5B6B]"
  style={{
    fontFamily: 'var(--font-family-body)',
    fontSize: '0.875rem',
    fontWeight: 500
  }}
>
  <Users className="h-5 w-5" strokeWidth={1.5} />
  <span>Proveedores</span>
</Button>
```

---

## 📈 Chart Styling

### Bar Chart
```tsx
<BarChart data={purchaseData}>
  <CartesianGrid 
    strokeDasharray="3 3" 
    stroke="#D8D8D3" 
    vertical={false} 
  />
  <XAxis 
    dataKey="day" 
    axisLine={false}
    tickLine={false}
    style={{ 
      fontFamily: 'var(--font-family-mono)', 
      fontSize: '11px', 
      fill: '#5A8070' 
    }}
  />
  <YAxis 
    axisLine={false}
    tickLine={false}
    style={{ 
      fontFamily: 'var(--font-family-mono)', 
      fontSize: '11px', 
      fill: '#5A8070' 
    }}
  />
  <Tooltip 
    contentStyle={{ 
      fontFamily: 'var(--font-family-body)',
      borderRadius: '8px',
      border: '1px solid #D8D8D3',
      boxShadow: '0 4px 12px rgba(31, 31, 31, 0.12)',
      backgroundColor: '#FAFAF9'
    }}
  />
  <Bar 
    dataKey="amount" 
    fill="#47685C" 
    radius={[6, 6, 0, 0]} 
  />
</BarChart>
```

### Pie Chart
```tsx
<PieChart>
  <Pie
    data={stockHealthData}
    cx="50%"
    cy="50%"
    innerRadius={65}
    outerRadius={95}
    paddingAngle={3}
    dataKey="value"
  >
    {stockHealthData.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={entry.color} />
    ))}
  </Pie>
  <Tooltip 
    contentStyle={{ 
      fontFamily: 'var(--font-family-body)',
      borderRadius: '8px',
      border: '1px solid #D8D8D3',
      backgroundColor: '#FAFAF9'
    }}
  />
</PieChart>

// Recommended colors for pie segments:
const stockHealthData = [
  { name: 'Óptimo', value: 45, color: '#47685C' },      // Leaf Green
  { name: 'Bajo', value: 30, color: '#A9C9A4' },        // Soft Lime
  { name: 'Crítico', value: 15, color: '#C1643B' },     // Natural Honey - Warm Copper
  { name: 'Exceso', value: 10, color: '#5A8070' },      // Leaf Green Light
];
```

### Line Chart
```tsx
<LineChart data={expirationData}>
  <CartesianGrid 
    strokeDasharray="3 3" 
    stroke="#D8D8D3" 
    vertical={false} 
  />
  <XAxis 
    dataKey="week" 
    axisLine={false}
    tickLine={false}
    style={{ 
      fontFamily: 'var(--font-family-mono)', 
      fontSize: '11px', 
      fill: '#5A8070' 
    }}
  />
  <YAxis 
    axisLine={false}
    tickLine={false}
    style={{ 
      fontFamily: 'var(--font-family-mono)', 
      fontSize: '11px', 
      fill: '#5A8070' 
    }}
  />
  <Tooltip 
    contentStyle={{ 
      fontFamily: 'var(--font-family-body)',
      borderRadius: '8px',
      border: '1px solid #D8D8D3',
      backgroundColor: '#FAFAF9'
    }}
  />
  <Line 
    type="monotone" 
    dataKey="products" 
    stroke="#C1643B"        // Natural Honey - Warm Copper for warnings
    strokeWidth={2.5}
    dot={{ fill: '#C1643B', r: 5, strokeWidth: 2, stroke: '#FAFAF9' }}
    activeDot={{ r: 7 }}
  />
</LineChart>
```

---

## 🔔 Notification Badge
```tsx
<Button variant="ghost" size="icon" className="relative">
  <Bell className="h-5 w-5 text-[#47685C]" strokeWidth={1.5} />
  <span 
    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
    style={{ backgroundColor: '#C1643B' }}
  />
</Button>
```

---

## 👤 Avatar
```tsx
<Avatar className="h-8 w-8">
  <AvatarFallback 
    style={{ 
      backgroundColor: '#47685C',
      color: '#F5F5F2',
      fontFamily: 'var(--font-family-heading)',
      fontSize: '0.8125rem',
      fontWeight: 600
    }}
  >
    MR
  </AvatarFallback>
</Avatar>
```

---

## 🔗 Quick Action Card
```tsx
<Button 
  variant="outline" 
  className="h-auto py-6 flex-col gap-3 rounded-lg"
  style={{
    borderColor: '#D8D8D3'
  }}
>
  <div 
    className="w-10 h-10 rounded-lg flex items-center justify-center"
    style={{ backgroundColor: 'rgba(71, 104, 92, 0.1)' }}
  >
    <Plus className="h-5 w-5" style={{ color: '#47685C' }} strokeWidth={2} />
  </div>
  <span style={{ 
    fontFamily: 'var(--font-family-body)', 
    fontSize: '0.875rem', 
    fontWeight: 500, 
    color: '#1F1F1F' 
  }}>
    Nuevo Pedido
  </span>
</Button>
```

---

## 📐 Table Styling

### Table Header
```tsx
<TableHead 
  style={{
    backgroundColor: '#F5F5F2',
    color: '#47685C',
    fontFamily: 'var(--font-family-mono)',
    fontSize: '13px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '12px 16px'
  }}
>
  Producto
</TableHead>
```

### Table Cell
```tsx
<TableCell 
  style={{
    backgroundColor: '#FAFAF9',
    color: '#1F1F1F',
    fontFamily: 'var(--font-family-mono)',
    fontSize: '14px',
    padding: '14px 16px',
    borderBottom: '1px solid #D8D8D3'
  }}
>
  Arroz Integral Orgánico
</TableCell>
```

### Table Row Hover
```tsx
<TableRow 
  className="hover:bg-[#A9C9A4]/8 transition-colors"
>
  {/* cells */}
</TableRow>
```

---

## 🎨 Color Palette Reference

### Copy-Paste Color Values

```tsx
// PRIMARY - LEAF GREEN
const LEAF_GREEN_LIGHT = '#5A8070';
const LEAF_GREEN = '#47685C';
const LEAF_GREEN_DARK = '#3A5349';

// SECONDARY - PETROLEUM BLUE
const PETROLEUM_LIGHT = '#3D5B6B';
const PETROLEUM = '#2C4653';
const PETROLEUM_DARK = '#1F3340';

// COMPLEMENTARY - LIGHT SAND
const SAND_LIGHT = '#F0E9D9';
const SAND = '#E6DDC5';
const SAND_DARK = '#D4C9AC';

// NEUTRAL LIGHT - BONE WHITE
const BONE_LIGHTEST = '#FAFAF9';
const BONE = '#F5F5F2';
const BONE_DARK = '#E8E8E4';

// NEUTRAL DARK - GRAPHITE
const GRAPHITE_LIGHT = '#3A3A3A';
const GRAPHITE = '#1F1F1F';
const GRAPHITE_DARK = '#0F0F0F';

// ACCENT - SOFT LIME GREEN
const LIME_LIGHT = '#C3DEC0';
const LIME = '#A9C9A4';
const LIME_DARK = '#8FB88A';

// MATERIAL - NATURAL HONEY (WARM COPPER WOOD TONE)
const HONEY_LIGHT = '#D89072';
const HONEY = '#C1643B';
const HONEY_DARK = '#B85535';

// DERIVED NEUTRALS
const NEUTRAL_LINE = '#D8D8D3';
const NEUTRAL_SUBTLE = '#E5E5E0';
```

---

## 🧪 Component State Examples

### Button States
```tsx
// Default
<Button style={{ backgroundColor: '#47685C', color: '#F5F5F2' }}>
  Default
</Button>

// Hover
<Button style={{ backgroundColor: '#3A5349', color: '#F5F5F2' }}>
  Hover
</Button>

// Active/Pressed
<Button style={{ 
  backgroundColor: '#3A5349', 
  color: '#F5F5F2',
  transform: 'scale(0.98)'
}}>
  Active
</Button>

// Disabled
<Button disabled style={{ 
  backgroundColor: '#47685C', 
  color: '#F5F5F2',
  opacity: 0.3,
  cursor: 'not-allowed'
}}>
  Disabled
</Button>
```

### Input States
```tsx
// Default
<Input 
  className="border-[#D8D8D3]" 
  style={{ backgroundColor: '#FAFAF9' }} 
/>

// Focus
<Input 
  className="border-[#47685C] ring-1 ring-[#47685C]/20" 
  style={{ backgroundColor: '#FAFAF9' }} 
/>

// Error
<Input 
  className="border-[#C1643B] ring-1 ring-[#C1643B]/20" 
  style={{ backgroundColor: '#FAFAF9' }} 
/>
```

---

## 📖 Usage Notes

### When to Use Each Color

**Leaf Green** (#47685C)
- Primary buttons and CTAs
- Active states in navigation
- Logo and brand elements
- Positive action icons

**Petroleum Blue** (#2C4653)
- Sidebar background
- Structural elements
- Dark navigation bars
- Secondary backgrounds

**Light Sand** (#E6DDC5)
- Chart card backgrounds
- Section dividers
- Warm surface areas
- Soft contrast zones

**Bone White** (#F5F5F2 / #FAFAF9)
- Main app background
- Card surfaces
- Input fields
- Modal backgrounds

**Soft Lime** (#A9C9A4)
- Success messages
- Positive status indicators
- Active accents
- "Paid" or "Completed" states

**Natural Honey - Warm Copper** (#C1643B)
- Warnings
- Urgent alerts
- Expiration notices
- Secondary warm accents

---

## ✅ Quick Implementation Checklist

- [ ] Use Leaf Green for all primary actions
- [ ] Use Petroleum Blue for sidebar/navigation
- [ ] Use Sand for chart backgrounds
- [ ] Use Bone White for card surfaces
- [ ] Use Soft Lime for success states
- [ ] Use Natural Honey for warnings
- [ ] Apply 12px border radius to cards
- [ ] Apply 8px border radius to buttons/inputs
- [ ] Use gestock-shadow class for all cards
- [ ] Use Manrope for headings
- [ ] Use Inter for body text
- [ ] Use Roboto Mono for tables/metrics
- [ ] Ensure all text meets WCAG AA contrast

---

**GeStock Component Showcase v1.0.0**  
Last updated: October 2025
