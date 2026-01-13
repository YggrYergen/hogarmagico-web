# Guía Exhaustiva de Modificación Visual para Beds24 Iframe

Este documento detalla **todas las posibilidades técnicas** para mejorar la apariencia del iframe de Beds24, incluyendo métodos de personalización profunda y soluciones "maquillaje" externas.

## 1. Análisis Técnico y Despliegue

### El Problema de "Cross-Origin" (CORS)
El iframe carga contenido desde `beds24.com`. Debido a las políticas de seguridad del navegador (Same-Origin Policy):
-   **Localhost:** No puedes acceder al DOM del iframe ni inyectar CSS mediante Javascript.
-   **Cloudflare Pages / Vercel / Netlify:** Desplegar una página de pruebas aquí **NO** soluciona el bloqueo. Aunque tu página esté en internet, el dominio `tupagina.pages.dev` sigue siendo diferente de `beds24.com`, por lo que el navegador seguirá bloqueando el acceso directo.

### La Utilidad Real de Cloudflare Pages
Aunque no sirve para "hackear" el iframe, desplegar en Cloudflare Pages es **muy útil** para la solución recomendada (Inyección de CSS), porque:
1.  Beds24 requiere que el archivo CSS externo se sirva estrictamente vía **HTTPS**.
2.  Localhost suele ser http plano.
3.  Puedes subir tu archivo `custom.css` a Cloudflare Pages y usar esa URL segura (`https://tupagina.pages.dev/custom.css`) para pasársela a Beds24.

---

### ⚠️ Regla de Oro: Especificidad y !important
Beds24 carga sus propios estilos con alta prioridad. Para que tus cambios se vean, debes usar una estrategia de "Override Agresivo":
1.  **Usa `!important`:** En casi todas las propiedades que quieras forzar.
2.  **Selectores Específicos:** Usa IDs (`#booking-form`) o cadenas de clases (`.propentry .propertysall`) en lugar de etiquetas genéricas.
3.  **Reseteo Inicial:** A veces es útil poner `background: transparent !important` en body y contenedores para eliminar los colores por defecto.

### 2. Métodos de Implementación de CSS

Para aplicar los estilos que diseñes, tienes dos caminos oficiales. Ambos permiten el mismo nivel de personalización visual.

### A. Inyección Externa (Recomendada para Desarrollo)
Ideal si tienes hosting HTTPS (o usas Ngrok en local).
**Método:** Añade `&cssfile=URL_SEGURA_DE_TU_CSS` al `src` del iframe.

### B. Panel Interno (Recomendada para Producción)
Si prefieres no depender de un archivo externo, pega tu CSS directamente en Beds24.
**Ruta Exacta:**
1.  Ve a `Settings > Booking Engine > Property Booking Page`.
2.  Busca las **pestañas horizontales** arriba del contenido.
3.  Clic en la pestaña **"Developers"**.
4.  Pega tu código en el campo **"Custom CSS"**.

### Catálogo Exhaustivo de Selectores CSS
A continuación, listamos los elementos clave que puedes modificar, organizados por componente.

#### 🔥 Estructura Base y Tipografía
Modifica la base para eliminar el aspecto de "sitio viejo".
-   `body`: Fondo general, fuente global y color de texto. *Ej: `font-family: 'Inter', sans-serif; background: #fff;`*
-   `.website-container` (si existe en su layout): Contenedor principal.
-   `a`: Estilos de todos los enlaces. *Ej: `color: #007bff; text-decoration: none;`*

#### 📅 Calendario y Selección de Fechas
-   `.caltable`: La tabla principal del calendario.
-   `.calmonth`: Encabezado del mes.
-   `.calday`: Celdas de días individuales.
-   `.caldayselected` / `.selecteddate`: Día seleccionado por el usuario.
-   `.caldaypast` / `.pastdate`: Días pasados (útil para bajarles opacidad).
-   `.caldaybooked`: Días ya ocupados (rojo por defecto).
-   `.caldayavailable`: Días libres.

#### 🏨 Listado de Habitaciones (Tabla de Resultados)
-   `.tableheader`: Cabeceras de las tablas de precios/habitaciones. *Ej: `background-color: #333; color: white;`*
-   `.roomnametext`: Nombre de la habitación/propiedad. *Ej: `font-size: 1.25rem; font-weight: 700; color: #333;`*
-   `.roomdescription`: Texto descriptivo de la habitación.
-   `.roomfeatures`: Iconos o lista de características.
-   `.price`: El texto del precio final. *Ej: `color: green; font-size: 1.2rem;`*
-   `.currency`: El símbolo de moneda.

#### 🔘 Botones e Interacción
-   `.bookbutton` / `.greenbutton`: El botón principal de acción ("Reservar", "Buscar"). *Ej: `background-color: #000; border-radius: 4px; padding: 10px 20px;`*
-   `.submitbutton`: Botones de envío de formularios.
-   `input[type="button"]`, `input[type="submit"]`: Selectores genéricos para asegurar que atrapas todos los botones.
-   `select`, `input[type="text"]`, `textarea`: Campos de formulario (Selectores de fecha, cantidad de huéspedes).

#### 🧾 Formulario de Reserva y Pasarela
-   `.bookingtable`: Tabla donde se introducen los datos del huésped.
-   `.guestdetails`: Sección de detalles del cliente.
-   `.errormessage` / `.warning`: Mensajes de error (importante estilizarlos en rojo suave).
-   `.successmessage`: Confirmación de reserva.

---

## 3. La Solución "Maquillaje": Filtros y Contenedor
*Mantenemos esta sección como recurso de último ratio para "oscurecer" o ajustar gamas cromáticas sin acceso interno.*

### A. Filtros CSS
```css
#beds24iframe {
    filter: saturate(0.9) contrast(1.1);
}
```

### B. Estilización del Contenedor
Envolver el iframe en un `div` con `border-radius`, `box-shadow` y `overflow: hidden`.

---

## 4. Parámetros de URL (Exhaustivo)
Lista completa de parámetros que puedes añadir a la URL `https://beds24.com/booking2.php?...` para controlar el comportamiento inicial.

### ⚙️ Configuración Técnica
-   `propid=XXXX`: **(Obligatorio)** ID numérico de tu propiedad.
-   `cssfile=URL`: URL absoluta (HTTPS) de tu archivo CSS personalizado.
-   `referer=nombre`: Etiqueta para rastrear el origen de la reserva en los reportes (ej: `iframe-web`).
-   `lang=es`: Fuerza el idioma de la interfaz (ej: `es`, `en`, `de`).

### 🎨 Visualización
-   `layout=1` (o 2, 3...): Cambia entre layouts predefinidos de Beds24 (generalmente obsoletos, mejor usar `layout=1` y sobrescribir con CSS).
-   `hideheader=window`: Oculta la cabecera estándar de Beds24 dentro del iframe.
-   `hidefooter=window`: Oculta el pie de página (copyright/links de Beds24).
-   `hidecalendar=1`: Oculta el calendario de disponibilidad si solo quieres mostrar lista de habitaciones.

### 🔍 Preselección de Búsqueda (Deep Linking)
-   `checkin=YYYY-MM-DD`: Preselecciona fecha de llegada.
-   `checkout=YYYY-MM-DD`: Preselecciona fecha de salida.
-   `num_nights=X`: Predefine número de noches.
-   `numadults=X`: Número de adultos por defecto.
-   `numchildren=X`: Número de niños por defecto.
-   `roomid=XXXX`: Muestra directamenet una habitación específica (filtra las demás).
-   `show_all_rooms=1`: Fuerza a mostrar habitaciones incluso si no están disponibles (como "No disponible").
