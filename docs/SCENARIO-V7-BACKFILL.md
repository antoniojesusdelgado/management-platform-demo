# Procedimiento de actualización histórica de Scenario V7

## Objetivo

Completar el histórico V7 que falte en organizaciones autenticadas antiguas sin
eliminar ni sobrescribir registros del usuario.
`scenario_generated_through_date` controla el horizonte diario y
`scenario_v7_backfilled_at` confirma de forma independiente que la carga
histórica se completó.

## Validación local

```powershell
bunx supabase db reset --local
bunx supabase test db
bunx supabase db lint --local --level warning --fail-on error
bunx supabase gen types --lang typescript --local
```

Los casos de aceptación obligatorios son: una organización antigua, una
organización nueva, una segunda llamada idempotente, la conservación de una fila
editada y entre 245 y 255 personas activas en el horizonte actual.

## Procedimiento remoto

1. Registrar los recuentos de `people`, `tasks`, `leave_requests`, `incidents`,
   `treasury_entries`, `payroll_runs`, `integration_runs` y
   `scenario_evolution_events`.
2. Ejecutar `supabase db push --dry-run` y revisar la secuencia de migraciones
   pendiente.
3. Aplicar la migración. Bloquea una organización cada vez y completa
   automáticamente las organizaciones con una pertenencia activa.
4. Volver a consultar los recuentos, la marca
   `scenario_v7_backfilled_at`, el único evento `backfilled` y el evento de
   auditoría.
5. Iniciar sesión con la identidad de Google existente y recorrer la ruta
   protegida `ensure_demo_scenario_current` mediante la entrada normal de la
   aplicación.
6. Confirmar que las filas editadas no cambian y que una segunda llamada no
   genera eventos duplicados.

No deben invocarse RPC antiguas de restauración ni forzarse un número exacto de
filas. Los registros manuales existentes pueden hacer que el histórico total
supere el escenario ficticio de referencia.

## Normalización del directorio en v1.3.2

La versión v1.3.2 no repite la actualización histórica. Relaciona los
identificadores deterministas `person-v7` existentes con los mismos 266 nombres
ficticios únicos del generador invitado y modifica únicamente las filas cuyo
nombre visible todavía empieza por `Persona sint`. Un trigger privado aplica la
misma correspondencia a futuras inserciones incrementales de V7.

Antes y después de aplicar la migración deben registrarse, por organización, el
total de personas, los nombres provisionales, los nombres distintos y los
duplicados. El total y los identificadores deben permanecer sin cambios; los
nombres provisionales y los grupos duplicados deben quedar a cero.

## Reversión

La migración es aditiva y sus identificadores son deterministas. No deben
eliminarse automáticamente las filas generadas durante una reversión porque
pueden haber sido editadas. Si es necesario volver a una versión anterior de la
aplicación, se restaura el despliegue previo, se conserva el esquema compatible
y se investiga cada organización mediante los eventos de auditoría y evolución.
