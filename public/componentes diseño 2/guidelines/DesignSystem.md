# GeStock Design System & UI Kit
### Natural Data — Where Digital Management Meets Organic Design

---

## 🎨 1. Color Palette: "Natural Data"

GeStock's color system communicates **operational precision with calm, natural warmth**. Every tone has been carefully calibrated to avoid the coldness of traditional dashboards while maintaining professional clarity.

### Core Brand Colors

#### Primary — Leaf Green
**Purpose**: Core brand identity for headers, icons, active states, and key highlights.

- **Light** `#5A8070` — For hover states and lighter accents
- **Regular** `#47685C` — Main brand color
- **Dark** `#3A5349` — For depth and contrast

**Usage**:
- Primary buttons and CTAs
- Active navigation states
- Section headers
- Icon accents for positive actions
- Logo and brand elements

---

#### Secondary — Petroleum Blue
**Purpose**: Structural depth, navigation backgrounds, and grounding elements.

- **Light** `#3D5B6B` — For hover states on dark backgrounds
- **Regular** `#2C4653` — Main structural color
- **Dark** `#1F3340` — For borders and divisions

**Usage**:
- Sidebar background
- Dark navigation components
- Structural containers
- Footer and divider sections

---

#### Complementary — Light Sand
**Purpose**: Warm backgrounds for cards, sections, and surfaces that need softness.

- **Light** `#F0E9D9` — Very subtle backgrounds
- **Regular** `#E6DDC5` — Main complementary tone
- **Dark** `#D4C9AC` — For borders on sand backgrounds

**Usage**:
- Dashboard cards containing charts
- Section backgrounds
- Large surface areas requiring warmth
- Soft contrast zones

---

### Neutral Colors

#### Bone White
**Purpose**: Base for clean surfaces, backgrounds, and breathing space.

- **Lightest** `#FAFAF9` — Pure backgrounds and cards
- **Regular** `#F5F5F2` — Main background color
- **Dark** `#E8E8E4` — Subtle dividers

**Usage**:
- Main application background
- Card surfaces
- Input fields
- Modal backgrounds

---

#### Graphite / Charcoal
**Purpose**: High-contrast text and critical UI elements.

- **Light** `#3A3A3A` — Secondary text
- **Regular** `#1F1F1F` — Main text color
- **Dark** `#0F0F0F` — Maximum contrast elements

**Usage**:
- Body text
- Headers and titles
- High-priority data
- Icon fills

---

### Accent & Material Tones

#### Soft Lime Green (Accent)
**Purpose**: Positive states, highlights, and active chips.

- **Light** `#C3DEC0` — Very soft backgrounds
- **Regular** `#A9C9A4` — Main accent
- **Dark** `#8FB88A` — For borders and active states

**Usage**:
- Success messages
- Positive status chips
- Active state highlights
- "Paid" or "Completed" indicators
- Accent buttons

---

#### Natural Honey (Material Tone)
**Purpose**: Warm copper wood tone with reddish warmth inspired by sunlit natural wood, providing a balanced warm accent throughout the interface.

- **Light** `#D89072` — Soft warning backgrounds
- **Regular** `#C1643B` — Main warm copper accent (Cobre rojizo suave)
- **Dark** `#B85535` — Alert states and hover/pressed states

**Usage**:
- Warning chips and urgent states
- Notification badges
- Alert indicators
- Chart warning/critical highlights
- Warm accent details
- Expiration indicators
- Data visualization accents

**Visual Character**: Natural wood with sunlight warmth — reddish, warm, and balanced. Provides visual contrast against the cooler greens and blues while maintaining harmony with the natural earth-tone palette.

---

### Derived Neutrals

- **Line** `#D8D8D3` — Borders, dividers, input outlines
- **Subtle** `#E5E5E0` — Very soft separators

---

## ✍️ 2. Typography System

GeStock uses a **three-font hierarchy** for clarity, warmth, and precision:

| **Element** | **Font Family** | **Size** | **Weight** | **Line Height** | **Letter Spacing** |
|-------------|----------------|----------|------------|-----------------|-------------------|
| **H1** | Manrope | 28–32px | Medium (500) | 1.4 | -2% |
| **H2** | Manrope | 22–24px | SemiBold (600) | 1.4 | -1% |
| **H3** | Manrope | 18–20px | Medium (500) | 1.5 | 0% |
| **Body** | Inter | 16px | Regular (400) | 1.6 | 0% |
| **Labels** | Inter | 13–14px | Medium (500) | 1.5 | 1% |
| **Captions** | Inter | 11–12px | Regular (400) | 1.5 | 2% |
| **Data Tables** | Roboto Mono | 14–16px | Regular (400) | 1.4 | 0% |
| **Numbers/Metrics** | Roboto Mono | 13–14px | Medium (500) | 1.3 | 0% |

### Font Pairings

- **Manrope** — Modern geometric with friendly strength, ideal for headlines and section titles
- **Inter** — Exceptional readability for dense data layouts and body text
- **Roboto Mono** — For tables, metrics, and numeric data requiring alignment

### Accessibility Note
All text maintains **WCAG AA contrast minimum** (4.5:1 for body, 3:1 for large text).

---

## 🧱 3. Component Library

### Buttons

#### Primary Button
**Style**: Leaf Green (`#47685C`) background, Bone White (`#F5F5F2`) text
```css
background: #47685C;
color: #F5F5F2;
padding: 10px 20px;
border-radius: 8px;
font-weight: 500;
transition: all 0.18s ease;
```
**Hover**: Darken to `#3A5349`

---

#### Secondary Button
**Style**: Petroleum Blue (`#2C4653`) outline, text, or background
```css
border: 1px solid #2C4653;
color: #2C4653;
background: transparent;
padding: 10px 20px;
border-radius: 8px;
font-weight: 500;
```
**Hover**: Background `#2C4653`, text `#F5F5F2`

---

#### Accent Button
**Style**: Soft Lime (`#A9C9A4`) with subtle glow on hover
```css
background: #A9C9A4;
color: #1F1F1F;
padding: 10px 20px;
border-radius: 8px;
font-weight: 500;
```
**Hover**: Add soft shadow `0 4px 12px rgba(169, 201, 164, 0.3)`

---

#### Disabled State
**Style**: 30% opacity of base color
```css
opacity: 0.3;
cursor: not-allowed;
```

---

### Inputs & Fields

```css
border: 1px solid #D8D8D3;
border-radius: 8px;
padding: 10px 14px;
background: #FAFAF9;
color: #1F1F1F;
font-family: 'Inter', sans-serif;
font-size: 14px;
```

**Focus State**:
```css
border-color: #47685C;
box-shadow: 0 0 0 3px rgba(71, 104, 92, 0.1);
outline: none;
```

**Error State**:
```css
border-color: #C1643B;
box-shadow: 0 0 0 3px rgba(193, 100, 59, 0.1);
```

---

### Chips & Badges

#### Positive / Success Chip
```css
background: rgba(169, 201, 164, 0.3);
color: #47685C;
padding: 4px 12px;
border-radius: 16px;
font-size: 13px;
font-weight: 500;
```

#### Warning Chip
```css
background: rgba(193, 100, 59, 0.2);
color: #B85535;
padding: 4px 12px;
border-radius: 16px;
font-size: 13px;
font-weight: 500;
```

#### Alert / Urgent Chip
```css
background: #C1643B;
color: #FAFAF9;
padding: 4px 12px;
border-radius: 16px;
font-size: 13px;
font-weight: 500;
```

---

### Cards

#### Base Card Style
```css
background: #FAFAF9;
border-radius: 12px;
box-shadow: 0 1px 3px 0 rgba(31, 31, 31, 0.08), 
            0 1px 2px -1px rgba(31, 31, 31, 0.06);
padding: 24px;
border: none;
```

#### Card with Sand Background (for charts)
```css
background: #E6DDC5;
border-radius: 12px;
box-shadow: 0 1px 3px 0 rgba(31, 31, 31, 0.08), 
            0 1px 2px -1px rgba(31, 31, 31, 0.06);
padding: 24px;
```

**Hover State**:
```css
transform: translateY(-1px);
box-shadow: 0 4px 12px -2px rgba(31, 31, 31, 0.12), 
            0 2px 6px -2px rgba(31, 31, 31, 0.10);
transition: all 0.18s ease;
```

---

### Tables

#### Header Row
```css
background: #F5F5F2;
color: #47685C;
font-family: 'Roboto Mono', monospace;
font-size: 13px;
font-weight: 500;
text-transform: uppercase;
letter-spacing: 0.05em;
padding: 12px 16px;
```

#### Data Rows
```css
background: #FAFAF9;
color: #1F1F1F;
font-family: 'Roboto Mono', monospace;
font-size: 14px;
padding: 14px 16px;
border-bottom: 1px solid #D8D8D3;
```

**Hover Row**:
```css
background: rgba(169, 201, 164, 0.08);
```

#### Grid Lines
```css
border-color: #D8D8D3;
```

---

### Navigation

#### Desktop Sidebar
```css
background: #2C4653;
color: #F5F5F2;
width: 256px;
border-right: 1px solid #1F3340;
display: none; /* hidden on mobile */
```

**Navigation Item**:
```css
padding: 10px 16px;
border-radius: 6px;
color: rgba(245, 245, 242, 0.7);
font-size: 14px;
font-weight: 500;
transition: all 0.15s ease;
```

**Active State**:
```css
background: #47685C;
color: #F5F5F2;
border-left: 2px solid #A9C9A4;
font-weight: 600;
```

**Hover State**:
```css
background: #3D5B6B;
color: #F5F5F2;
```

---

#### Mobile Bottom Navigation Bar
```css
position: fixed;
bottom: 0;
left: 0;
right: 0;
background: #FAFAF9;
height: 64px;
border-top: 1px solid rgba(0, 0, 0, 0.1);
box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
display: flex; /* visible on mobile only */
z-index: 50;
```

**Navigation Item**:
```css
display: flex;
flex-direction: column;
align-items: center;
gap: 4px;
padding: 8px 12px;
min-width: 56px;
```

**Icon Circle (Active)**:
```css
width: 40px;
height: 40px;
background: #47685C;
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
```

**Icon (Active)**:
```css
color: #F5F5F2;
width: 24px;
height: 24px;
stroke-width: 2px;
```

**Icon (Inactive)**:
```css
color: #1F1F1F;
width: 24px;
height: 24px;
stroke-width: 1.5px;
background: transparent;
```

**Label**:
```css
font-size: 10px;
font-weight: 500 (inactive) / 600 (active);
color: #5A8070 (inactive) / #47685C (active);
```

---

#### Top Bar (Desktop)
```css
background: #FAFAF9;
height: 64px;
border-bottom: 1px solid #D8D8D3;
box-shadow: 0 1px 3px 0 rgba(31, 31, 31, 0.08);
padding: 0 32px;
display: none; /* hidden on mobile */
```

#### Mobile Header (Sticky)
```css
position: sticky;
top: 0;
z-index: 40;
background: #FAFAF9;
border-bottom: 1px solid #D8D8D3;
padding: 16px;
display: block; /* visible on mobile only */
```

---

## 🧠 4. Layout & Structure

### Grid System
- **Desktop**: 12-column grid
- **Tablet**: 8-column grid
- **Mobile**: 4-column grid

### Base Spacing Scale (8px)
```
4px  → Tight spacing (between icons and text)
8px  → Base unit
12px → Small gaps / Mobile card gaps
16px → Default gap / Mobile padding
24px → Medium gap (desktop card padding)
32px → Large gap (desktop section spacing)
48px → XL gap (major section divisions)
```

### Mobile-Specific Spacing
- **Card padding**: 16px (reduced from 24px)
- **Card gaps**: 12px (reduced from 16px)
- **Section padding**: 16px horizontal (reduced from 32px)
- **Vertical spacing**: 16px (reduced from 32px)
- **Bottom nav height**: 64px with safe area inset

### Elevation & Shadows

#### Light Shadow (cards, inputs)
```css
box-shadow: 0 1px 3px 0 rgba(31, 31, 31, 0.08), 
            0 1px 2px -1px rgba(31, 31, 31, 0.06);
```

#### Medium Shadow (hover states)
```css
box-shadow: 0 4px 12px -2px rgba(31, 31, 31, 0.12), 
            0 2px 6px -2px rgba(31, 31, 31, 0.10);
```

#### Large Shadow (modals, dropdowns)
```css
box-shadow: 0 10px 15px -3px rgba(31, 31, 31, 0.10), 
            0 4px 6px -4px rgba(31, 31, 31, 0.08);
```

### Corner Radius
- **Small (inputs, chips)**: `8px`
- **Medium (buttons, badges)**: `8px`
- **Large (cards)**: `12px`
- **Circular (avatars)**: `50%`

---

## 🎯 5. Icons

**Library**: Lucide Icons (minimalist line style)
**Stroke Width**: `1.5px` (default), `2px` (active states)
**Size**: `20px` (standard), `16px` (small), `24px` (large)

**Color Mapping**:
- Default icons: `#47685C`
- Active icons: `#A9C9A4`
- Disabled icons: `#D8D8D3`

---

## 🌊 6. Motion & Animation

**Philosophy**: Subtle, natural transitions under 200ms. Avoid jarring movements.

### Timing Functions
```css
ease-out: cubic-bezier(0.16, 1, 0.3, 1);  /* For entries */
ease-in: cubic-bezier(0.6, 0, 0.84, 0);   /* For exits */
ease: cubic-bezier(0.4, 0, 0.2, 1);       /* General transitions */
```

### Duration
- **Micro**: `120ms` (hover, focus)
- **Standard**: `180ms` (cards, buttons)
- **Complex**: `300ms` (modals, panels)

### Examples
```css
/* Button hover */
transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);

/* Card lift */
transition: transform 0.18s ease, 
            box-shadow 0.18s ease;

/* Modal fade */
transition: opacity 0.3s ease;
```

---

## ✳️ 7. Brand Personality & Tone

### Visual Mood: **"Data that Breathes"**

GeStock embodies:

✅ **Precision with a natural heart** — reliable, calm, and visually balanced  
✅ **Modern calm with organic intelligence** — where digital management meets natural design  
✅ **Professional yet human** — like a digital workspace inside a modern natural store  

❌ **No harsh whites** — prefer Bone White `#F5F5F2`  
❌ **No synthetic neon colors** — stick to earthy, material tones  
❌ **No cold corporate blues** — use Petroleum Blue with warmth

---

## 📐 8. Design Tokens (CSS Variables)

```css
:root {
  /* Primary - Leaf Green */
  --color-leaf-green-light: #5A8070;
  --color-leaf-green: #47685C;
  --color-leaf-green-dark: #3A5349;
  
  /* Secondary - Petroleum Blue */
  --color-petroleum-light: #3D5B6B;
  --color-petroleum: #2C4653;
  --color-petroleum-dark: #1F3340;
  
  /* Complementary - Light Sand */
  --color-sand-light: #F0E9D9;
  --color-sand: #E6DDC5;
  --color-sand-dark: #D4C9AC;
  
  /* Neutral Light - Bone White */
  --color-bone-lightest: #FAFAF9;
  --color-bone: #F5F5F2;
  --color-bone-dark: #E8E8E4;
  
  /* Neutral Dark - Graphite */
  --color-graphite-light: #3A3A3A;
  --color-graphite: #1F1F1F;
  --color-graphite-dark: #0F0F0F;
  
  /* Accent - Soft Lime Green */
  --color-lime-light: #C3DEC0;
  --color-lime: #A9C9A4;
  --color-lime-dark: #8FB88A;
  
  /* Material - Natural Honey (Warm Copper Wood Tone) */
  --color-honey-light: #D89072;
  --color-honey: #C1643B;
  --color-honey-dark: #B85535;
  
  /* Derived Neutrals */
  --color-neutral-line: #D8D8D3;
  --color-neutral-subtle: #E5E5E0;
  
  /* Typography */
  --font-family-heading: 'Manrope', sans-serif;
  --font-family-body: 'Inter', sans-serif;
  --font-family-mono: 'Roboto Mono', monospace;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-base: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  
  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
}
```

---

## 🧪 9. Usage Guidelines & Best Practices

### DO's ✅

- **Use Leaf Green for primary actions** and brand moments
- **Use Sand backgrounds for chart cards** to soften data-heavy sections
- **Use Petroleum Blue for structural navigation** (sidebars, headers)
- **Maintain 8px spacing scale** across all components
- **Use Roboto Mono for tables and metrics** to ensure alignment
- **Keep shadows soft** (max 15% opacity)
- **Use Bone White instead of pure white** for warmth
- **Pair warm tones (Sand, Honey) with cool tones (Leaf Green, Petroleum)** for balance

### DON'Ts ❌

- **Don't use bright, saturated colors** outside the palette
- **Don't use pure black** — use Graphite `#1F1F1F`
- **Don't create custom shadows** — stick to the 3-tier system
- **Don't use font sizes outside the type scale**
- **Don't mix border radius values** arbitrarily
- **Don't use animations longer than 300ms**

---

## 📊 10. Chart & Data Visualization Colors

### Recommended Chart Palette
1. **Primary Data**: `#47685C` (Leaf Green)
2. **Secondary Data**: `#A9C9A4` (Soft Lime)
3. **Tertiary Data**: `#2C4653` (Petroleum Blue)
4. **Warning Data**: `#C1643B` (Natural Honey - Warm Copper)
5. **Accent Data**: `#5A8070` (Light Leaf Green)

### Chart Backgrounds
- Use **Sand** `#E6DDC5` for chart card backgrounds
- Use **Bone White** `#FAFAF9` for card surfaces without charts

### Grid Lines
- Color: `#D8D8D3` (Neutral Line)
- Opacity: `1.0` (no additional transparency)
- Dash pattern: `3 3`

---

## 🔍 11. Accessibility Standards

### Contrast Ratios (WCAG AA)
- **Body text** (16px): Minimum 4.5:1 against background
- **Large text** (18px+): Minimum 3:1 against background
- **UI components**: Minimum 3:1 against adjacent colors

### Verified Combinations
✅ Graphite `#1F1F1F` on Bone White `#F5F5F2` → **14.8:1**  
✅ Leaf Green `#47685C` on Bone White `#F5F5F2` → **5.2:1**  
✅ Petroleum Blue `#2C4653` on Sand `#E6DDC5` → **6.8:1**  
✅ Bone White `#F5F5F2` on Leaf Green `#47685C` → **5.2:1**  

### Focus Indicators
Always provide visible focus rings:
```css
outline: 2px solid #47685C;
outline-offset: 2px;
```

---

## 📁 12. File Organization (Figma/Code Structure)

### Recommended Figma Structure
```
📂 GeStock Design System
├── 🎨 Foundations
│   ├── Color Palette (with all shades)
│   ├── Typography Scale
│   ├── Spacing System
│   └── Shadows & Elevation
├── 🧱 Components
│   ├── Buttons (Primary, Secondary, Accent, Disabled)
│   ├── Inputs & Fields
│   ├── Chips & Badges
│   ├── Cards
│   ├── Tables
│   └── Navigation (Sidebar, TopBar)
├── 📐 Patterns
│   ├── Dashboard Widgets
│   ├── Charts (Bar, Pie, Line)
│   ├── KPI Cards
│   └── Forms & Modals
└── 📖 Documentation
    ├── Interaction States (hover, active, disabled)
    ├── Usage Guidelines
    └── Accessibility Notes
```

---

## 🚀 13. Implementation Checklist

- [ ] All colors use CSS variables from design tokens
- [ ] Typography uses Manrope, Inter, and Roboto Mono
- [ ] All spacing follows 8px base scale
- [ ] Shadows use the 3-tier system only
- [ ] Border radius is 8px or 12px (no custom values)
- [ ] Buttons follow the defined styles (Primary, Secondary, Accent)
- [ ] Charts use the recommended 5-color palette
- [ ] All text meets WCAG AA contrast standards
- [ ] Focus states are visible and accessible
- [ ] Animations are under 300ms
- [ ] Icons use Lucide with 1.5px stroke weight

---

## 📝 Version History

**v1.0.0** — October 2025  
Initial GeStock Design System with Natural Data palette, complete component library, and accessibility standards.

---

## 🙏 Credits

**GeStock Design System**  
Created for natural shops, local markets, and conscious retail  
Designed by Raíz Digital  

> "Data that breathes. Precision with a natural heart."
