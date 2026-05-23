# Arca

Arca es una plataforma full-stack para almacenar, organizar y administrar imagenes y videos. El proyecto combina un backend en Rust con Axum y SQLite, y un frontend en React + Vite para ofrecer autenticacion, carga de archivos, galeria, papelera y operaciones por lote.

## Caracteristicas

- Autenticacion de usuarios con registro, inicio de sesion y cierre de sesion.
- Carga de imagenes y videos con almacenamiento local.
- Galeria con vistas por periodo y soporte para seleccion multiple.
- Papelera con restauracion y eliminacion definitiva.
- Verificacion y procesamiento asincrono de medios.
- Persistencia local con SQLite y migraciones automaticas al iniciar.

## Stack tecnico

- Backend: Rust, Axum, Tokio, SQLx, SQLite.
- Frontend: React, TypeScript, Vite, React Router, TanStack Query, Uppy, Dexie.
- Procesamiento: trabajos en segundo plano para verificacion, hash y limpieza de archivos.

## Requisitos

- Rust stable.
- Node.js 18 o superior.
- pnpm.

## Configuracion

1. Crea un archivo `.env` en la raiz del proyecto tomando como base `.env.example`.
2. Ajusta al menos `ARCA_JWT_SECRET` con una cadena larga y aleatoria.
3. Si deseas usar otras rutas o puerto, actualiza las variables de entorno.

Variables principales:

- `ARCA_BIND`: direccion de escucha del backend. Por defecto `0.0.0.0:8080`.
- `ARCA_DATABASE_URL`: URL de la base SQLite. Por defecto `sqlite://data/arca.db`.
- `ARCA_STORAGE`: carpeta de almacenamiento local. Por defecto `data/storage`.
- `ARCA_JWT_SECRET`: secreto para firmar JWT. Debe tener al menos 16 caracteres.
- `ARCA_JWT_TTL_HOURS`: duracion del token en horas. Por defecto `168`.
- `ARCA_COOKIE_SECURE`: activa cookies seguras en produccion.

## Ejecutar en local

### Backend

```bash
cargo run
```

El backend crea las carpetas necesarias, aplica migraciones y expone la API en el puerto configurado.

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

## API principal

La API se expone bajo `/api` y organiza sus rutas en dos grupos:

- `/api/auth`: registro, login, logout y perfil actual.
- `/api/media`: listado, detalle, verificacion, carga, restauracion, papelera y acceso a archivos o miniaturas.

Tambien incluye un endpoint de salud en `/health`.

## Estructura del proyecto

```text
src/            Backend en Rust
frontend/       Aplicacion web
migrations/     Migraciones de base de datos
data/           Almacenamiento local y base SQLite en desarrollo
scripts/        Utilidades y pruebas auxiliares
```

## Notas de desarrollo

- El backend corre las migraciones automaticamente al arrancar.
- Los archivos subidos se almacenan en disco, no en la base de datos.
- El frontend usa caches locales y sincronizacion con la API para mejorar la experiencia de galeria.

## Licencia

Este proyecto conserva la licencia incluida en el repositorio de GitHub.
