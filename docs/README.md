# Documentación

Este índice separa la presentación del producto, la arquitectura, la operación
y el historial técnico. Las notas de cada versión se mantienen en
[GitHub Releases](https://github.com/antoniojesusdelgado/management-platform/releases)
para evitar duplicarlas en las guías activas.

## Para evaluar el proyecto

- [Caso de estudio técnico](TECHNICAL-CASE-STUDY.md): contexto, decisiones,
  alcance y evidencia de ingeniería.
- [Mapas de procesos](PROCESS-MAPS.md): recorridos funcionales y controles.
- [Hoja de ruta](ROADMAP.md): capacidades entregadas y líneas de evolución.
- [Revisión de diseño](design-qa.md): evidencia visual de la versión evaluada.

## Arquitectura y datos

- [Arquitectura](ARCHITECTURE.md): límites, capas, multiorganización e
  integraciones.
- [Modelo de permisos](PERMISSIONS.md): códigos estables y alcance.
- [Procedencia de los datos](DATA-PROVENANCE.md): generación sintética,
  reproducibilidad y límites.
- [Onboarding y directorio](ONBOARDING-AND-DIRECTORY-SYNC.md): acceso,
  empresa activa y sincronización.
- [Integraciones de productividad](WORKSPACE-INTEGRATIONS.md): Google
  Workspace, Microsoft 365, OAuth y exportaciones.

## Seguridad y privacidad

- [Política de seguridad](../SECURITY.md): controles y comunicación privada de
  vulnerabilidades.
- [Security Advisor](SECURITY-ADVISOR.md): RPC privilegiadas y excepciones
  revisadas.
- [Vercel Firewall](VERCEL-FIREWALL.md): controles de red y rate limiting.
- [Transparencia, privacidad y analítica](AI-TRANSPARENCY-AND-PRIVACY.md):
  asistencia de IA, consentimiento y supresión.

## Operación

- [Inicio local](BOOTSTRAP.md): recorrido mínimo para levantar el proyecto.
- [Despliegue](DEPLOYMENT.md): validación, migraciones, Preview y producción.
- [Guía de contenidos](CONTENT-GUIDE.md): lenguaje visible y terminología.
- [Licencias de terceros](THIRD-PARTY-LICENSES.md): dependencias y atribución.

## Documentación histórica

- [Actualización histórica de Scenario V7](SCENARIO-V7-BACKFILL.md).
- [Revisión de Firewall v1.3.1](VERCEL-FIREWALL-V1.3.1.md).
- [Revisión de Firewall v1.5.0](VERCEL-FIREWALL-V1.5.0.md).
- [Decisiones de arquitectura](adr/).

Los documentos históricos conservan nombres técnicos y decisiones de su fecha.
No sustituyen las guías operativas actuales.
