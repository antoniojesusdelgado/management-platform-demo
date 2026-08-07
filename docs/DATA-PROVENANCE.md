# Procedencia de los datos

## Finalidad y límite de seguridad

La demo pública contiene únicamente registros ficticios deterministas. No se
conecta en ejecución a una base de datos SQL pública, no copia filas de fuentes
externas ni conserva nombres, direcciones, identificadores, descripciones de
transacciones, documentos, números de cuenta, retribuciones individuales u
otros valores de origen.

El escenario estándar se genera en `src/demo-data/scenario.ts`. Una misma
semilla y fecha de referencia producen siempre el mismo grafo de entidades
ficticias. La configuración de referencia es:

- Versión del escenario: `7`
- Contrato de estado invitado: `GuestDemoState V19`
- Semilla: `management-platform-standard-v7`
- Intervalo visible: `2025-01-01` a `2026-08-06`
- Fecha de referencia: `2026-08-06`
- SHA-256 del contenido generado:
  `3e12a2fb2cebeb63bfb0400fa0a894f2a6fa2f0c39b03d68c63209bcccb4d73e`
- Verificado el: `2026-08-07`

## Fuentes de referencia

### Microsoft AdventureWorks

- Publica: Microsoft
- Fuente:
  <https://github.com/microsoft/sql-server-samples/tree/master/samples/databases/adventure-works>
- Licencia: MIT, según la raíz del repositorio
- Versión de referencia: rama `master`, documentación revisada el `2026-07-23`
- Recurso local de origen: ninguno
- Checksum del recurso: no aplicable; este repositorio no incluye ni procesa
  copias de seguridad, SQL, filas ni archivos de la fuente
- Transformación: el adaptador opcional sin conexión acepta solo cuatro
  agregados aportados por quien lo ejecuta: número de departamentos, categorías
  de producto, pedidos y mediana de líneas por pedido. Produce proporciones
  acotadas para calibrar un grafo ficticio completamente nuevo.
- Atribución: “Base de datos de ejemplo AdventureWorks, Microsoft; licencia
  MIT.”

### Instituto Nacional de Estadística (INE)

- Publica: Instituto Nacional de Estadística, España
- Fuente: <https://www.ine.es/datosabiertos/>
- Licencia: Creative Commons Attribution 4.0 International, según la página de
  Datos Abiertos del INE
- Versión de referencia: página pública revisada el `2026-07-23`
- Recurso local de origen: ninguno
- Checksum del recurso: no aplicable; este repositorio no incluye ni procesa
  tablas, microdatos, archivos ni respuestas de la API
- Transformación: el adaptador opcional sin conexión acepta un periodo de
  referencia y tres índices agregados. Los reduce a un coeficiente mensual
  acotado de variación económica. Ningún registro individual o geográfico puede
  atravesar el adaptador.
- Atribución: “Referencia estadística agregada: Instituto Nacional de
  Estadística (INE), CC BY 4.0.”

## Contrato del adaptador sin conexión

`src/demo-data/calibration.ts` valida con Zod entradas exclusivamente agregadas.
Cada entrada debe incluir versión de la fuente, fecha de observación y checksum
SHA-256 del recurso externo revisado. Los recursos de origen permanecen fuera
del repositorio. Ningún contrato acepta cadenas capaces de transportar nombres,
direcciones o filas libres de una fuente.

La aplicación utiliza `createDefaultCalibration()` salvo que se proporcione un
perfil agregado revisado durante una generación local explícita. Producción
nunca descarga ni consulta AdventureWorks o el INE.

## Cobertura del escenario estándar

El escenario actual contiene:

- 266 personas ficticias en 6 equipos, con fechas profesionales y modalidades
  contractuales españolas ficticias;
- 10 proyectos con nombres naturales y estados activo, completado, previsto y
  pausado;
- 1.057 tareas con trabajo reciente acotado, dependencias y comentarios;
- 156 solicitudes de vacaciones con estacionalidad controlada en verano y
  Navidad;
- 70 incidencias con contexto estable de servicio, alcance y detección;
- 421 movimientos de tesorería importados y saldo mensual positivo;
- 20 ciclos agregados de nómina y 3.514 participantes sin importes individuales;
- 80 ejecuciones de integración proporcionales y trazables;
- 19 novedades publicadas con una versión canónica compartida, incluida
  `v1.5.1`;
- 8.175 registros relacionados, incluidos eventos inmutables de actividad y
  trazabilidad.

Los nombres son combinaciones ficticias naturales del catálogo local. Las
etiquetas de conectores son `Financial Source A`, `Financial Source B`,
`Payroll Master` y `People Master`; ninguna identifica a una empresa, banco,
producto de nómina o proveedor real.

Las organizaciones autenticadas con Scenario V7 usan la misma relación
determinista de 266 nombres que la demo invitada. La versión v1.3.2 sustituye
solo los marcadores numerados que conservan sus identificadores de organización
esperados. Los nombres naturales o editados manualmente quedan fuera de la
migración.

## Recursos del producto

La pantalla de acceso no utiliza ilustraciones generadas, imágenes de stock,
retratos ni capturas de otros productos. Su único recurso visual de terceros es
la marca de acceso de Google, utilizada según sus requisitos. Los iconos de
interfaz proceden de Tabler Icons con licencia MIT.

## Reproducción

```powershell
bun run demo:data:generate
bun run demo:data:validate
bun run demo:data:report
```

`demo:data:seed` exige el indicador `--local` incluido en el script del paquete.
En esta fase prepara y valida el contenido local, pero no contacta con un
proyecto remoto. La carga remota es una operación de despliegue separada y
revisada.

## Tamaño y conservación

Cada espacio de la demo debe mantenerse muy por debajo de la cuota de base de
datos de Supabase Free. Supabase documenta que los proyectos gratuitos pasan a
modo de solo lectura al alcanzar 500 MB:
<https://supabase.com/docs/guides/platform/database-size>.

La tarea de conservación prevista elimina espacios inactivos después de 90
días. Solo debe activarse tras revisar su SQL, simulación y programación Cron
contra el proyecto desplegado.
