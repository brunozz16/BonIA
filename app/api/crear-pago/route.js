import { NextResponse } from "next/server";
import { config } from "@/app/config";
import { crearPreferencia } from "@/lib/mercadopago";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request) {
  let cuerpo;

  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  // Nunca confiamos en lo que manda el navegador: validamos todo de nuevo
  // acá y el total lo calculamos nosotros, no lo recibimos.
  const nombre = String(cuerpo.nombre ?? "").trim();
  const whatsapp = String(cuerpo.whatsapp ?? "").trim();
  const cantidad = Number(cuerpo.cantidad);

  if (nombre.length < 2 || nombre.length > 80) {
    return NextResponse.json(
      { error: "Escribí tu nombre y apellido." },
      { status: 400 },
    );
  }

  if (!/^[\d\s+()-]{6,25}$/.test(whatsapp)) {
    return NextResponse.json(
      { error: "Revisá tu número de WhatsApp." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > config.maxNumeros) {
    return NextResponse.json(
      { error: "Elegí una cantidad válida de números." },
      { status: 400 },
    );
  }

  const total = cantidad * config.precioPorNumero;
  const supabase = getSupabase();

  // Primera línea de defensa contra sobreventa: si ya no quedan números,
  // ni siquiera mandamos a la persona a pagar.
  const { count: libres, error: errorStock } = await supabase
    .from("numeros")
    .select("numero", { count: "exact", head: true })
    .is("pedido_id", null);

  // Ojo: con head:true supabase-js no propaga el error, devuelve count null.
  // Sin este chequeo, una base caída se vería como "se agotaron los números".
  if (errorStock || libres === null) {
    console.error(
      "[crear-pago] no se pudo contar el stock:",
      errorStock ?? "count vino null (¿corriste supabase/schema.sql?)",
    );
    return NextResponse.json(
      { error: "No pudimos iniciar el pago. Probá de nuevo en un minuto." },
      { status: 500 },
    );
  }

  if ((libres ?? 0) < cantidad) {
    return NextResponse.json(
      {
        error:
          libres > 0
            ? `Solo quedan ${libres} números disponibles.`
            : "Se agotaron los números de esta dinámica.",
      },
      { status: 409 },
    );
  }

  const { data: pedido, error: errorPedido } = await supabase
    .from("pedidos")
    .insert({ nombre, whatsapp, cantidad, total })
    .select()
    .single();

  if (errorPedido) {
    console.error("[crear-pago] no se pudo guardar el pedido:", errorPedido);
    return NextResponse.json(
      { error: "No pudimos iniciar el pago. Probá de nuevo en un minuto." },
      { status: 500 },
    );
  }

  try {
    const linkDePago = await crearPreferencia(pedido);

    if (!linkDePago) throw new Error("Mercado Pago no devolvió init_point");

    return NextResponse.json({ pedidoId: pedido.id, linkDePago });
  } catch (error) {
    console.error("[crear-pago] Mercado Pago falló:", error);

    // El pedido queda pendiente y sin números tomados, así que no molesta.
    return NextResponse.json(
      { error: "No pudimos abrir Mercado Pago. Probá de nuevo." },
      { status: 502 },
    );
  }
}
