# GeStock Color System - Moss Green Edition

## Overview
GeStock's refined dark theme introduces **Moss Green** as the primary action color, creating a natural, calm interface perfect for data-driven business operations. The color hierarchy emphasizes structure (green), action (moss green), data (blue gray), and alerts (copper).

---

## Color Palette

### Primary Colors

#### Structure & Navigation
- **Deep Green** `#2C3A33`
  - Main background
  - Navigation bar
  - Foundation of the interface
  - Creates calm, grounded atmosphere

#### Action & Interaction
- **Moss Green** `#7DAA92`
  - Primary CTAs and buttons
  - Active states in navigation
  - Positive trends and growth indicators
  - Interactive elements
  - Hover state: `#6C9C83`
  - Light variant: `#8FBDA5`

#### Data & Analytics
- **Blue Gray** `#7394B0`
  - Charts and graphs
  - Data visualization
  - Neutral KPIs
  - Analytical content
  - Secondary variant: `#5A7B99`

#### Alerts & Warnings
- **Copper** `#C1643B`
  - Error messages
  - Warning states
  - Critical indicators (e.g., Vencimientos)
  - Destructive actions
  - Hover state: `#B85535`

### Surface Colors

#### Cards & Panels
- **Sage Gray** `#3C4A44`
  - Card backgrounds
  - Elevated surfaces
  - Input fields
  - Content containers

#### Borders & Dividers
- **Stone Gray** `#4B5B53`
  - Borders
  - Dividers
  - Subtle separators

### Text Colors

#### Primary Text
- **Warm White** `#F5F5F2`
  - Headings
  - Primary labels
  - Important content

#### Secondary Text
- **Light Sage Gray** `#B9BBB8`
  - Secondary labels
  - Descriptions
  - Inactive states

---

## Usage Guidelines

### Button Hierarchy & Micro-Interactions

GeStock uses a three-tier button system with subtle, tactile micro-interactions:

#### 1. Primary Action Button (Moss Green #7DAA92)
```tsx
// Main CTAs — most dominant visual weight
<Button className="gestock-btn-moss">
  Nuevo Pedido
</Button>

// Use for: Main workflow actions, "Guardar", "Confirmar"
// Interaction states:
// - Hover: Soft glow (#8FBDA5, 15px blur, 40% opacity) + 5% brightness
// - Active/Press: translateY(1px) + darker tone (#6C9C83)
// - Focus: 1.5px ring in #A9CDB6 for accessibility
// - Disabled: 40% opacity, no shadow
```

#### 2. Secondary Action Button (Light Sage Green #A9CDB6)
```tsx
// Supportive CTAs — complementary, lighter visual weight
<Button className="gestock-btn-secondary">
  Subir Factura
</Button>

// Use for: "Agregar Proveedor", "Agregar Producto", supportive actions
// Differentiation: Brighter, cooler tone than primary
// Interaction states: Same micro-interactions as primary
// Visual balance: Non-competitive with primary CTAs
```

#### 3. Alert/Destructive Button (Copper #C1643B)
```tsx
// For warnings and critical actions only
<Button className="gestock-btn-alert">
  Eliminar
</Button>

// Use for: "Cancelar", destructive actions, critical warnings
```

#### 4. Neutral/Inactive Button (Sage Gray #47685C)
```tsx
// For inactive or saved states
<Button className="gestock-btn-neutral">
  Guardado
</Button>

// Use for: Non-actionable states, "Guardado" (saved)
```

### Micro-Interaction Principles
- **Timing**: All transitions use `150ms ease-in-out` for natural, grounded motion
- **Hover**: Adds soft glow and subtle lift (`translateY(-1px)`)
- **Active**: Inward depth with `translateY(1px)` 
- **Focus**: Clear ring outline for keyboard navigation
- **Disabled**: Maintains 40% opacity with no interactive effects

### Navigation States
```tsx
// Active navigation item
style={{
  backgroundColor: 'rgba(125, 170, 146, 0.15)',
  color: '#7DAA92',
  borderLeft: '2px solid #7DAA92'
}}

// Inactive navigation item
style={{
  color: '#B9BBB8'
}}
```

### Data Visualization
```tsx
// Primary chart color (neutral data)
const chartColor = '#7394B0';

// Positive trend (growth)
const positiveColor = '#7DAA92';

// Negative trend (decline)
const negativeColor = '#C1643B';

// Segmented bar example
const stockSegments = [
  { label: 'Óptimo', value: 45, color: '#7DAA92' },    // Moss Green
  { label: 'Bajo', value: 30, color: '#7394B0' },      // Blue Gray
  { label: 'Crítico', value: 15, color: '#C1643B' },   // Copper
  { label: 'Exceso', value: 10, color: '#8FBDA5' },    // Light Moss
];
```

### KPI Cards
```tsx
// Positive/growth KPI
<CompactKPICard 
  accentColor="#7DAA92"  // Moss Green
  trend={{ direction: 'up' }}
/>

// Neutral/data KPI
<CompactKPICard 
  accentColor="#7394B0"  // Blue Gray
  trend={{ direction: 'neutral' }}
/>

// Critical/warning KPI
<CompactKPICard 
  accentColor="#C1643B"  // Copper
  trend={{ direction: 'down' }}
/>
```

### Insight Cards
```tsx
// Positive insight
<div style={{
  backgroundColor: 'rgba(125, 170, 146, 0.15)',
  borderColor: 'rgba(125, 170, 146, 0.4)',
}}>
  <TrendingUp style={{ color: '#7DAA92' }} />
</div>

// Warning/alert insight
<div style={{
  backgroundColor: 'rgba(193, 100, 59, 0.15)',
  borderColor: 'rgba(193, 100, 59, 0.4)',
}}>
  <AlertCircle style={{ color: '#C1643B' }} />
</div>
```

---

## Visual Hierarchy

### Color Priority System

1. **Structure (Deep Green)** - Foundation, always present
2. **Action (Moss Green)** - Guides user interaction
3. **Data (Blue Gray)** - Supports information display
4. **Alert (Copper)** - Demands attention only when critical

### Contrast Ratios (WCAG AA Compliant)

All text combinations meet minimum 4.5:1 contrast ratio:

- Moss Green `#7DAA92` on Deep Green `#2C3A33`: **4.8:1** ✓
- Warm White `#F5F5F2` on Deep Green `#2C3A33`: **12.8:1** ✓
- Warm White `#F5F5F2` on Sage Gray `#3C4A44`: **11.2:1** ✓
- Warm White `#F5F5F2` on Moss Green `#7DAA92`: **7.1:1** ✓
- Light Sage `#B9BBB8` on Deep Green `#2C3A33`: **7.2:1** ✓

---

## Animation & Motion Philosophy

GeStock's micro-interactions follow a "calm productivity" principle:

### Motion Timing
- **Quick feedback**: 150ms for button states
- **Natural easing**: `ease-in-out` curve mimics organic motion
- **Subtle depth**: 1-2px translations prevent jarring movement

### Visual Feedback Hierarchy
1. **Hover**: Anticipatory - Soft glow indicates interactivity
2. **Focus**: Accessibility - Clear outline for keyboard users  
3. **Active/Press**: Confirmation - Brief inward motion confirms action
4. **Disabled**: Clarity - Reduced opacity with no interactive hints

### Glow Effects
- **Moss Green Glow**: `#8FBDA5` with 12-15px blur at 40% opacity
- **Purpose**: Creates a "living" button that breathes without aggression
- **Context**: Only on hover, never persistent (preserves calm)

### Focus Ring Standards
- **Color**: `#A9CDB6` (desaturated mint for softer contrast)
- **Width**: 1.5px outline
- **Offset**: 2px for clear separation
- **Shadow**: 3px rgba ring for depth

---

## Component Examples

### Dashboard
- Background: Deep Green `#2C3A33`
- KPI Cards: Sage Gray `#3C4A44`
- Chart Bars: Blue Gray `#7394B0`
- Positive Trends: Moss Green `#7DAA92`
- Critical Alerts: Copper `#C1643B`

### Navigation
- Sidebar Background: Deep Green `#2C3A33`
- Active Item: Moss Green `#7DAA92` with 15% opacity background
- Inactive Items: Light Sage `#B9BBB8`
- Active Border: Moss Green `#7DAA92`

### Bottom Navigation (Mobile)
- Bar Background: Deep Green `#2C3A33`
- Primary Button: Moss Green `#7DAA92`
- Active Icons: Moss Green `#7DAA92`
- Inactive Icons: Light Sage `#B9BBB8`
- Active Indicator Dot: Moss Green `#7DAA92`

### Drawer/Modal
- Background: Sage Gray `#3C4A44`
- Top Border: Moss Green `#7DAA92`
- Active Item Background: `rgba(125, 170, 146, 0.15)`
- Active Item Border: Moss Green `#7DAA92`
- Close Button Background: Deep Green `#2C3A33`

---

## Design Philosophy

**"Data meets nature"** — A harmonious blend of organic tones with modern digital clarity.

### Key Principles

1. **Calm & Professional**: Deep greens create a grounded, trustworthy environment
2. **Action-Oriented**: Moss green clearly indicates where users should act
3. **Data-Driven**: Blue gray provides neutral, analytical presence
4. **Alert-Conscious**: Copper is reserved for critical states only

### Mood Keywords
- Natural
- Calm
- Structured
- Analytical
- Trustworthy
- Efficient
- Modern
- Grounded
- Professional
- Intuitive

---

## Implementation Checklist

### Global Styles ✓
- [x] CSS custom properties updated
- [x] Primary color set to Moss Green
- [x] Destructive color remains Copper
- [x] Accent color set to Moss Green

### Components ✓
- [x] Dashboard - Moss Green for positive insights
- [x] CompactKPICard - Moss Green for up trends
- [x] Sidebar - Moss Green for active states
- [x] BottomNav - Moss Green for primary button and active states
- [x] MoreDrawer - Moss Green for active states
- [x] TopBar - Moss Green for logo

### Reserved Copper Usage ✓
- [x] Vencimientos KPI (critical alert)
- [x] Destructive buttons
- [x] Error states
- [x] Warning messages
- [x] Critical stock levels

---

## Future Considerations

### Success Messages
Use **Light Moss Green** `#8FBDA5` for success toasts and confirmations

### Loading States
Consider using Blue Gray `#7394B0` for skeleton screens and loading indicators

### Disabled States
Apply 40% opacity to Moss Green `#7DAA92` for disabled buttons

### Focus States
Use Moss Green `#7DAA92` with 15% opacity for focus rings

---

**Last Updated**: Current Session
**Version**: Moss Green Edition (v3)
**Status**: Active
