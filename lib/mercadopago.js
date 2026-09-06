import crypto from "node:crypto";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { config } from "@/app/config";

function getCliente() {
  const accessToken = process.env.MP_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error(
      "Falta MP_ACCESS_TOKEN. Copiá .env.example a .env.local y completalo.",
    );
  }

  return new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
}

/**
 * URL pública del sitio, que Mercado Pago necesita para redirigir al
 * comprador y para avisarnos del pago.
 */
export function urlBase() {
  if (process.env.NEXT_PUBLIC_URL_BASE) {
    return process.env.NEXT_PUBLIC_URL_BASE.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Crea la preferencia de Checkout Pro y devuelve el link de pago.
 * El id del pedido viaja en external_reference: es lo que nos permite
 * saber, cuando llega el webhook, a quién asignarle los números.
 */
export async function crearPreferencia(pedido) {
  const base = urlBase();
  const esPublica = base.startsWith("https://");

  const cuerpo = {
    items: [
      {
        id: pedido.id,
        title: `${pedido.cantidad} ${pedido.cantidad === 1 ? "número" : "números"} — ${config.marca}`,
        quantity: pedido.cantidad,
        unit_price: config.precioPorNumero,
        currency_id: config.moneda,
      },
    ],
    external_reference: pedido.id,
    back_urls: {
      success: `${base}/gracias?pedido=${pedido.id}`,
      pending: `${base}/gracias?pedido=${pedido.id}`,
      failure: `${base}/?pago=rechazado`,
    },
  };

  // Mercado Pago rechaza auto_return y notification_url si no son públicas,
  // así que en localhost las omitimos (ver el README para probar con ngrok).
  if (esPublica) {
    cuerpo.auto_return = "approved";
    cuerpo.notification_url = `${base}/api/webhook-mp`;
  }

  const respuesta = await new Preference(getCliente()).create({ body: cuerpo });

  return respuesta.init_point ?? respuesta.sandbox_init_point;
}

/** Trae el pago desde Mercado Pago. Nunca confiamos en lo que llega por el webhook. */
export async function obtenerPago(idPago) {
  return new Payment(getCliente()).get({ id: idPago });
}

/**
 * Verifica que el webhook lo haya mandado Mercado Pago y no cualquiera.
 *
 * El header x-signature viene como "ts=1704908010,v1=618c8534...", donde v1
 * es un HMAC-SHA256 del texto "id:...;request-id:...;ts:...;" firmado con el
 * secreto que te da el panel de Mercado Pago al configurar el webhook.
 *
 * Sin esta validación cualquiera podría postear pagos falsos y vaciarte el
 * bombo de números sin haber pagado un peso.
 */
export function firmaValida({ xSignature, xRequestId, dataId }) {
  const secreto = process.env.MP_WEBHOOK_SECRET;

  if (!secreto || !xSignature || !dataId) return false;

  const partes = Object.fromEntries(
    xSignature.split(",").map((parte) => {
      const [clave, ...resto] = parte.split("=");
      return [clave.trim(), resto.join("=").trim()];
    }),
  );

  const { ts, v1 } = partes;
  if (!ts || !v1) return false;

  // El id va en minúsculas y los campos ausentes se omiten del manifiesto.
  let manifiesto = `id:${String(dataId).toLowerCase()};`;
  if (xRequestId) manifiesto += `request-id:${xRequestId};`;
  manifiesto += `ts:${ts};`;

  const esperado = crypto
    .createHmac("sha256", secreto)
    .update(manifiesto)
    .digest("hex");

  // Comparación de tiempo constante: un === filtraría información por timing.
  const a = Buffer.from(esperado, "hex");
  const b = Buffer.from(v1, "hex");

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
