# Guía de Personalización de Iframe (Beds24) e Inyección CSS

Este documento detalla la estrategia técnica para personalizar completamente el widget de reservas de Beds24 mediante la inyección de hojas de estilo externas (CSS), y cómo implementar esta solución en un entorno de producción como **Cloudflare Pages**.

## 1. Fundamentos de la Estrategia

La personalización se basa en una funcionalidad nativa pero avanzada de Beds24 que permite pasar la URL de un archivo CSS externo a través de un parámetro en la URL del iframe.

**El Flujo es el siguiente:**
1.  El navegador carga el iframe de Beds24 (`https://beds24.com/booking2.php`).
2.  La URL del iframe incluye el parámetro `&cssfile=URL_DE_TU_CSS`.
3.  El servidor de Beds24 (o el script del cliente) inyecta una etiqueta `<link rel="stylesheet">` dentro del `<head>` del documento del iframe, apuntando a **TU** archivo CSS.
4.  Tu CSS sobrescribe los estilos por defecto, permitiendo un control visual total.

### Requisitos Críticos
*   **HTTPS**: Tu archivo CSS **debe** estar alojado en una URL segura (`https://`). Beds24 no cargará estilos inseguros.
*   **CORS (Cross-Origin Resource Sharing)**: Aunque normalmente no es un bloqueo para archivos CSS simples, es buena práctica asegurarse de que tu servidor permita el acceso (Cloudflare Pages lo hace por defecto para archivos estáticos).
*   **URL Absoluta**: Debes enviar la ruta completa al archivo (ej: `https://tusitio.com/estilos/mi-tema.css`), no rutas relativas.

---

## 2. Implementación en Cloudflare Pages

Cloudflare Pages sirve contenido estático de manera global. Para usarlo como host de tus estilos de personalización:

### A. Estructura de Proyecto
Organiza tus archivos para que los estilos sean accesibles públicamente. En tu repositorio, deberías tener una estructura similar a esta (dependiendo de tu framework de build, como Next.js, Vite, o HTML puro):

**Ejemplo (Next.js / Vite / React):**
```text
/public
  /styles
    variant_dark.css
    variant_minimal.css
    variant_glass.css
```
*Todo lo que pongas en la carpeta `public` será accesible en la raíz de tu dominio final.*

### B. Obtención de la URL
Una vez desplegado tu sitio en Cloudflare Pages (digamos que tu dominio es `https://reservas-increibles.pages.dev`), tus archivos CSS estarán disponibles directamente en:

*   `https://reservas-increibles.pages.dev/styles/variant_dark.css`
*   `https://reservas-increibles.pages.dev/styles/variant_minimal.css`

**Esta es la URL que usarás en el parámetro `cssfile`.**

---

## 3. Construcción de la URL del Iframe

Para incrustar el calendario personalizado en tu sitio web, debes construir el `src` del iframe dinámicamente o estáticamente.

### Parámetros Clave
*   `propid`: El ID de tu propiedad en Beds24 (ej: `255007`).
*   `hideheader=window`: Oculta el encabezado predeterminado de Beds24 (recomendado para integración total).
*   `hidefooter=window`: Oculta el pie de página predeterminado.
*   `cssfile`: **La URL absoluta de tu CSS en Cloudflare Pages.**

### Ejemplo de Código (HTML Estático)
```html
<iframe 
    src="https://beds24.com/booking2.php?propid=255007&hideheader=window&hidefooter=window&cssfile=https://reservas-increibles.pages.dev/styles/variant_dark.css" 
    width="100%" 
    height="1000" 
    style="border:none;">
</iframe>
```

### Ejemplo Dinámico (JavaScript)
Si quieres cambiar estilos al vuelo o manejar entornos (dev vs prod):
```javascript
const BASE_URL = "https://beds24.com/booking2.php";
const PROPERTY_ID = "255007";
// Detectar si estamos en local o prod para elegir el origen del CSS
const SITE_ORIGIN = window.location.origin; // O una variable de entorno definida
const CSS_PATH = "/styles/variant_dark.css";

// Construcción de URL
const cssFileUrl = `${SITE_ORIGIN}${CSS_PATH}`;
const iframeSrc = `${BASE_URL}?propid=${PROPERTY_ID}&hideheader=window&hidefooter=window&cssfile=${encodeURIComponent(cssFileUrl)}`;

document.getElementById('mi-iframe').src = iframeSrc;
```

---

## 4. Guía de Personalización CSS (Hardcore Customization)

Dado que no tenemos acceso al HTML del iframe, dependemos enteramente de la "Fuerza Bruta" de CSS.

### Reglas de Oro
1.  **`!important` es tu amigo**: Beds24 usa estilos en línea y selectores específicos. Para garantizar que tu estilo gane, usa `!important` frecuentemente.
    ```css
    body { background-color: #000 !important; }
    ```
2.  **Selectores Específicos**: Estos son los elementos clave que querrás modificar (basado en el análisis del DOM de Beds24):
    *   `.website-container`: El contenedor principal.
    *   `.bookbutton`, `.greenbutton`: Botones de acción principales.
    *   `input`, `select`, `textarea`: Campos de formulario.
    *   `.calday`, `.caldayselected`, `.caldayavailable`: Las celdas del calendario.
    *   `.roomnametext`: Títulos de las habitaciones.
    
3.  **Ocultar lo que no sirve**: Si hay elementos que sobran (textos de ayuda, iconos antiguos), elimínalos visualmente:
    ```css
    .elemento-molesto-clase { display: none !important; }
    ```

4.  **Transparencias**: Para que el iframe se mezcle con tu web, haz el fondo transparente:
    ```css
    body, .website-container { background: transparent !important; }
    ```

5.  **Fuentes Personalizadas**: Puedes importar fuentes de Google Fonts al inicio de tu archivo CSS. El iframe las cargará.
    ```css
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap');
    body { font-family: 'Montserrat', sans-serif !important; }
    ```

---

## 5. Troubleshooting y Caché

Un problema común al desarrollar estilos para iframes es que Beds24 (o el navegador) cachea el archivo CSS. Si haces un cambio y no lo ves:

**La solución "Cache Buster":**
Añade un parámetro aleatorio o de versión al final de la URL de tu archivo CSS cuando la pasas al iframe.

*   URL Base: `.../styles/variant_dark.css`
*   URL con Busting: `.../styles/variant_dark.css?v=12345678`

En tu código JavaScript, puedes usar la fecha actual:
```javascript
const version = Date.now(); 
const cssUrl = `https://misitio.com/style.css?v=${version}`;
```
*Nota: Esto obliga al navegador a descargar el archivo de nuevo.*

## Resumen
1.  Crea tu CSS en tu carpeta `public/styles`.
2.  Sube a Cloudflare Pages.
3.  Usa la URL pública resultante en el parámetro `cssfile` del iframe.
4.  Usa `!important` sin miedo para dominar los estilos por defecto.
