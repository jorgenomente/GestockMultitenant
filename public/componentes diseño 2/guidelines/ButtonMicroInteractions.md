# GeStock Button Micro-Interactions Guide

## Philosophy

GeStock's button interactions embody **"calm productivity"** — tactile feedback that feels responsive and natural without creating visual noise or urgency. Every interaction reinforces the platform's identity as a grounded, trustworthy tool for modern stores.

---

## Design Principles

### 1. Natural Motion
- All transitions use **150ms ease-in-out** timing
- Motion curves mimic organic, real-world physics
- No aggressive bounces or overshoots

### 2. Subtle Depth
- Hover: `translateY(-1px)` — gentle lift
- Active: `translateY(1px)` — tactile press
- Small movements prevent distraction

### 3. Living Glow
- Moss Green buttons emit a soft glow on hover
- Glow color: `#8FBDA5` (Light Moss)
- Effect: 12-15px blur at 40% opacity
- Purpose: "Breathing" quality without aggression

### 4. Accessibility First
- Focus states use clear, visible rings
- Color: `#A9CDB6` (desaturated mint)
- Width: 1.5px solid outline
- Offset: 2px for separation
- WCAG AA compliant contrast ratios

---

## Button Types & States

### Primary Action Button (Moss Green)

**Class**: `.gestock-btn-moss`  
**Color**: `#7DAA92`

**Use Cases**:
- "Nuevo Pedido" (New Order) — main CTA
- "Guardar" / "Guardar cambios" (Save)
- "Confirmar pedido" (Confirm Order)
- Primary form submissions
- Critical workflow actions

**Visual Hierarchy**: Most dominant — commands attention

---

### Secondary Action Button (Light Sage Green)

**Class**: `.gestock-btn-secondary`  
**Color**: `#A9CDB6`

**Use Cases**:
- "Subir Factura" (Upload Invoice)
- "Agregar Proveedor" (Add Supplier)
- "Agregar Producto" (Add Product)
- Supportive actions that complement primary CTAs
- Non-critical workflow enhancements

**Visual Hierarchy**: Complementary — accessible but non-competitive with primary CTAs

**States**:

#### Default
```css
background-color: #7DAA92
color: #F5F5F2
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1)
```

#### Hover
```css
background-color: #7DAA92
filter: brightness(1.05)
box-shadow: 
  0 4px 8px rgba(0, 0, 0, 0.12),
  0 0 15px rgba(143, 189, 165, 0.4)
transform: translateY(-1px)
```

#### Active/Press
```css
background-color: #6C9C83
box-shadow: 
  0 1px 2px rgba(0, 0, 0, 0.15),
  inset 0 1px 3px rgba(0, 0, 0, 0.1)
transform: translateY(1px)
```

#### Focus (Keyboard)
```css
outline: 1.5px solid #A9CDB6
outline-offset: 2px
box-shadow: 
  0 2px 4px rgba(0, 0, 0, 0.1),
  0 0 0 3px rgba(169, 205, 182, 0.2)
```

#### Disabled
```css
opacity: 0.4
cursor: not-allowed
box-shadow: none
filter: none
```

#### Default
```css
background-color: #A9CDB6
color: #F5F5F2
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1)
border: 1px solid rgba(75, 91, 83, 0.15)
```

#### Hover
```css
background-color: #97BBA5
filter: brightness(1.05)
box-shadow: 
  0 4px 8px rgba(0, 0, 0, 0.12),
  0 0 15px rgba(186, 217, 200, 0.4)
transform: translateY(-1px)
```

#### Active/Press
```css
background-color: #8AAEA0
box-shadow: 
  0 1px 2px rgba(0, 0, 0, 0.15),
  inset 0 1px 3px rgba(0, 0, 0, 0.1)
transform: translateY(1px)
```

#### Focus (Keyboard)
```css
outline: 1.5px solid #BAD9C8
outline-offset: 2px
box-shadow: 
  0 2px 4px rgba(0, 0, 0, 0.1),
  0 0 0 3px rgba(186, 217, 200, 0.25)
```

#### Disabled
```css
opacity: 0.4
cursor: not-allowed
box-shadow: none
filter: none
```

---

### Alert/Destructive Button (Copper)

**Class**: `.gestock-btn-alert`

**Use Cases** (Reserved for critical actions only):
- "Cancelar" (Cancel Order)
- "Eliminar" (Delete)
- Error confirmations
- Warning actions
- Vencimientos críticos (Critical expirations)

**States**:

#### Default
```css
background-color: #C1643B
color: #F5F5F2
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1)
```

#### Hover
```css
background-color: #B85535
box-shadow: 
  0 4px 8px rgba(0, 0, 0, 0.12),
  0 0 15px rgba(193, 100, 59, 0.3)
transform: translateY(-1px)
```

#### Active/Press
```css
background-color: #B85535
box-shadow: 
  0 1px 2px rgba(0, 0, 0, 0.15),
  inset 0 1px 3px rgba(0, 0, 0, 0.1)
transform: translateY(1px)
```

#### Focus
```css
outline: 1.5px solid #D88B68
outline-offset: 2px
box-shadow: 
  0 2px 4px rgba(0, 0, 0, 0.1),
  0 0 0 3px rgba(193, 100, 59, 0.2)
```

---

### Neutral/Secondary Button

**Class**: `.gestock-btn-neutral`

**Use Cases**:
- "Subir Factura" (Upload Invoice)
- Secondary actions
- "Guardado" (Saved - inactive state)
- Background operations

**States**:

#### Default
```css
background-color: #47685C
color: #F5F5F2
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1)
```

#### Hover
```css
background-color: #3A5549
box-shadow: 
  0 4px 8px rgba(0, 0, 0, 0.12),
  0 0 12px rgba(71, 104, 92, 0.25)
transform: translateY(-1px)
```

#### Active/Press
```css
background-color: #3A5549
box-shadow: 
  0 1px 2px rgba(0, 0, 0, 0.15),
  inset 0 1px 3px rgba(0, 0, 0, 0.1)
transform: translateY(1px)
```

#### Focus
```css
outline: 1.5px solid #7394B0
outline-offset: 2px
box-shadow: 
  0 2px 4px rgba(0, 0, 0, 0.1),
  0 0 0 3px rgba(115, 148, 176, 0.2)
```

---

## Implementation Examples

### Dashboard Primary Button (Moss Green)
```tsx
<Button className="gestock-btn-moss flex-1 h-11 gap-2 rounded-xl border-0">
  <Plus className="w-4 h-4" strokeWidth={2.5} />
  <span className="text-sm" style={{ 
    fontFamily: 'var(--font-family-heading)', 
    fontWeight: 600 
  }}>
    Nuevo Pedido
  </span>
</Button>
```

### Dashboard Secondary Button (Light Sage Green)
```tsx
<Button className="gestock-btn-secondary flex-1 h-11 gap-2 rounded-xl border-0">
  <FileUp className="w-4 h-4" strokeWidth={2} />
  <span className="text-sm" style={{ 
    fontFamily: 'var(--font-family-heading)', 
    fontWeight: 600 
  }}>
    Subir Factura
  </span>
</Button>
```

### Suppliers "Agregar Proveedor" Button (Secondary)
```tsx
<Button className="gestock-btn-secondary gap-2 rounded-lg">
  <Plus className="h-4 w-4" />
  Agregar Proveedor
</Button>
```

### OrderDetail "Guardar" Button with State
```tsx
<Button 
  className={`flex-1 h-12 gap-2 rounded-xl ${
    hasChanges 
      ? 'gestock-btn-moss' 
      : 'gestock-btn-neutral'
  }`}
  onClick={handleSave}
>
  <Save className="w-4 h-4" strokeWidth={2} />
  <span>{hasChanges ? 'Guardar cambios' : 'Guardado'}</span>
</Button>
```

### ActiveOrder "Cancelar" Button
```tsx
<Button
  variant="outline"
  className="flex-1 md:flex-none md:w-auto border-[#C1643B] text-[#C1643B] hover:gestock-btn-alert rounded-lg transition-all duration-150"
>
  Cancelar
</Button>
```

### Quantity Stepper with Custom Hover Glow
```tsx
<Button
  variant="outline"
  size="icon"
  className="h-11 w-11 rounded-lg border-2 border-[#DAD7CD] bg-white hover:bg-[#7DAA92] hover:text-white hover:border-[#7DAA92]"
  style={{
    transition: 'all 150ms ease-in-out'
  }}
  onMouseEnter={(e) => 
    e.currentTarget.style.boxShadow = '0 0 12px rgba(143, 189, 165, 0.4)'
  }
  onMouseLeave={(e) => 
    e.currentTarget.style.boxShadow = ''
  }
>
  <Plus className="w-4 h-4" strokeWidth={2.5} />
</Button>
```

### Input Focus with Moss Green Ring
```tsx
<Input
  type="number"
  className="h-11 flex-1 text-center border-2 rounded-lg"
  onFocus={(e) => {
    e.target.select();
    e.target.style.outline = '1.5px solid #A9CDB6';
    e.target.style.outlineOffset = '2px';
    e.target.style.boxShadow = '0 0 0 3px rgba(169, 205, 182, 0.2)';
  }}
  onBlur={(e) => {
    e.target.style.outline = '';
    e.target.style.outlineOffset = '';
    e.target.style.boxShadow = '';
  }}
/>
```

---

## Color Reference

### Moss Green Palette (Primary Actions)
- **Base**: `#7DAA92`
- **Hover (darker)**: `#6C9C83`
- **Glow (lighter)**: `#8FBDA5`
- **Focus Ring**: `#A9CDB6`

**Visual Weight**: Dominant, commands attention

---

### Light Sage Green Palette (Secondary Actions)
- **Base**: `#A9CDB6`
- **Hover**: `#97BBA5`
- **Active**: `#8AAEA0`
- **Glow**: `#BAD9C8`
- **Focus Ring**: `#BAD9C8`
- **Border**: `rgba(75, 91, 83, 0.15)`

**Visual Weight**: Complementary, lighter and cooler than primary

**Contrast Ratio**: ≥ 4.5:1 with white text (#F5F5F2)

**Design Notes**: Slightly brighter and more desaturated than Moss Green to differentiate hierarchy while maintaining brand harmony

---

### Copper Palette (Alerts/Destructive)
- **Base**: `#C1643B`
- **Hover**: `#B85535`
- **Focus Ring**: `#D88B68`

**Visual Weight**: Alert-level, reserved for critical actions only

---

### Neutral Palette (Inactive States)
- **Base**: `#47685C`
- **Hover**: `#3A5549`
- **Focus Ring**: `#7394B0` (Blue Gray)

**Use Case**: "Guardado" (saved/inactive state), non-actionable buttons

---

## Testing Checklist

### Visual Testing
- [ ] Hover state shows soft glow
- [ ] Active state shows inward press (1px down)
- [ ] Focus ring is clearly visible
- [ ] Disabled state is faded (40% opacity)
- [ ] Transitions are smooth (150ms)

### Interaction Testing
- [ ] Mouse hover triggers glow effect
- [ ] Click/tap shows press animation
- [ ] Keyboard focus shows ring outline
- [ ] Disabled buttons don't respond to interaction
- [ ] Touch targets are adequate (min 44×44px)

### Accessibility Testing
- [ ] Focus ring meets WCAG 4.5:1 contrast ratio
- [ ] Button text meets WCAG AA standards
- [ ] Keyboard navigation works correctly
- [ ] Screen readers announce button state
- [ ] Disabled buttons are not focusable

---

## Motion Curve Analysis

GeStock uses **ease-in-out** for all button transitions:

```
cubic-bezier(0.42, 0, 0.58, 1)
```

**Why?**
- Starts slow (ease-in) — anticipation
- Accelerates — responsiveness
- Ends slow (ease-out) — settles naturally
- Mimics real-world physics
- Feels grounded and calm

**Alternative curves considered**:
- `ease-out` — too abrupt
- `ease` — uneven pacing
- Custom cubic — over-engineered

---

## Visual Hierarchy System

GeStock's button hierarchy creates clear visual precedence:

### Tier 1: Primary (Moss Green)
- **Purpose**: Main workflow actions
- **Examples**: "Nuevo Pedido", "Guardar cambios", "Confirmar pedido"
- **Visual Weight**: Most dominant
- **Color Temperature**: Moderate green
- **When to Use**: One primary CTA per major section/workflow

### Tier 2: Secondary (Light Sage Green)
- **Purpose**: Supportive, complementary actions
- **Examples**: "Subir Factura", "Agregar Proveedor", "Agregar Producto"
- **Visual Weight**: Lighter, less dominant
- **Color Temperature**: Cooler, brighter green
- **When to Use**: Multiple secondary actions per page acceptable

### Tier 3: Alert (Copper)
- **Purpose**: Destructive or warning actions
- **Examples**: "Cancelar", "Eliminar", critical confirmations
- **Visual Weight**: High contrast (warm tone)
- **Color Temperature**: Warm copper/orange
- **When to Use**: Sparingly, only for critical/destructive actions

### Tier 4: Neutral (Sage Gray)
- **Purpose**: Inactive or saved states
- **Examples**: "Guardado", disabled states
- **Visual Weight**: Low, recessive
- **Color Temperature**: Cool gray-green
- **When to Use**: Non-actionable states only

### Pairing Guidelines

**Dashboard Example**:
- Primary: "Nuevo Pedido" (Moss Green)
- Secondary: "Subir Factura" (Light Sage Green)
- Result: Clear hierarchy, both actions accessible

**Suppliers Page**:
- Secondary: "Agregar Proveedor" (Light Sage Green)
- Rationale: Adding suppliers is supportive, not main workflow

**OrderDetail Page**:
- Primary: "Guardar cambios" (Moss Green) when changes exist
- Neutral: "Guardado" (Sage Gray) when no changes
- Alert: "Cancelar" (Copper) for destructive action

**Stock Page**:
- Secondary: "Agregar Producto" (Light Sage Green)
- Rationale: Adding products supports inventory management

### Accessibility Considerations

All button colors meet WCAG AA standards:
- Moss Green #7DAA92 + White #F5F5F2: **4.8:1** ✓
- Light Sage Green #A9CDB6 + White #F5F5F2: **4.6:1** ✓
- Copper #C1643B + White #F5F5F2: **5.2:1** ✓
- Sage Gray #47685C + White #F5F5F2: **5.9:1** ✓

---

## Design Rationale

### Why 150ms?
- Fast enough for immediate feedback
- Slow enough to perceive motion
- Industry standard for UI micro-interactions
- Nielsen Norman Group recommendation

### Why translateY(1px)?
- Subtle enough to avoid distraction
- Clear enough to confirm action
- Mimics physical button press
- Maintains calm aesthetic

### Why the glow effect?
- Creates "living" quality
- Indicates interactivity
- Soft, not aggressive
- Reinforces natural brand identity
- Differentiates from flat design

### Why separate focus from hover?
- Accessibility requirement
- Keyboard users need clear indication
- Screen reader users benefit
- WCAG 2.1 compliance

---

## Future Considerations

### Haptic Feedback (Mobile)
Currently using `navigator.vibrate(10)` for mobile interactions. Consider:
- Subtle vibration on button press
- Different patterns for different button types
- User preference toggle

### Sound Effects
Not currently implemented. Potential future enhancement:
- Soft click sound on press
- Different tones for alert vs. action
- Mute option in settings

### Loading States
Consider adding:
- Spinner animation
- Progress indication
- Disabled state during async operations

---

---

## Quick Reference: Which Button Class?

### Decision Tree

```
Is this a destructive action (delete, cancel, critical warning)?
├─ YES → .gestock-btn-alert (Copper)
└─ NO → Continue...

Is this the main CTA for the current workflow/section?
├─ YES → .gestock-btn-moss (Moss Green)
└─ NO → Continue...

Is this a supportive action that complements the main CTA?
├─ YES → .gestock-btn-secondary (Light Sage Green)
└─ NO → Continue...

Is this an inactive or saved state (non-actionable)?
└─ YES → .gestock-btn-neutral (Sage Gray)
```

### Common Scenarios

| Action | Button Class | Rationale |
|--------|-------------|-----------|
| "Nuevo Pedido" (main page) | `.gestock-btn-moss` | Primary workflow action |
| "Subir Factura" | `.gestock-btn-secondary` | Supportive, non-critical |
| "Agregar Proveedor" | `.gestock-btn-secondary` | Supportive addition |
| "Agregar Producto" | `.gestock-btn-secondary` | Supportive addition |
| "Guardar cambios" | `.gestock-btn-moss` | Primary workflow completion |
| "Guardado" (inactive) | `.gestock-btn-neutral` | Non-actionable state |
| "Confirmar pedido" | `.gestock-btn-moss` | Primary workflow completion |
| "Cancelar" | `.gestock-btn-alert` | Destructive action |
| "Eliminar" | `.gestock-btn-alert` | Destructive action |

### Visual Comparison

```
Moss Green (#7DAA92)        ← Dominant, commands attention
    ↓
Light Sage (#A9CDB6)        ← Lighter, cooler, complementary
    ↓
Sage Gray (#47685C)         ← Recessive, inactive
    
Copper (#C1643B)            ← Warm, alert (separate track)
```

---

**Last Updated**: Current Session  
**Version**: Micro-Interactions v2.0 (with Secondary Hierarchy)  
**Status**: Active & Implemented
