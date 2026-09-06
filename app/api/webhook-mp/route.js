import { NextResponse } from "next/server";
import { firmaValida, obtenerPago } from "@/lib/mercadopago";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de Mercado Pago: acá es donde realmente se asignan los números.
 *
 * Le contestamos 200 a todo lo que decidimos ignorar a propósito, porque
 * cualquier otra cosa hace que Mercado Pago reintente la notificación una
 * y otra vez. El 500 queda reservado para errores nuestros que sí vale
 * la pena reintentar.
 */
export async function POST(request) {
  const url = new URL(request.url);

  let cuerpo = {};
  try {
    cuerpo = await request.json();
  } catch {
    // Mercado Pago a veces avisa solo por query string, sin body.
  }

  // Los datos pueden venir por query string o en el body, según el aviso.
  const dataId = url.searchParams.get("data.id") ?? cuerpo?.data?.id;
  const tipo = url.searchParams.get("type") ?? cuerpo?.type;

  const legitimo = firmaValida({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
  });

  if (!legitimo) {
    console.warn("[webhook-mp] firma inválida, aviso descartado");
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  if (tipo !== "payment") {
    return NextResponse.json({ ignorado: tipo ?? "sin tipo" });
  }

  const supabase = getSupabase();

  let pago;
  try {
    // No confiamos en el aviso: le preguntamos a Mercado Pago cómo está
    // realmente ese pago.
    pago = await obtenerPago(dataId);
  } catch (error) {
    console.error("[webhook-mp] no se pudo leer el pago", dataId, error);
    return NextResponse.json({ error: "Reintentar." }, { status: 500 });
  }

  const pedidoId = pago?.external_reference;

  if (!pedidoId) {
    console.warn("[webhook-mp] el pago", dataId, "no trae external_reference");
    return NextResponse.json({ ignorado: "sin external_reference" });
  }

  if (pago.status !== "approved") {
    // Rechazado o cancelado: lo dejamos anotado y no tocamos el bombo.
    // Los pendientes (en_process, in_mediation) se quedan como están:
    // Mercado Pago va a volver a avisar cuando se definan.
    if (["rejected", "cancelled", "refunded", "charged_back"].includes(pago.status)) {
      await supabase
        .from("pedidos")
        .update({ estado: "rechazado", mp_payment_id: String(dataId) })
        .eq("id", pedidoId)
        .eq("estado", "pendiente");
    }

    return NextResponse.json({ estado: pago.status });
  }

  // Pago aprobado: sacamos los números del bombo. La función de Postgres
  // es atómica e idempotente, así que da igual cuántas veces la llamemos.
  const { data: numeros, error } = await supabase.rpc("asignar_numeros", {
    p_pedido_id: pedidoId,
    p_payment_id: String(dataId),
  });

  if (error) {
    console.error("[webhook-mp] falló asignar_numeros para", pedidoId, error);
    return NextResponse.json({ error: "Reintentar." }, { status: 500 });
  }

  if (!numeros?.length) {
    // Se agotaron los números con el pago ya cobrado: hay que devolver
    // la plata a mano. Queda marcado como sin_stock en la tabla pedidos.
    console.error(
      "[webhook-mp] PEDIDO SIN STOCK, revisar y reembolsar:",
      pedidoId,
      "pago",
      dataId,
    );
    return NextResponse.json({ estado: "sin_stock" });
  }

  console.log("[webhook-mp] pedido", pedidoId, "→ números", numeros.join(", "));

  return NextResponse.json({ estado: "pagado", numeros });
}
