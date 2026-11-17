# 6ta Feria Latinoamérica Territorio Canva · Edición Navideña

Aplicación web progresiva (PWA) interactiva para las alumnas e invitados de la **6ta Feria Latinoamérica Territorio Canva · Edición Navideña** (del 23 al 27 de noviembre de 2026).

## Características principales

- **Animación inicial y experiencia navideña**: Intro con lluvia de escarcha dorada formando a Pincelín, nevada sutil, cintillo superior fijo con luces navideñas y ruta interactiva con pisadas de botas de Santa.
- **Talleres Navideños y Foro de Dudas**:
  - Programa completo de 9 talleres con fecha, hora de Venezuela (VET) y conversión automática a la hora local de cada alumna.
  - Búsqueda inteligente por palabras clave y seguimiento individual de progreso (*Feria* vs *Mi progreso*).
  - Foro público de dudas filtrable por clase y estado, con respuestas oficiales de los profesores y comentarios en hilo.
- **Control de acceso anti-compartición y progreso**:
  - Validación por correo electrónico (usuario) + clave asignada al comprar (máximo 2 dispositivos conectados desde la misma IP) y guardado de clases vistas en el perfil del usuario.
  - Portal Administrativo con registro e inicio de sesión de administradores, importación de listados en `.xlsx`, `.xls` o `.csv`, gestión de estudiantes, alertas de seguridad (IP distinta o >2 equipos) y respuestas oficiales en el foro.
- **PWA instalable**: Configurada con `vite-plugin-pwa` para instalarse en Android, iOS y escritorio.

## Requisitos previos

- Node.js 18+
- Cuenta de **Supabase** (para persistencia en producción)
- Cuenta de **Vercel** (para despliegue con funciones serverless en `/api/*`)

## Instalación local

```bash
npm install
cp .env.example .env
npm run dev
```

La aplicación correrá en `http://localhost:3000`. Sin variables de Supabase configuradas en `.env`, funciona automáticamente en modo local de demostración usando `localStorage`.

## Configuración de Supabase

1. Crea un nuevo proyecto en [Supabase](https://supabase.com).
2. Abre el **SQL Editor** de tu proyecto y ejecuta el contenido completo de `supabase/schema.sql`.
3. Copia tu **Project URL** y **Anon Public Key** desde *Project Settings -> API* y colócalas en `.env` (o en las variables de entorno de Vercel):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Despliegue en Vercel

1. Sube este proyecto a un repositorio en **GitHub**.
2. Importa el repositorio desde [Vercel](https://vercel.com).
3. Agrega las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en *Project Settings -> Environment Variables*.
4. Vercel detectará automáticamente `vercel.json` (`npm run build` -> `dist`) y desplegará tanto el frontend Vite como las rutas serverless `/api/verify-access` y `/api/admin`.
