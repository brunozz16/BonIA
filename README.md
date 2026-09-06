# BonIA Dinámicas

Landing de una dinámica (rifa) hecha con **Next.js 15 + Tailwind CSS 4**, con
cobro automático por **Mercado Pago** y asignación de números **sin repetidos**
sobre **Supabase (Postgres)**.

## Cómo funciona

1. La participante completa nombre, WhatsApp y cuántos números quiere.
2. El servidor guarda el pedido como `pendiente` y crea una preferencia de
   Checkout Pro. El id del pedido viaja en `external_reference`.
3. La persona paga en Mercado Pago.
4. Mercado Pago avisa por webhook. El servidor **verifica la firma**, le
   pregunta a la API cómo está realmente ese pago y, si está aprobado, saca los
   números del bombo de forma atómica.
5. La pantalla de gracias venía consultando el estado y muestra los números.

Los números **nunca** se asignan antes de que el pago esté aprobado.

## Por qué no se repiten los números

No se sortea un número y después se chequea si estaba libre — eso tiene una
carrera en el medio. En vez de eso, los 1000 números están precargados en una
tabla y cada compra **saca** los suyos:

```sql
with elegidos as (
  select numero from numeros
  where pedido_id is null
  order by random() limit v_pedido.cantidad
  for update skip locked          -- ← acá está la clave
)
update numeros set pedido_id = ... from elegidos ...
```

`FOR UPDATE SKIP LOCKED` hace que, si dos pagos se acreditan en el mismo
instante, la segunda transacción **saltee** los renglones que la primera está
bloqueando en lugar de esperarlos o pisarlos. Además la función es idempotente:
si Mercado Pago reintenta el webhook, devuelve los números que ya asignó en vez
de entregar otros.

Está todo en [`supabase/schema.sql`](supabase/schema.sql).

## Puesta en marcha

### 1. Supabase

1. Creá un proyecto gratis en [supabase.com](https://supabase.com). Elegí la
   región **South America (São Paulo)**, que es la más cercana.
2. Abrí **SQL Editor**, pegá todo [`supabase/schema.sql`](supabase/schema.sql) y
   ejecutalo. Se puede volver a correr sin romper nada.
3. En **Settings → API Keys** copiá el *Project URL* y la **clave secreta**
   (`sb_secret_...`). En proyectos viejos esa clave se llama `service_role` y es
   un JWT largo; sirven las dos. La secreta se saltea las políticas de la base,
   así que solo va en el servidor.

### 2. Mercado Pago

1. Entrá a [Tus integraciones](https://www.mercadopago.com.ar/developers/panel)
   y creá una aplicación de tipo Checkout Pro.
2. En **Credenciales** copiá el *Access Token*. Empezá con el de **prueba**
   (`TEST-...`).
3. En **Webhooks → Configurar notificación** poné
   `https://TU-DOMINIO/api/webhook-mp`, marcá el evento **Pagos** y guardá.
   Al guardar te muestra una **clave secreta**: esa es `MP_WEBHOOK_SECRET`.

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

Completá `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN` y
`MP_WEBHOOK_SECRET`. `.env.local` está en `.gitignore`.

### 4. Arrancar

```bash
npm install
npm run dev
```

## Probar en local

Mercado Pago necesita una URL pública para avisarte del pago, así que en
`localhost` el webhook nunca llega y el pedido se queda en `pendiente`. Para
probar el circuito completo, exponé el puerto con [ngrok](https://ngrok.com):

```bash
ngrok http 3000
```

Después poné esa URL `https://` en `NEXT_PUBLIC_URL_BASE` y en la configuración
del webhook de Mercado Pago, y reiniciá el server.

Para pagar sin plata real usá las
[tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)
junto con las credenciales `TEST-...`.

## Qué tocar

Precios y textos: [`app/config.js`](app/config.js)

| Campo               | Para qué sirve                                                   |
| ------------------- | ---------------------------------------------------------------- |
| `marca`             | Nombre que aparece en la pestaña del navegador                     |
| `precioPorNumero`   | Precio de cada número (por defecto 4000)                           |
| `maxNumeros`        | Cuántos números puede llevar una persona de una vez                |
| `moneda`            | Código ISO para Mercado Pago (`ARS`)                               |
| `whatsappVendedora` | Tu número, formato internacional sin `+` ni espacios               |
| `canalWhatsapp`     | Link a tu canal (vacío = no se muestra el botón)                   |

El rango real de números lo define el `generate_series(1, 1000)` de
`supabase/schema.sql`.

### Imágenes

`public/img/logo.svg` y `public/img/hero.svg` son placeholders. Reemplazalos por
los tuyos; si usás PNG o JPG actualizá el `src` en `app/page.js` y
`app/gracias/page.js`.

## Publicar en Vercel

Importá el repo desde [vercel.com/new](https://vercel.com/new) y cargá las
cuatro variables de entorno en **Settings → Environment Variables**, más
`NEXT_PUBLIC_URL_BASE` con tu dominio final. Después actualizá la URL del
webhook en el panel de Mercado Pago.

## Ver las ventas

Por ahora se miran desde el panel de Supabase (**Table Editor**):

- `pedidos` — quién compró, cuánto, y en qué estado quedó.
- `numeros` — qué número le tocó a cada pedido.

Consulta útil para el listado de participantes:

```sql
select p.nombre, p.whatsapp, array_agg(n.numero order by n.numero) as numeros
from pedidos p join numeros n on n.pedido_id = p.id
where p.estado = 'pagado'
group by p.id, p.nombre, p.whatsapp
order by min(n.numero);
```

Si un pedido queda en `sin_stock` significa que el pago entró justo cuando se
agotaban los números: hay que devolver esa plata a mano.

## Estructura

```
app/
  config.js              ← precios y WhatsApp (editá esto)
  page.js                ← formulario, manda a Mercado Pago
  gracias/page.js        ← espera la confirmación y muestra los números
  api/
    crear-pago/          ← crea el pedido y la preferencia de pago
    webhook-mp/          ← recibe el aviso de pago y asigna los números
    pedido/[id]/         ← estado del pedido, para la pantalla de gracias
lib/
  supabase.js            ← cliente con service_role (solo servidor)
  mercadopago.js         ← preferencia, consulta de pago y firma del webhook
supabase/schema.sql      ← tablas, los 1000 números y asignar_numeros()
```

## Pendiente

- Mandar los números por WhatsApp automáticamente (requiere WhatsApp Cloud API
  de Meta: cuenta Business y plantilla aprobada). Hoy los números quedan
  registrados en Supabase y se muestran en pantalla.
