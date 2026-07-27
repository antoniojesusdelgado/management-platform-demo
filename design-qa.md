# Design QA — v1.2.1

## Reference

- Approved access design: `C:\Users\anton\Downloads\Imagen generada 1.png`
- Reference viewport: 1486 × 1058 px
- Final comparison: `.artifacts/release-v1.2.1/acceso-comparison.png`

## Visual review

- Access: the brand, heading, supporting copy and data notice align with the approved left panel. The existing access card and both authentication paths remain unchanged.
- Navigation: the desktop module trigger is removed; the mobile menu trigger remains available.
- Analytics: tabs wrap without a visible scrollbar, monthly series use line charts and categorical series use horizontal bars with complete labels.
- Projects: cards expose project status while health remains secondary in the detail.
- Dialogs: headers and close controls remain fixed while dialog bodies scroll independently.
- Treasury and payroll: summaries use consistent hierarchy, tabular figures and separated metric labels and values.
- Settings: related actions have explicit spacing and destructive actions are visually separated.

## Responsive review

Reviewed at 320, 360, 390, 768, 1024 and 1440 px through the Playwright responsive suite and release captures.

- No global horizontal overflow.
- Mobile navigation remains operable.
- Charts and their accessible tables remain readable.
- Dialog close controls and actions remain accessible.
- Settings action groups stack on narrow screens.

## Result

Passed for release validation.
