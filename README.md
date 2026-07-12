# IFCIS Premium + Panel Administrativo

## Acceso
Abrir `index.html` para el sitio público.

Panel administrativo:
- Archivo: `admin.html`
- Autenticación migrada a Supabase Auth.`

## Incluye
- Logo oficial reemplazado por el archivo subido.
- Menú principal más compacto y premium.
- Acceso directo al panel administrativo.
- Dashboard con estadísticas.
- Gestión de cursos.
- Gestión de calendario.
- Lectura de inscripciones.
- Lectura de mensajes.
- Exportación de datos a CSV.
- Persistencia local mediante localStorage.

## Importante
Esta versión funciona completamente en el navegador y sirve como prototipo funcional.
Para seguridad real, múltiples administradores, base de datos online y acceso desde distintos dispositivos, se debe conectar con Supabase, Firebase o un backend propio.


## Cambios de esta versión
- Gestión completa de galería desde el panel administrativo.
- Crear, editar, destacar y eliminar imágenes.
- La galería pública toma los cambios desde localStorage.
- Se eliminó el texto “DESLIZÁ PARA EXPLORAR”.
- Se eliminó el botón “INSCRIPCIÓN” del encabezado.


## Ajustes de identidad
- Slogan del header y footer actualizado a: Instituto de Formación y Capacitación Integral de Seguridad.
- Se mantiene la palabra IFCIS.
- Menú principal del header ligeramente más grande.


## Cambios de esta versión
- Tarjeta de contacto reducida y compactada.
- Sección de equipo agregada en “Sobre IFCIS”.
- Gestión del equipo desde el panel administrativo.
- Alta, edición y eliminación de integrantes.
- Logo del footer aumentado un 50%.


## Ajustes de esta versión
- “NUESTRO EQUIPO” ahora usa el mismo estilo visual de sección que “NUESTRA OFERTA ACADÉMICA” y “SOBRE IFCIS”.
- Se generaron imágenes provisorias para la galería y para el equipo.
- Las imágenes fueron agregadas a la carpeta `assets`.
- Se mejoraron los bordes de las imágenes de galería y equipo con borde celeste premium y un efecto visual sutil.


## Versión final solicitada
- “NUESTRO EQUIPO” igualado visualmente a los demás títulos de sección.
- Bordes celeste premium y efecto visual sutil en galería y equipo.
- Botón “SUBIR IMAGEN” agregado a la gestión de cursos.
- Las imágenes de cursos se guardan en localStorage como datos Base64.
- El sitio público lee las imágenes y cambios de cursos realizados desde el panel.


## Cambios de esta versión
- Ventana de Gestión Académica / Editar curso más pequeña.
- Botón visible “GUARDAR CAMBIOS”.
- Botón SUBIR IMAGEN agregado en Panel de control → Equipo.
- Tarjetas del panel administrativo reducidas y compactadas.
- Tarjetas principales del sitio público con borde celeste premium y efecto visual sutil.


## Correcciones funcionales
- Reparado el botón “Ver todos los cursos”.
- Reparada la carga de la galería pública.
- Reparada la visualización de fotos del equipo.
- Reparado el guardado de fotos del equipo mediante compresión automática.
- Reparado el botón “Consultar vacantes”.
- Reparado el calendario de la página principal.
- La galería del panel ahora también permite subir imágenes.
- No se modificó el diseño visual restante.


## Rediseño UI/UX premium
- Header flotante y navegación más intuitiva.
- Jerarquía tipográfica más elegante.
- Tarjetas limpias y consistentes.
- Espaciado y lectura optimizados.
- Animaciones sutiles al aparecer.
- Barra de progreso de navegación.
- Accesos rápidos en dispositivos móviles.
- Diseño responsive mejorado.
- Se conservaron todas las funciones de la versión anterior.


## Ajustes de esta versión
- Galería reorganizada en 2 filas de 4 imágenes.
- Apertura de foto completa con animación y efecto premium.
- Ventana “Inscripción online” más pequeña y elegante.
- Menú principal sin efecto de botón.
- Raya azul animada al pasar o seleccionar una opción del menú.


## Ajustes puntuales
- Se eliminó el scrolling interno de la ventana “Inscripción online”.
- Se redujo el tamaño visual de las tarjetas e imágenes de Cursos destacados.
- No se modificó ningún otro elemento del diseño.


## Versión v4 — cursos y responsive
- Cada botón “VER CURSO” abre una ventana flotante con foto e información completa.
- Desde el panel se editan título, duración, nivel, modalidad, certificación, descripción, objetivos, requisitos e imagen.
- Se mejoró la visualización del panel administrativo en teléfonos.
- Se reforzó la adaptación responsive del sitio público y sus ventanas.
- Los datos continúan guardándose en localStorage para esta versión estática.


## Corrección del menú móvil del administrador
- Se reparó el botón de menú.
- Se agregó apertura y cierre del panel lateral.
- Se agregó fondo oscuro para cerrar tocando fuera.
- El menú se cierra al elegir una sección, presionar Escape o ampliar la pantalla.


## Correcciones funcionales v5
- Restaurado el renderizado del calendario del administrador.
- Cursos, calendario, galería y equipo se renderizan de forma independiente para evitar bloqueos.
- Imágenes subidas visibles en Galería y Equipo, con imagen alternativa ante errores.
- Etiquetas de galería en celeste con gradiente blur inferior.
- Se eliminó el scrolling interno de las ventanas públicas y administrativas.


## Parallax premium
- Movimiento suave del fondo principal durante el desplazamiento.
- Profundidad sutil en la grilla y el contenido del hero.
- Elementos luminosos con movimiento en las secciones.
- Desplazamiento leve de tarjetas visibles.
- Inclinación premium muy sutil con el cursor en computadoras.
- Respeta la preferencia del sistema para reducir movimiento.


## Seguridad y Supabase
Leé `SUPABASE_SETUP.md` y `SECURITY.md` antes de publicar.
