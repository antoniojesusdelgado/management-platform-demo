# Design QA — v1.2.0

## Visual truth and implementation

- Previous access screen: `.artifacts/access-desktop.png` and `.artifacts/access-mobile.png`.
- v1.2.0 implementation: `.artifacts/release-v1.2/acceso-desktop.png` and `.artifacts/release-v1.2/acceso-mobile.png`.
- Combined comparison evidence: `.artifacts/release-v1.2/qa-access-desktop.png` and `.artifacts/release-v1.2/qa-access-mobile.png`.
- Desktop viewport: 1440 × 900.
- Mobile viewport: 390 × 844.
- State: public access page, light color scheme, reduced motion enabled.
- Focused evidence: Vacation and People dialogs, filtered Analytics, Payroll, Tasks and Changelog captures in `.artifacts/release-v1.2`.

## Intended differences

- The product screenshot was removed from the access page.
- The access page now uses the selected sober composition: navy header, concise introduction and a separate sign-in card.
- Google is the primary action and uses the official multicolor G asset.
- Guest access is labelled `Probar sin iniciar sesión`.
- Decorative imagery, gradients and promotional copy were intentionally removed.

## QA history

### Pass 1

- P1 responsiveness: the mobile legal copy extended beyond the 844 px viewport.
  - Fix: reduced mobile vertical spacing and card padding while preserving readable tap targets.
- P1 layout behavior: the document owned the scroll and the sticky sidebar was clipped when a dialog opened.
  - Fix: moved scrolling to `app-main`, fixed the sidebar to `100dvh` and kept the dialog overlay viewport-bound.
- P2 task board behavior: pagination ran before Kanban grouping and hid the `En revisión` column contents.
  - Fix: the Kanban now receives all 50 open tasks plus a small recent completed sample; list pagination remains independent.

### Pass 2

- Desktop access hierarchy, spacing, typography, colors, icons and controls match the selected direction.
- Mobile access fits within 390 × 844 without horizontal overflow or clipped actions.
- Dialog headers, close controls and actions remain visible at page scroll depth.
- Vacation table alignment follows the shared convention for text, quantities, states and actions.
- Analytics filters visibly change the KPI and series content.
- No generated illustrations, stock portraits, CSS drawings or placeholder imagery remain in the access experience.

## Final result

passed
