# Correcciones de seguridad aplicadas

## Crítico

- Eliminada la contraseña administrativa fija del código y de la documentación activa.
- Eliminada la autenticación por `sessionStorage`.
- Implementado Supabase Auth con email/contraseña.
- Verificación de rol `admin` en base de datos.
- RLS protege todas las tablas y Storage.
- No existe `service_role` ni Secret key en el navegador.

## Alto

- Eliminado el almacenamiento de datos personales en `localStorage`.
- Formularios enviados mediante Edge Function protegida.
- Renderizado de datos mediante `textContent`/DOM API para reducir XSS.
- URLs de imágenes restringidas al sitio y al proyecto Supabase.
- Imágenes validadas, redimensionadas y convertidas a WebP antes de subir.
- Storage limitado a JPG, PNG y WEBP con máximo de 5 MB.
- El panel depende de permisos de servidor, no de elementos visuales.

## Medio

- Neutralización de fórmulas peligrosas al exportar CSV.
- Validación de longitud y formato en cliente, Edge Function y base.
- Honeypot y límite de cinco envíos por IP/hora.
- Hash de IP con sal; no se almacena la IP en texto.
- CSP y cabeceras de seguridad para Netlify.
- Panel marcado `noindex` y `no-store`.
- Registro de auditoría para cambios de contenido y leads.
- Dependencia de Supabase fijada a una versión concreta.

## Límites honestos

La seguridad final también depende de:

- configurar correctamente Supabase;
- crear y promover al administrador;
- desplegar la Edge Function;
- usar dominios correctos en `ALLOWED_ORIGINS`;
- mantener MFA y contraseñas fuertes;
- no modificar las políticas RLS de forma insegura.
