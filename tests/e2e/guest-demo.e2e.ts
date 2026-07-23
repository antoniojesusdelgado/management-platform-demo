import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
});

async function navigateToModule(
  page: Page,
  label: string,
  mobile: boolean,
) {
  if (mobile) {
    await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  }
  const navigation = page
    .getByRole("navigation", { name: "Módulos de la plataforma" })
    .filter({ visible: true });
  await navigation.getByRole("button", { name: label, exact: true }).click();
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
    await expect(page.getByRole("heading", { name: label, level: 1 })).toBeVisible();
  }
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
  await page.getByLabel("Motivo").fill("Solicitud sintética desde Playwright.");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();

  const row = page.getByRole("row").filter({ hasText: "Usuario invitado" });
  await expect(row).toContainText("Pendiente");
  await row.getByRole("button", { name: /Aprobar solicitud/ }).click();
  await expect(row).toContainText("Aprobada");

  await page.getByRole("button", { name: "Restaurar demo" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Usuario invitado" })).toHaveCount(0);
});

test("reviews a draft request and records its transition", async ({
  page,
}, testInfo) => {
  await navigateToModule(
    page,
    "Vacaciones",
    testInfo.project.name === "mobile",
  );

  const draftRow = page.getByRole("row").filter({ hasText: "Marta Soler" });
  await draftRow.getByRole("button", { name: /Ver detalle/ }).click();
  const dialog = page.getByRole("dialog", { name: "Marta Soler" });
  await expect(dialog).toContainText("Descanso anual pendiente de revisión");
  await dialog.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(dialog).toContainText("Pendiente");
  await expect(dialog).toContainText("Borrador enviado a revisión");
});

test("requires a decision note before rejecting a request", async ({
  page,
}, testInfo) => {
  await navigateToModule(
    page,
    "Vacaciones",
    testInfo.project.name === "mobile",
  );
  const row = page.getByRole("row").filter({ hasText: "Elena Martín" });
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
  await page.getByLabel("Motivo").fill("Persistencia sintética de la sesión.");
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Usuario invitado" }),
  ).toBeVisible();
});

test("creates, progresses and restores a task from the personal inbox", async ({
  page,
}, testInfo) => {
  await navigateToModule(page, "Tareas", testInfo.project.name === "mobile");
  await page.getByRole("button", { name: "Nueva tarea" }).click();
  const createDialog = page.getByRole("dialog", { name: "Nueva tarea" });
  await createDialog.getByLabel("Título").fill("Preparar validación sintética");
  await createDialog
    .getByLabel("Descripción")
    .fill("Comprobar el flujo invitado sin datos profesionales reales.");
  await createDialog.getByLabel("Prioridad", { exact: true }).selectOption("high");
  await createDialog.getByLabel("Responsable", { exact: true }).selectOption("Usuario invitado");
  await createDialog.getByLabel("Fecha límite").fill("2026-08-12");
  await createDialog.getByRole("button", { name: "Guardar tarea" }).click();

  const task = page.getByRole("button", { name: /Preparar validación sintética/ });
  await expect(task).toContainText("Pendiente");
  await task.click();
  const detail = page.getByRole("dialog", { name: "Preparar validación sintética" });
  await detail.getByLabel("Nota de actividad").fill("Trabajo iniciado en la demo.");
  await detail.getByRole("button", { name: "En curso" }).click();
  await expect(detail).toContainText("En curso");
  await detail.getByLabel("Nuevo comentario").fill("Primer avance sintético.");
  await detail.getByRole("button", { name: "Comentar" }).click();
  await expect(detail).toContainText("Primer avance sintético.");
  await detail.getByRole("button", { name: "Cerrar detalle" }).click();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Preparar validación sintética/ }),
  ).toContainText("En curso");
});

test("registers, triages and restores an incident", async ({ page }, testInfo) => {
  await navigateToModule(page, "Incidencias", testInfo.project.name === "mobile");
  await page.getByRole("button", { name: "Nueva incidencia" }).click();
  const createDialog = page.getByRole("dialog", { name: "Nueva incidencia" });
  await createDialog.getByLabel("Título").fill("Acceso sintético bloqueado");
  await createDialog.getByLabel("Descripción").fill("Caso demostrativo sin información profesional real.");
  await createDialog.getByLabel("Prioridad").selectOption("high");
  await createDialog.getByLabel("Categoría").selectOption("access");
  await createDialog.getByRole("button", { name: "Guardar" }).click();

  const incident = page.getByRole("button", { name: /Acceso sintético bloqueado/ });
  await expect(incident).toContainText("Registrada");
  await incident.click();
  const detail = page.getByRole("dialog", { name: "Acceso sintético bloqueado" });
  await detail.getByLabel("Nota de decisión").fill("Prioridad revisada en la demo.");
  await detail.getByRole("button", { name: "Priorizada" }).click();
  await expect(detail).toContainText("Prioridad revisada en la demo.");
  await page.keyboard.press("Escape");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /Acceso sintético bloqueado/ })).toContainText("Priorizada");
});

test("adds a safe synthetic person profile", async ({ page }, testInfo) => {
  await navigateToModule(page, "Personal", testInfo.project.name === "mobile");
  await page.getByRole("button", { name: "Añadir perfil" }).click();
  const dialog = page.getByRole("dialog", { name: "Añadir perfil sintético" });
  await dialog.getByLabel("Nombre").fill("Perfil de prueba");
  await dialog.getByLabel("Equipo").fill("Equipo demo");
  await dialog.getByLabel("Puesto").fill("Puesto demostrativo");
  await dialog.getByLabel("Estado").selectOption("active");
  await dialog.getByLabel("Rol").selectOption("viewer");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: /Perfil de prueba/ })).toContainText("Disponible");
});

test("creates, reviews and publishes a changelog entry", async ({ page }, testInfo) => {
  await navigateToModule(page, "Novedades", testInfo.project.name === "mobile");
  await page.getByRole("button", { name: "Nueva entrada" }).click();
  const createDialog = page.getByRole("dialog", { name: "Nueva novedad" });
  await createDialog.getByLabel("Versión").fill("0.6.0");
  await createDialog.getByLabel("Título").fill("Novedad sintética de Playwright");
  await createDialog.getByLabel("Resumen").fill("Contenido demostrativo sin referencias profesionales reales.");
  await createDialog.getByRole("button", { name: "Guardar borrador" }).click();
  const entry = page.getByRole("button", { name: /Novedad sintética de Playwright/ });
  await expect(entry).toContainText("Borrador");
  await entry.click();
  const detail = page.getByRole("dialog", { name: "Novedad sintética de Playwright" });
  await detail.getByLabel("Nota de decisión").fill("Contenido enviado a revisión.");
  await detail.getByRole("button", { name: "En revisión" }).click();
  await expect(detail).toContainText("Contenido enviado a revisión.");
  await detail.getByLabel("Nota de decisión").fill("Contenido sintético revisado.");
  await detail.getByRole("button", { name: "Publicada" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Vista publicada" }).click();
  await expect(page.getByRole("button", { name: /Novedad sintética de Playwright/ })).toBeVisible();
});

test("creates, closes and restores an aggregated Treasury entry", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await navigateToModule(page, "Tesorería", testInfo.project.name === "mobile");
  const treasury = page.getByRole("main");
  await treasury.getByRole("button", { name: "Nuevo movimiento" }).click();
  const createDialog = page.getByRole("dialog", { name: "Nuevo movimiento sintético" });
  await createDialog.getByLabel("Fecha").fill("2026-07-22");
  await createDialog.getByLabel("Concepto agregado").fill("Ajuste agregado sintético");
  await createDialog.getByLabel("Importe sintético").fill("-245.50");
  await createDialog.getByRole("button", { name: "Guardar borrador" }).click();

  const entry = treasury.getByRole("button", { name: /Ajuste agregado sintético/ });
  await expect(entry).toContainText("Borrador");
  await entry.click();
  const detail = page.getByRole("dialog", { name: "Ajuste agregado sintético" });
  for (const transition of [
    { button: "Marcar como registrado", note: "Registro sintético comprobado.", status: "Registrado" },
    { button: "Marcar como conciliado", note: "Conciliación sintética completada.", status: "Conciliado" },
    { button: "Marcar como validado", note: "Validación sintética completada.", status: "Validado" },
    { button: "Marcar como cerrado", note: "Cierre sintético completado.", status: "Cerrado" },
  ]) {
    await detail.getByLabel("Nota de decisión").fill(transition.note);
    await detail.getByRole("button", { name: transition.button }).click();
    await expect(detail).toContainText(transition.status);
  }
  await page.keyboard.press("Escape");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /Ajuste agregado sintético/ })).toContainText("Cerrado");
});

test("creates, closes and restores an aggregated Payroll cycle", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await navigateToModule(page, "Nóminas", testInfo.project.name === "mobile");
  const payroll = page.getByRole("main");
  await payroll.getByRole("button", { name: "Nuevo ciclo" }).click();
  const createDialog = page.getByRole("dialog", { name: "Nuevo ciclo sintético" });
  await createDialog.getByLabel("Inicio").fill("2026-09-01");
  await createDialog.getByLabel("Fin").fill("2026-09-30");
  await createDialog.getByLabel("Personas sintéticas").fill("20");
  await createDialog.getByLabel("Bruto agregado").fill("5800");
  await createDialog.getByLabel("Deducciones agregadas").fill("1080");
  await createDialog.getByLabel("Notas agregadas").fill("Ciclo agregado sintético de Playwright.");
  await createDialog.getByRole("button", { name: "Guardar ciclo" }).click();

  const run = payroll.getByRole("button").filter({ hasText: "1/9/2026" }).first();
  await expect(run).toContainText("Recopilación");
  await expect(run).toContainText("4720,00 € neto");
  await run.click();
  const detail = page.getByRole("dialog", { name: /1\/9\/2026/ });
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
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
  await expect(page.getByRole("button").filter({ hasText: "1/9/2026" }).first()).toContainText("Cerrado");
});

test("configures modules and audits role metadata independently", async ({ page }, testInfo) => {
  await navigateToModule(page, "Configuración", testInfo.project.name === "mobile");
  const settings = page.getByRole("main");
  await settings.getByRole("button", { name: "Módulos" }).click();
  const treasuryRow = settings.getByRole("listitem").filter({ hasText: "Tesorería" });
  await treasuryRow.getByRole("checkbox").uncheck();
  await settings.getByRole("button", { name: "Roles y permisos" }).click();
  await settings.getByRole("button", { name: "Responsable" }).click();
  const permission = settings.getByRole("checkbox", { name: /Tareas · gestionar/ });
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
  await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Abrir menú de módulos" })).toBeFocused();
});
