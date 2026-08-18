# Inicio local

## Objetivo

Levantar Plataforma de gestión con la configuración mínima y sin utilizar
credenciales de producción. El modo de exploración funciona sin Supabase; el
área autenticada necesita un proyecto local o propio.

## Requisitos

- Bun 1.3.14.
- Node.js compatible con las herramientas del repositorio.
- Docker Desktop para Supabase local.
- Git y PowerShell en Windows.

## Aplicación

```powershell
git clone https://github.com/antoniojesusdelgado/management-platform.git
Set-Location management-platform
bun install --frozen-lockfile
Copy-Item .env.example .env.local
bun run dev
```

Abrir <http://localhost:3000/login> o acceder directamente a
<http://localhost:3000/explorar>.

## Base de datos local

```powershell
bunx supabase start
bunx supabase db reset
bunx supabase test db
```

Después del arranque, completa en `.env.local` la URL y la clave publicable que
muestre Supabase. No copies secretos de Preview o producción.

## Comprobación mínima

```powershell
bun run lint
bun run typecheck
bun run test
bun run content:validate
bun run build
```

La configuración de OAuth, integraciones, migraciones remotas y publicación se
documenta en [Despliegue](DEPLOYMENT.md).
