# Contexto
- Proyecto GeStock (Next.js + TS + Tailwind + shadcn/ui).
- Aplicar diseño visual desde tokens sin tocar lógica, formularios ni queries.
- Tokens en `design/design-tokens.json` (light/dark).
- Equivalencias en `design/component-map.md`.

# Alcance Lote A
- Mapear tokens a CSS variables/Tailwind.
- No modificar componentes aún.

# Criterios
- Accesibilidad AA, focus visible, targets ≥ 44px.
- Mantener variantes/props existentes en shadcn.

# Aceptación
- `npm run typecheck` y `npm run build` OK.
- UI refleja tokens (colores, tipo, radios, sombras).
