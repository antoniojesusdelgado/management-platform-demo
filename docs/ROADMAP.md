# Hoja de ruta

Esta hoja de ruta describe la dirección del producto. No representa compromisos
comerciales ni fechas cerradas. El historial detallado de entregas se consulta
en [GitHub Releases](https://github.com/antoniojesusdelgado/management-platform/releases).

## Capacidades consolidadas

- Recorridos conectados para proyectos, tareas, vacaciones, incidencias,
  tesorería, nóminas, personal y analítica.
- Búsqueda global, bandeja personal, notificaciones y enlaces profundos.
- Automatizaciones cerradas, plantillas, recurrencias y planificación de
  capacidad.
- Experiencia responsive, navegación persistente, accesibilidad y temas claro
  u oscuro.
- Acceso con Google o Microsoft, onboarding y gestión multiempresa.
- Exportaciones locales e integraciones opcionales con Google Workspace y
  Microsoft 365.
- Datos sintéticos reproducibles, aislamiento RLS, auditoría y cadena de
  validación de seguridad.

## Prioridad 1: preparación para pilotos

- Simplificar la configuración inicial de empresa, módulos y permisos.
- Mejorar la ayuda contextual y los estados vacíos sin introducir un tutorial
  obligatorio.
- Ampliar las pruebas con recorridos autenticados de larga duración.
- Medir tiempos de navegación, errores de servidor y consultas por módulo con
  presupuestos verificables.
- Completar runbooks de soporte, recuperación y conservación de datos.

## Prioridad 2: operación y colaboración

- Consolidar comentarios, menciones y actividad relevante en la bandeja.
- Añadir plantillas de trabajo orientadas a casos de uso sin permitir lógica
  arbitraria.
- Mejorar la planificación de capacidad con escenarios comparables y
  explicaciones de disponibilidad.
- Extender las notificaciones con resúmenes configurables y preferencias por
  categoría.

## Prioridad 3: analítica y decisiones

- Incorporar más comparaciones guardadas y explicaciones de variaciones.
- Mejorar la navegación desde un indicador hasta sus registros de origen.
- Reforzar las tablas equivalentes y exportaciones accesibles.
- Evaluar agregaciones de servidor adicionales antes de ampliar el volumen de
  datos.

## Prioridad 4: ecosistema empresarial

- Validar las integraciones reales con cuentas administradas de Google
  Workspace y Microsoft Entra.
- Añadir observabilidad de cuotas, renovaciones y errores recuperables.
- Mantener archivos, calendario y directorio como consentimientos separados.
- Evaluar nuevos conectores únicamente cuando exista un caso de uso y un modelo
  de permisos claros.

## Principios de evolución

1. No publicar datos, documentos ni credenciales de organizaciones reales.
2. Mantener la exploración separada del área autenticada.
3. Aplicar cambios de datos mediante migraciones aditivas e idempotentes.
4. Validar autorización en servidor y mediante RLS.
5. No añadir una dependencia sin una necesidad demostrada.
6. Publicar desde una Preview funcional, visual y técnicamente validada.
7. Documentar limitaciones y resultados sin inventar métricas o capacidades.

## Fuera de alcance actual

- Facturación, planes comerciales y autoservicio de suscripciones.
- Lectura de buzones o envío automático de correo.
- Sincronización bidireccional de directorios corporativos.
- Almacenamiento general de documentos empresariales.
- Uso de modelos de IA durante la ejecución del producto.
