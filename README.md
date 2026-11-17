# Hogar Mágico - Sitio Web

Sitio web oficial para las propiedades de descanso "Hogar Mágico": La Chascona, La Mar y La Calma.

## Características
- Diseño orgánico y responsivo.
- Integración con motor de reservas Beds24.
- Sección de reseñas de clientes con animaciones.
- Optimizado para Cloudflare Pages.

## Despliegue
Este proyecto usa páginas estáticas y una ruta de servidor en Cloudflare Pages Functions para consultar las reservas.
- **Framework Preset:** None / HTML
- **Output Directory:** . (o dejar vacío)

## Guías para huéspedes

- Los tres QR están en `guias/qr-chascona.png`, `guias/qr-lamar.png` y `guias/qr-calma.png`. Abren la página de la casa en `https://hogarmagico-web.pages.dev/guias/` seguida del nombre `chascona`, `lamar` o `calma`.
- Decisión de Tomás del 17 de noviembre de 2026: acceso directo, sin clave por ahora.
- Se podrá añadir protección con clave si la dueña lo requiere. Esa protección requerirá una implementación posterior.
- Las guías están completas con ejemplos identificados de Wi-Fi, parlantes, llegada, salida y teléfonos de actividades. El WhatsApp del anfitrión es el contacto público del sitio.

## Reservas y desarrollo local

Ejecuta `npm run dev` y abre `http://127.0.0.1:8766/`. El servidor local incluye la consulta de reservas. Un servidor estático simple sirve las páginas pero no puede responder `/api/booking`.

Las tres fichas usan un calendario propio y un resumen reactivo de la estadía. `functions/api/booking.js` prepara la ruta de Cloudflare Pages Functions y comparte el adaptador `lib/beds24.mjs` con el servidor local. No se necesitan credenciales de la cuenta. La confirmación y el pago se completan en Beds24, con una nueva comprobación de precio antes de salir de la web.

El adaptador consulta el HTML y el endpoint de cotización que utiliza la página pública de Beds24. Es una integración con su interfaz pública, sin contrato de estabilidad de API. Si cambia la respuesta, muestra un error y ofrece abrir las reservas directamente. Nunca sustituye una consulta fallida por precios o disponibilidad inventados. Las consultas no crean reservas.

Identificadores comprobados el 17 de noviembre de 2026: La Chascona `248224 / 522714`, La Mar `255007 / 535728`, La Calma `248225 / 522715` (propiedad / habitación).

La integración Git de Cloudflare Pages despliega la rama principal con Pages Functions. Para comprobar el recorrido en producción, selecciona una estadía disponible en una casa y continúa hasta el resumen en Beds24.
