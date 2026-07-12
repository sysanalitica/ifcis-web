# Instalación segura de IFCIS con Supabase

## 1. Crear el proyecto

1. Creá un proyecto en Supabase.
2. En **Authentication > Providers > Email**, mantené activo Email/Password.
3. En **Authentication > Settings**, desactivá el registro público si solamente habrá administradores.
4. Activá protección contra contraseñas filtradas y definí un mínimo fuerte.
5. Recomendado: activá MFA para la cuenta administradora.

## 2. Crear base, políticas y Storage

Ejecutá en **SQL Editor**:

`supabase/migrations/20260711_ifcis_secure.sql`

Esto crea:

- `profiles`
- `courses`
- `gallery_items`
- `team_members`
- `course_dates`
- `leads`
- `audit_log`
- políticas RLS
- bucket `ifcis-media`
- políticas seguras de Storage
- límite de envíos por IP

## 3. Crear el administrador

1. En **Authentication > Users**, creá el usuario con email y contraseña fuerte.
2. Ejecutá en SQL Editor:

```sql
update public.profiles
set role='admin'
where id=(
  select id from auth.users
  where email='TU_EMAIL_ADMIN'
);
```

No existe una contraseña escrita en el código. El acceso depende de Supabase Auth y del rol guardado en `profiles`.

## 4. Configurar el frontend

Editá `supabase-config.js`:

```js
window.IFCIS_CONFIG = Object.freeze({
  SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "TU_PUBLISHABLE_KEY",
  STORAGE_BUCKET: "ifcis-media",
  LEAD_FUNCTION: "submit-lead"
});
```

Usá exclusivamente la **Publishable key** o la clave `anon` heredada. Nunca pegues una Secret key o `service_role` en archivos públicos.

## 5. Desplegar la Edge Function

Con Supabase CLI:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy submit-lead
```

Configurá secretos:

```bash
supabase secrets set \
  ALLOWED_ORIGINS="https://tu-sitio.netlify.app,https://tudominio.com" \
  RATE_LIMIT_SALT="UN_SECRETO_ALEATORIO_LARGO"
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` están disponibles dentro de las Edge Functions alojadas. La clave de servicio nunca se envía al navegador.

## 6. Configurar URLs de Auth

En **Authentication > URL Configuration**:

- Site URL: URL final de Netlify.
- Redirect URLs: agregá el dominio final y las vistas previas que realmente uses.

## 7. Publicar en Netlify

Subí toda la carpeta. Netlify leerá `_headers` y `netlify.toml`.

Después verificá:

- `/` carga cursos desde Supabase.
- `/admin` exige email y contraseña.
- Una cuenta sin rol `admin` no accede.
- Las imágenes se guardan en Storage.
- Los formularios aparecen en la tabla `leads`.
- El panel puede leer los leads, pero el público no.
- CSP no muestra errores inesperados en la consola.

## 8. Seguridad operativa

- Activá MFA para administradores.
- No habilites registros públicos si no son necesarios.
- Revisá `audit_log`.
- Rotá claves si sospechás exposición.
- Conservá copias de seguridad.
- Aplicá actualizaciones de `supabase-js` después de probarlas.
- No edites las políticas RLS para permitir `true` en escrituras públicas.
