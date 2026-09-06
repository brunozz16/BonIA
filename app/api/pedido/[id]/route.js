import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ES_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Estado de un pedido, para que la pantalla de gracias sepa si el pago
 * ya se acreditó y qué números salieron.
 *
 * El id es un UUID que solo conoce quien hizo la compra. No devolvemos el
 * teléfono ni nada que no haga falta mostrar.
 */
export async function GET(request, { params }) {
  const { id } = await params;

  if (!ES_UUID.test(id ?? "")) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: pedido, error } = await supabase
    .from("pedidos")
    .select("id, nombre, cantidad, total, estado")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[pedido] no se pudo leer", id, error);
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }

  if (!pedido) {
    return NextResponse.json({ error: "No encontramos ese pedido." }, { status: 404 });
  }

  const { data: filas } = await supabase
    .from("numeros")
    .select("numero")
    .eq("pedido_id", id)
    .order("numero");

  return NextResponse.json({
    ...pedido,
    numeros: (filas ?? []).map((fila) => fila.numero),
  });
}
