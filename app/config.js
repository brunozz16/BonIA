// ============================================================
//  CONFIGURACIÓN DE LA DINÁMICA
//  Editá solo este archivo para cambiar precios, datos y textos.
//  Las claves secretas (Mercado Pago, Supabase) van en .env.local.
// ============================================================

export const config = {
  // --- Marca ---
  marca: "BonIA Dinámicas",

  // --- Precio ---
  precioPorNumero: 4000, // en pesos
  maxNumeros: 10, // cuántos números puede comprar una persona de una vez
  moneda: "ARS", // código ISO que usa Mercado Pago

  // Cuántos números tiene la dinámica en total. Es solo informativo:
  // el rango real lo define el `generate_series` de supabase/schema.sql.
  totalNumeros: 1000,

  // --- WhatsApp ---
  // Tu número EN FORMATO INTERNACIONAL, sin +, sin espacios ni guiones.
  // Ej. Argentina: 54 + 9 + código de área sin 0 + número sin 15
  whatsappVendedora: "5493425027319",

  // Link a tu canal de WhatsApp. Si lo dejás vacío, el botón no se muestra.
  // Ej: "https://whatsapp.com/channel/0029Vb917ZW1NCrPDCKitZ39"
  canalWhatsapp: "",
};

// Formatea un importe como $4.000
export function formatearPrecio(importe) {
  return "$" + importe.toLocaleString("es-AR");
}

// Link a tu WhatsApp para consultas, con el mensaje ya empezado.
export function linkConsulta(texto = "¡Hola! Tengo una consulta sobre la dinámica 💖") {
  return (
    `https://wa.me/${config.whatsappVendedora}` +
    `?text=${encodeURIComponent(texto)}`
  );
}
