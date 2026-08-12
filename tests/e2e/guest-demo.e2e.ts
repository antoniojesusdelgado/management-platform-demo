import { expect, test, type Page } from "@playwright/test";

async function enterGuestDemo(page: Page) {
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await enterGuestDemo(page);
});

async function navigateToModule(
  page: Page,
  label: string,
  _mobile: boolean,
) {
  void _mobile;
  const mobileNavigation = page.getByRole("navigation", {
    name: "Navegación móvil",
  });
  if (await mobileNavigation.isVisible()) {
    const menuLabel = label;
    const directLabel =
      label === "Personal" ? "Personas" : ["Inicio", "Analítica"].includes(label) ? label : null;
    if (directLabel) {
      await mobileNavigation.getByRole("button", { name: directLabel, exact: true }).click();
      return;
    }
    await mobileNavigation.getByRole("button", { name: "Más", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Todos los módulos" })
      .getByRole("button", { name: menuLabel, exact: true })
      .click();
    return;
  }

  if (["Personal", "Analítica", "Configuración", "Inicio"].includes(label)) {
    const directLabel = label === "Personal" ? "Personas" : label;
    await page.getByRole("button", { name: directLabel, exact: true }).click();
    return;
  }
  await page.getByRole("button", { name: /Trabajo/ }).click();
  const menuLabel = label;
  await page.getByRole("menuitem", { name: menuLabel, exact: true }).click();
}

test("navigates through every module", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  for (const label of [
    "Vacaciones",
    "Tareas",
    "Incidencias",
    "Tesorería",
    "Nóminas",
    "Personal",
    "Novedades",
    "Configuración",
    "Inicio",
  ]) {
    await navigateToModule(page, label, mobile);
    const heading =
      label === "Inicio"
        ? page.getByRole("heading", {
            name: /^(Buenos días|Buenas tardes|Buenas noches), Usuario invitado$/,
            level: 1,
          })
        : page.getByRole("heading", { name: label, level: 1 });
    await expect(heading).toBeVisible();
  }
});

test("searches globally and opens the selected entity", async ({ page }) => {
  await page.keyboard.press("Control+k");
  const commandCenter = page.getByRole("dialog", { name: "Bandeja de trabajo" });
  await expect(commandCenter).toBeVisible();
  await commandCenter.getByRole("searchbox").fill("soporte");
  const project = commandCenter
    .locator(".workspace-command-item")
    .filter({ hasText: "Experiencia de soporte" })
    .first();
  await expect(project).toBeVisible();
  await project.click();
  await expect(page.getByRole("dialog").filter({ hasText: "Experiencia de soporte" })).toBeVisible();
});

test("derives a unified inbox and opens its source record", async ({ page }) => {
  await page.getByRole("button", { name: "Bandeja", exact: true }).click();
  const commandCenter = page.getByRole("dialog", { name: "Bandeja de trabajo" });
  await expect(commandCenter.getByRole("tab", { name: "Mi bandeja" })).toHaveAttribute("aria-selected", "true");
  const firstItem = commandCenter.locator('.workspace-command-item[data-kind="leave"]').first();
  await expect(firstItem).toBeVisible();
  await firstItem.click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("configures guest operations without contacting external providers", async ({ page }, testInfo) => {
  await navigateToModule(page, "Operaciones", testInfo.project.name === "mobile");
  await expect(page.getByRole("heading", { name: "Operaciones", exact: true })).toBeVisible();

  await page.getByLabel("Nombre").fill("Avisar de tareas prioritarias");
  await page.getByRole("button", { name: "Crear regla" }).click();
  await expect(page.getByText("Avisar de tareas prioritarias", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Integraciones" }).click();
  await expect(page.getByText(/Conexión simulada: no se abre OAuth/).first()).toBeVisible();
  await page.getByRole("button", { name: "Confirmar y crear evento" }).click();
  await expect(page.getByText(/Evento simulado preparado/)).toBeVisible();

  await page.getByRole("tab", { name: "Informes" }).click();
  await page.getByLabel("Nombre").fill("Informe de prueba");
  await page.getByLabel("Destino").selectOption("csv");
  await page.getByRole("button", { name: "Preparar exportación" }).click();
  await expect(page.getByText("Informe de prueba", { exact: true })).toBeVisible();
});

test("creates, approves and restores a leave request", async ({ page }, testInfo) => {
  await navigateToModule(
    page,
    "Vacaciones",
    testInfo.project.name === "mobile",
  );
  await page.getByRole("button", { name: "Nueva solicitud" }).click();
  await page.getByLabel("Fecha inicial").fill("2026-10-05");
  await page.getByLabel("Fecha final").fill("2026-10-07");
  await page.getByLabel("Motivo").fill("Solicitud creada desde la prueba de navegador.");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();

  const row = page.getByRole("row").filter({ hasText: "Usuario invitado" });
  await expect(row).toContainText("Pendiente");
  await row.getByRole("button", { name: /Aprobar solicitud/ }).click();
  await expect(row).toContainText("Aprobada");

  const resetButton = page.getByRole("button", { name: "Restaurar datos" });
  if (!(await resetButton.isVisible())) {
    await page.getByRole("button", { name: "Más", exact: true }).click();
  }
  await resetButton.click();
  await expect(page.getByRole("row").filter({ hasText: "Usuario invitado" })).toHaveCount(0);
});

test("opens a generated request and shows its trace", async ({
  page,
}, testInfo) => {
  await navigateToModule(
    page,
    "Vacaciones",
    testInfo.project.name === "mobile",
  );

  await page.getByRole("button", { name: /Ver detalle/ }).first().click();
  const dialog = page.locator('[role="dialog"]:visible');
  await expect(dialog).toContainText("Trazabilidad");
  await expect(dialog).toContainText("Sistema");
});

test("recalculates Analytics when period, project and section change", async ({
  page,
}, testInfo) => {
  await navigateToModule(page, "Analítica", testInfo.project.name === "mobile");
  const indicators = page.getByRole("region", { name: "Indicadores" });
  const initialText = await indicators.innerText();

  await page
    .getByRole("combobox", { name: "Periodo", exact: true })
    .selectOption("30d");
  await expect(indicators).not.toHaveText(initialText);
  const periodText = await indicators.innerText();

  const projectSelect = page.getByLabel("Proyecto");
  await projectSelect.selectOption({ index: 1 });
  await expect(indicators).not.toHaveText(periodText);

  await page
    .getByRole("button", { name: "Incidencias y tiempos", exact: true })
    .click();
  await expect(indicators).toContainText("Incidencias pendientes");
  await expect(page.getByLabel("Servicio")).toBeVisible();
});

test("renders complete monthly and categorical Analytics series", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "La comprobación de ejes se cubre en escritorio.");
  await navigateToModule(page, "Analítica", false);

  const timelineChart = page.locator(".chart-frame-timeline").first();
  await expect(timelineChart).toBeVisible();
  const timelineTable = page
    .getByRole("table", {
      name: "Alternativa tabular: tareas completadas por mes",
    })
    .locator("tbody tr");
  const timelineRowCount = await timelineTable.count();
  expect(timelineRowCount).toBeGreaterThanOrEqual(12);
  const visibleTimelineTicks = await timelineChart
    .locator(".recharts-xAxis .recharts-cartesian-axis-tick")
    .count();
  expect(visibleTimelineTicks).toBeGreaterThanOrEqual(4);
  expect(visibleTimelineTicks).toBeLessThan(timelineRowCount);

  await page
    .getByRole("button", { name: "Proyectos y tareas", exact: true })
    .click();
  const projectChart = page
    .locator(".analytics-chart-card")
    .filter({ hasText: "Tareas por proyecto" })
    .locator(".chart-frame-categories");
  await expect(projectChart).toBeVisible();
  await expect(
    projectChart.locator(".recharts-yAxis .recharts-cartesian-axis-tick"),
  ).toHaveCount(10);

  await page.getByLabel("Proyecto").selectOption({ index: 1 });
  await expect(
    projectChart.locator(".recharts-yAxis .recharts-cartesian-axis-tick"),
  ).toHaveCount(1);

  await page
    .getByRole("button", { name: "Equipo y disponibilidad", exact: true })
    .click();
  const teamChart = page
    .locator(".analytics-chart-card")
    .filter({ hasText: "Personas activas por equipo" })
    .locator(".chart-frame-categories");
  await expect(
    teamChart.locator(".recharts-yAxis .recharts-cartesian-axis-tick"),
  ).toHaveCount(6);
});

test("cross-filters Analytics and opens contextual detail", async ({
  page,
}, testInfo) => {
  await navigateToModule(page, "Analítica", testInfo.project.name === "mobile");

  await expect(page.getByRole("heading", { name: "Lo que merece atención" })).toBeVisible();
  await page.locator(".analytics-kpi-card").first().click();
  await expect(page.getByText("Detalle contextual", { exact: true })).toBeVisible();
  await expect(page.getByText("Indicadores visibles", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar detalle analítico" }).click();

  await page
    .getByRole("button", { name: "Equipo y disponibilidad", exact: true })
    .click();
  const seriesAction = page
    .locator(".analytics-chart-card")
    .filter({ hasText: "Personas activas por equipo" })
    .locator(".analytics-series-actions button")
    .first();
  const selectedLabel = await seriesAction.innerText();
  await seriesAction.click();
  await expect(page.locator(".analytics-filter-chip")).toContainText(selectedLabel);
  await expect(page.getByText("Detalle contextual", { exact: true })).toBeVisible();
});

test("requires a decision note before rejecting a request", async ({
  page,
}, testInfo) => {
  await navigateToModule(
    page,
    "Vacaciones",
    testInfo.project.name === "mobile",
  );
  await page.getByRole("button", { name: "Nueva solicitud" }).click();
  await page.getByLabel("Fecha inicial").fill("2026-11-02");
  await page.getByLabel("Fecha final").fill("2026-11-04");
  await page.getByLabel("Motivo").fill("Validación del flujo de decisión.");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  const row = page.getByRole("row").filter({ hasText: "Usuario invitado" });
  await row.getByRole("button", { name: /Rechazar solicitud/ }).click();
  const dialog = page.getByRole("alertdialog", { name: "Rechazar solicitud" });
  await dialog.getByRole("button", { name: "Rechazar solicitud" }).click();
  await expect(dialog.getByRole("alert")).toContainText("al menos 3 caracteres");
  await dialog.getByLabel("Nota de decisión").fill("Cobertura insuficiente.");
  await dialog.getByRole("button", { name: "Rechazar solicitud" }).click();
  await expect(row).toContainText("Rechazada");
});

test("restores session-only changes after a reload", async ({ page }, testInfo) => {
  await navigateToModule(
    page,
    "Vacaciones",
    testInfo.project.name === "mobile",
  );
  await page.getByRole("button", { name: "Nueva solicitud" }).click();
  await page.getByLabel("Fecha inicial").fill("2026-10-05");
  await page.getByLabel("Fecha final").fill("2026-10-07");
  await page.getByLabel("Motivo").fill("Comprobación de persistencia de la sesión.");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await enterGuestDemo(page);
  await expect(
    page.getByRole("row").filter({ hasText: "Usuario invitado" }),
  ).toBeVisible();
});

test("creates, progresses and restores a task from the personal inbox", async ({
  page,
}, testInfo) => {
  await navigateToModule(page, "Tareas", testInfo.project.name === "mobile");
  if (testInfo.project.name === "mobile") {
    await page
      .getByRole("button", { name: "Lista", exact: true })
      .click({ force: true });
  }
  await page.getByRole("button", { name: "Nueva tarea" }).click();
  const createDialog = page.getByRole("dialog", { name: "Nueva tarea" });
  await createDialog.getByLabel("Título").fill("Preparar validación del tablero");
  await createDialog
    .getByLabel("Descripción")
    .fill("Comprobar el flujo invitado sin datos profesionales reales.");
  await createDialog.getByLabel("Prioridad", { exact: true }).selectOption("high");
  await createDialog.getByLabel("Responsable", { exact: true }).selectOption("Usuario invitado");
  await createDialog.getByLabel("Fecha límite").fill("2026-08-12");
  await createDialog.getByRole("button", { name: "Guardar tarea" }).click();

  const task = page.getByRole("button", { name: /Preparar validación del tablero/ });
  await task.click();
  const detail = page.getByRole("dialog", { name: "Preparar validación del tablero" });
  await expect(detail).toContainText("Pendiente");
  await detail.getByLabel("Nota de actividad").fill("Trabajo iniciado en la demo.");
  await detail.getByRole("button", { name: "En curso" }).click();
  await expect(detail).toContainText("En curso");
  await detail.getByLabel("Nuevo comentario").fill("Primer avance registrado.");
  await detail.getByRole("button", { name: "Comentar" }).click();
  await expect(detail).toContainText("Primer avance registrado.");
  await detail.getByRole("button", { name: "Cerrar detalle" }).click();

  await page.reload({ waitUntil: "domcontentloaded" });
  await enterGuestDemo(page);
  if (testInfo.project.name === "mobile") {
    await page
      .getByRole("button", { name: "Lista", exact: true })
      .click({ force: true });
  }
  await page.getByRole("button", { name: /Preparar validación del tablero/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Preparar validación del tablero" }),
  ).toContainText("En curso");
});

test("registers, triages and restores an incident", async ({ page }, testInfo) => {
  await navigateToModule(page, "Incidencias", testInfo.project.name === "mobile");
  await page.getByRole("button", { name: "Nueva incidencia" }).click();
  const createDialog = page.getByRole("dialog", { name: "Nueva incidencia" });
  await createDialog.getByLabel("Título").fill("Acceso bloqueado al panel");
  await createDialog.getByLabel("Descripción").fill("Caso demostrativo sin información profesional real.");
  await createDialog.getByLabel("Prioridad").selectOption("high");
  await createDialog.getByLabel("Categoría").selectOption("access");
  await createDialog.getByRole("button", { name: "Guardar" }).click();

  const incident = page.getByRole("button", { name: /Acceso bloqueado al panel/ });
  await expect(incident).toContainText("Registrada");
  await incident.click();
  const detail = page.getByRole("dialog", { name: "Acceso bloqueado al panel" });
  await detail.getByLabel("Nota de decisión").fill("Prioridad revisada en la demo.");
  await detail.getByRole("button", { name: "Priorizada" }).click();
  await expect(detail).toContainText("Prioridad revisada en la demo.");
  await page.keyboard.press("Escape");

  await page.reload({ waitUntil: "domcontentloaded" });
  await enterGuestDemo(page);
  await expect(page.getByRole("button", { name: /Acceso bloqueado al panel/ })).toContainText("Priorizada");
});

test("adds a safe synthetic person profile", async ({ page }, testInfo) => {
  await navigateToModule(page, "Personal", testInfo.project.name === "mobile");
  await page.getByRole("button", { name: "Añadir perfil" }).click();
  const dialog = page.getByRole("dialog", { name: "Añadir perfil" });
  await dialog.getByLabel("Nombre").fill("Perfil de prueba");
  const teamSelect = dialog.getByLabel("Equipo");
  await expect(teamSelect).toHaveRole("combobox");
  await expect(teamSelect.locator("option")).toContainText([
    "Selecciona un equipo",
    "Administración",
    "Atención",
    "Datos",
    "Operaciones",
    "Producto",
    "Tecnología",
  ]);
  await teamSelect.selectOption("Operaciones");
  await dialog.getByLabel("Puesto").fill("Puesto demostrativo");
  await dialog.getByLabel("Estado").selectOption("active");
  await dialog.getByLabel("Rol").selectOption("viewer");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: /Perfil de prueba/ })).toContainText("Operaciones");
});

test("filters and paginates the people directory", async ({ page }, testInfo) => {
  await navigateToModule(page, "Personal", testInfo.project.name === "mobile");

  await expect(page.getByRole("navigation", { name: "Paginación del directorio" })).toBeVisible();
  await page.getByRole("button", { name: /Siguiente/ }).click();
  await expect(page.getByText(/Página 2 de/)).toBeVisible();

  await page.getByLabel("Buscar perfiles").fill("Lucía");
  const visibleCards = page.locator(".people-card");
  await expect(visibleCards.first()).toBeVisible();
  expect(
    await visibleCards.evaluateAll((cards) =>
      cards.every((card) => card.textContent?.includes("Lucía")),
    ),
  ).toBe(true);

  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await page.getByRole("button", { name: "Organigrama" }).click();
  const organization = page.getByLabel("Organigrama por equipos");
  await expect(organization.locator(".organization-team-card")).toHaveCount(6);
  await organization.locator(".organization-team-card", { hasText: "Operaciones" }).click();
  await expect(organization.getByRole("heading", { name: "Operaciones" })).toBeVisible();
  await expect(organization.locator(".organization-node").first()).toBeVisible();
});

test("creates, reviews and publishes a changelog entry", async ({ page }, testInfo) => {
  await navigateToModule(page, "Novedades", testInfo.project.name === "mobile");
  await expect(page.locator(".changelog-card").first()).toContainText("Versión 1.8.1");
  await page.getByRole("button", { name: "Preparar novedad" }).click();
  const createDialog = page.getByRole("dialog", { name: "Nueva novedad" });
  await createDialog.getByLabel("Versión").fill("99.0.0");
  await createDialog.getByLabel("Título").fill("Mejoras en el seguimiento de proyectos");
  await createDialog.getByLabel("Resumen").fill("Contenido demostrativo sin referencias profesionales reales.");
  await createDialog.getByRole("button", { name: "Guardar borrador" }).click();
  const entry = page.getByRole("button", { name: /Mejoras en el seguimiento de proyectos/ });
  await expect(entry).toContainText("Borrador");
  await entry.click();
  const detail = page.getByRole("dialog", { name: "Mejoras en el seguimiento de proyectos" });
  await detail.getByLabel("Nota de decisión").fill("Contenido enviado a revisión.");
  await detail.getByRole("button", { name: "En revisión" }).click();
  await expect(detail).toContainText("Contenido enviado a revisión.");
  await detail.getByLabel("Nota de decisión").fill("Contenido revisado y preparado.");
  await detail.getByRole("button", { name: "Publicada" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Vista publicada" }).click();
  await expect(page.getByRole("button", { name: /Mejoras en el seguimiento de proyectos/ })).toBeVisible();
});

test("creates, closes and restores an aggregated Treasury entry", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await navigateToModule(page, "Tesorería", testInfo.project.name === "mobile");
  const treasury = page.getByRole("main");
  await treasury.getByRole("button", { name: "Nuevo movimiento" }).click();
  const createDialog = page.getByRole("dialog", { name: "Nuevo movimiento" });
  await createDialog.getByLabel("Fecha").fill("2026-07-22");
  await createDialog.getByLabel("Concepto").fill("Ajuste de cierre mensual");
  await createDialog.getByLabel("Importe").fill("-245.50");
  await createDialog.getByRole("button", { name: "Guardar borrador" }).click();

  const entry = treasury.getByRole("button", { name: /Ajuste de cierre mensual/ });
  await expect(entry).toContainText("Borrador");
  await entry.click();
  const detail = page.getByRole("dialog", { name: "Ajuste de cierre mensual" });
  for (const transition of [
    { button: "Marcar como registrado", note: "Registro comprobado.", status: "Registrado" },
    { button: "Marcar como conciliado", note: "Conciliación completada.", status: "Conciliado" },
    { button: "Marcar como validado", note: "Validación completada.", status: "Validado" },
    { button: "Marcar como cerrado", note: "Cierre completado.", status: "Cerrado" },
  ]) {
    await detail.getByLabel("Nota de decisión").fill(transition.note);
    await detail.getByRole("button", { name: transition.button }).click();
    await expect(detail).toContainText(transition.status);
  }
  await page.keyboard.press("Escape");

  await page.reload({ waitUntil: "domcontentloaded" });
  await enterGuestDemo(page);
  await expect(page.getByRole("button", { name: /Ajuste de cierre mensual/ })).toContainText("Cerrado");
});

test("creates, closes and restores an aggregated Payroll cycle", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await navigateToModule(page, "Nóminas", testInfo.project.name === "mobile");
  const payroll = page.getByRole("main");
  await payroll.getByRole("button", { name: "Nuevo ciclo" }).click();
  const createDialog = page.getByRole("dialog", { name: "Nuevo ciclo" });
  await createDialog.getByLabel("Inicio").fill("2026-09-01");
  await createDialog.getByLabel("Fin").fill("2026-09-30");
  await createDialog.getByLabel("Personas incluidas").fill("20");
  await createDialog.getByLabel("Bruto agregado").fill("5800");
  await createDialog.getByLabel("Deducciones agregadas").fill("1080");
  await createDialog.getByLabel("Notas").fill("Ciclo mensual preparado para revisión.");
  await createDialog.getByRole("button", { name: "Guardar ciclo" }).click();

  const run = payroll.locator(".treasury-row").filter({ hasText: "20 personas" }).first();
  await expect(run).toContainText("Recopilación");
  await expect(run).toContainText(/4\.720,00\s€ neto/);
  await run.click();
  const detail = page.getByRole("dialog", { name: /sept 2026/ });
  for (const transition of [
    { button: "Marcar como validación", note: "Datos agregados comprobados.", status: "Validación" },
    { button: "Marcar como calculado", note: "Totales agregados calculados.", status: "Calculado" },
    { button: "Marcar como revisado", note: "Totales agregados revisados.", status: "Revisado" },
    { button: "Marcar como cerrado", note: "Ciclo agregado cerrado.", status: "Cerrado" },
  ]) {
    await detail.getByLabel("Nota de decisión").fill(transition.note);
    await detail.getByRole("button", { name: transition.button }).click();
    await expect(detail).toContainText(transition.status);
  }
  await page.keyboard.press("Escape");
  await page.reload({ waitUntil: "domcontentloaded" });
  await enterGuestDemo(page);
  await expect(
    page.locator(".treasury-row").filter({ hasText: "20 personas" }).first(),
  ).toContainText("Cerrado");
});

test("shows payroll participants without amounts and opens the team chart", async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  await navigateToModule(page, "Nóminas", mobile);
  await page.locator(".treasury-row").first().click();
  const payrollDetail = page.locator('[role="dialog"]:visible');
  await expect(
    payrollDetail.getByRole("heading", { name: "Personas incluidas" }),
  ).toBeVisible();
  await expect(payrollDetail.getByLabel("Buscar")).toBeVisible();
  await expect(payrollDetail.getByLabel("Equipo")).toBeVisible();
  await expect(payrollDetail.locator(".payroll-participant-list article")).toHaveCount(8);
  await payrollDetail.getByLabel("Buscar").fill("Lucía");
  const filteredParticipants = payrollDetail.locator(
    ".payroll-participant-list article",
  );
  await expect(filteredParticipants.first()).toBeVisible();
  expect(
    await filteredParticipants.evaluateAll((items) =>
      items.every((item) => item.textContent?.includes("Lucía")),
    ),
  ).toBe(true);
  await expect(payrollDetail).not.toContainText(/bruto individual|neto individual|salario individual/i);
  await page.keyboard.press("Escape");

  await navigateToModule(page, "Personal", mobile);
  await page.getByRole("button", { name: "Organigrama" }).click();
  const organization = page.getByLabel("Organigrama por equipos");
  await expect(organization.locator(".organization-team-card")).toHaveCount(6);
  await expect(organization.getByText("Responsable").first()).toBeVisible();
});

test("configures modules and audits role metadata independently", async ({ page }, testInfo) => {
  await navigateToModule(page, "Configuración", testInfo.project.name === "mobile");
  const settings = page.getByRole("main");
  await settings.getByRole("button", { name: "Módulos" }).click();
  const treasuryRow = settings.getByRole("listitem").filter({ hasText: "Tesorería" });
  await treasuryRow.getByRole("checkbox").uncheck();
  await settings.getByRole("button", { name: "Roles y permisos" }).click();
  await settings.getByRole("button", { name: "Responsable" }).click();
  const permission = settings.getByRole("checkbox", { name: /tasks\.items\.manage/ });
  const checkedBefore = await permission.isChecked();
  await settings.getByLabel("Nombre").fill("Coordinación demo");
  await settings.getByRole("button", { name: "Guardar metadatos" }).click();
  expect(await permission.isChecked()).toBe(checkedBefore);
  await settings.getByRole("button", { name: "Auditoría" }).click();
  await expect(settings.getByText("Nombre o color del rol actualizado sin alterar permisos.")).toBeVisible();
  await expect(settings.getByText("Módulo tesoreria actualizado.")).toBeVisible();
});

test("mobile navigation opens and closes with Escape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  const moreButton = page.getByRole("button", { name: "Más", exact: true });
  await moreButton.click();
  await expect(page.getByRole("dialog", { name: "Todos los módulos" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Todos los módulos" })).toBeHidden();
  await expect(moreButton).toBeFocused();
});
