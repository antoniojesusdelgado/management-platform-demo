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

test("mobile navigation opens and closes with Escape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.getByRole("button", { name: "Abrir menú de módulos" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Abrir menú de módulos" })).toBeFocused();
});
