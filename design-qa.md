# Design QA

## Release v1.1.0 — SaaS empresarial

### Alcance revisado

- Acceso compartido en `/` y `/login`.
- Inicio, Vacaciones, Analítica, Proyectos, Tareas, Incidencias, Tesorería,
  Nóminas, Personal, Novedades, Configuración y Perfil.
- Vista invitada con datos ficticios y vista OAuth con almacenamiento privado
  del avatar del usuario.
- Anchuras comprobadas: 320, 360, 390, 768, 1024 y 1440 px.

### Decisiones visuales

- Superficies blancas y grises, navegación navy, acento índigo moderado,
  sombras ligeras y radios de 8–12 px.
- Movimiento limitado a transiciones funcionales de 120–180 ms y desactivado
  cuando el navegador solicita movimiento reducido.
- Las personas ficticias se representan con iniciales y colores deterministas.
- Los estados vacíos usan iconos de Tabler. No se utilizan retratos, fotografías
  de stock ni ilustraciones generadas.
- La única imagen destacada es
  `public/images/product-overview.webp`, una captura optimizada de la propia
  aplicación.

### Contenido

- La interfaz usa lenguaje directo en español. Analítica concentra los
  indicadores y elimina las secciones repetidas dentro de cada módulo.
- El aviso sobre datos ficticios aparece en el acceso y como indicador global
  discreto; no se repite en títulos ni registros operativos.
- `docs/CONTENT-GUIDE.md` recoge las reglas editoriales y
  `bun run content:validate` las aplica en CI.

### Responsive y accesibilidad

- No hay overflow horizontal global en las seis anchuras revisadas.
- Las tablas mantienen cabeceras visibles dentro de un contenedor desplazable.
- Kanban desplaza horizontalmente solo dentro de su panel.
- Filtros e indicadores pasan a una columna en móvil.
- Los diálogos respetan la altura disponible y la navegación principal funciona
  con teclado.
- Axe no detecta infracciones WCAG A/AA en los 18 recorridos de escritorio y
  móvil incluidos.

### Evidencia local

Las capturas se generan con `bun run visual:review` en
`.artifacts/release-v1.1/`. Incluyen Acceso, Inicio y los diez módulos en
1440 × 900 y 390 × 844. El asset público se regenera con
`bun run visual:capture`.

### Resultado

- `bun run e2e`: 45 pruebas superadas y 3 omisiones intencionales por proyecto.
- `bun run e2e:a11y`: 18 pruebas superadas.
- `bun run build`: compilación de producción correcta.
- La comprobación de Supabase local queda pendiente porque el motor de Docker
  Desktop no está disponible en esta sesión.

No quedan hallazgos visuales P0, P1 o P2 en la revisión local.
