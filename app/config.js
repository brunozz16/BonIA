// ============================================================
//  CONFIGURACIÓN DE LA DINÁMICA
//  Editá solo este archivo para cambiar precios, datos y textos.
// ============================================================

export const config = {
  // --- Marca ---
  marca: "BonIA Dinámicas",

  // --- Precio ---
  precioPorNumero: 4000, // en pesos
  maxNumeros: 10, // cuántas opciones muestra el desplegable

  // --- WhatsApp ---
  // Tu número EN FORMATO INTERNACIONAL, sin +, sin espacios ni guiones.
  // Ej. Argentina: 54 + 9 + código de área sin 0 + número sin 15
  whatsappVendedora: "5491100000000",

  // Link a tu canal de WhatsApp. Si lo dejás vacío, el botón no se muestra.
  // Ej: "https://whatsapp.com/channel/0029Vb917ZW1NCrPDCKitZ39"
  canalWhatsapp: "",

  // --- Datos de pago que ve la participante ---
  alias: "bonia.dinamicas",
  titular: "Nombre y Apellido",
};

// Formatea un importe como $4.000
export function formatearPrecio(importe) {
  return "$" + importe.toLocaleString("es-AR");
}

// Arma el texto del mensaje de WhatsApp con el pedido
export function armarMensaje({ nombre, whatsapp, cantidad }) {
  const total = cantidad * config.precioPorNumero;

  return [
    `¡Hola! Quiero participar en la dinámica 💖`,
    ``,
    `👤 Nombre: ${nombre}`,
    `📲 WhatsApp: ${whatsapp}`,
    `🎟️ Cantidad: ${cantidad} ${cantidad === 1 ? "número" : "números"}`,
    `💵 Total: ${formatearPrecio(total)}`,
  ].join("\n");
}

// Devuelve el link wa.me listo para abrir
export function linkWhatsApp(datos) {
  return (
    `https://wa.me/${config.whatsappVendedora}` +
    `?text=${encodeURIComponent(armarMensaje(datos))}`
  );
}
