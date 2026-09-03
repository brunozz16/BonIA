# BonIA Dinámicas

Landing de una dinámica (rifa) hecha con **Next.js 15 + Tailwind CSS 4**.

La participante completa nombre, WhatsApp y cuántos números quiere; ve el total
en vivo y, al enviar, se le abre WhatsApp con el pedido ya escrito para vos.
No hay base de datos ni pasarela de pago: los números los asignás a mano.

## Arrancar

```bash
npm install
npm run dev
```

Abrí http://localhost:3000

## Qué tocar

Casi todo se configura en un solo archivo: [`app/config.js`](app/config.js)

| Campo               | Para qué sirve                                                  |
| ------------------- | --------------------------------------------------------------- |
| `marca`             | Nombre que aparece en la pestaña del navegador                    |
| `precioPorNumero`   | Precio de cada número (por defecto 4000)                          |
| `maxNumeros`        | Cuántas opciones muestra el desplegable (por defecto 10)          |
| `whatsappVendedora` | **Tu número**, formato internacional sin `+` ni espacios          |
| `canalWhatsapp`     | Link a tu canal de WhatsApp (dejalo en `""` para ocultar el botón)|
| `alias`             | Alias de transferencia que se muestra en la pantalla final        |
| `titular`           | Titular de la cuenta                                              |

> ⚠️ **Antes de publicar, cambiá `whatsappVendedora`.** El valor que viene por
> defecto (`5491100000000`) es de ejemplo y no lleva a ningún lado.

Formato del número: código de país + 9 + característica sin el 0 + número sin
el 15. Por ejemplo, para un 11 3456-7890 de Buenos Aires: `5491134567890`.

### Imágenes

Reemplazá `public/img/logo.svg` y `public/img/hero.svg` por las tuyas. Son
placeholders. Si usás PNG o JPG, actualizá el `src` en `app/page.js` y
`app/gracias/page.js`.

### Textos

- Pantalla del formulario: [`app/page.js`](app/page.js)
- Pantalla de confirmación: [`app/gracias/page.js`](app/gracias/page.js)
- Colores: el bloque `@theme` de [`app/globals.css`](app/globals.css)

## Publicar en Vercel

```bash
npm i -g vercel
vercel
```

O subí el repo a GitHub e importalo desde vercel.com. No hace falta configurar
variables de entorno.

## Estructura

```
app/
  config.js        ← precios, WhatsApp, alias (editá esto)
  globals.css      ← paleta y estilos base
  layout.js        ← fuente Poppins + metadata
  page.js          ← formulario
  gracias/page.js  ← pantalla de confirmación
public/img/        ← logo y hero (placeholders)
```
