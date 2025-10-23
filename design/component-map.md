# Component Map (Figma → Código shadcn/ui)
- Button / Primary       → `@/components/ui/button` (variant: `primary`)
- Button / Secondary     → `@/components/ui/button` (variant: `secondary`)
- Button / Ghost         → `@/components/ui/button` (variant: `ghost`)
- Input / TextField      → `@/components/ui/input`
- Card / Surface         → `@/components/ui/card`
- Badge / Chip           → `@/components/ui/badge`
- Dialog / Modal         → `@/components/ui/dialog`
- Sheet / Drawer         → `@/components/ui/sheet`
- Sidebar (bg/fg/accents) → tokens `system.sidebar*`

Notas:
- Densidad móvil: botones con altura táctil ≥ 44px; listas compactas.
- Anillos de foco visibles (`ring` de tokens).
