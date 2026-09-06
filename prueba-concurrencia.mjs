// Prueba temporal: dispara N asignaciones EN PARALELO contra la base real
// para comprobar que FOR UPDATE SKIP LOCKED nunca entrega un número repetido.
// Crea pedidos marcados y los borra al final.
import { createClient } from "@supabase/supabase-js";

const COMPRAS = 40;
const POR_COMPRA = 5;
const MARCA = "PRUEBA-CONCURRENCIA";

const db = createClient(
  process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/, ""),
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

let fallos = 0;
const ok = (t, d = "") => console.log(`  OK   ${t}${d ? " — " + d : ""}`);
const mal = (t, d = "") => { console.log(` FALLA ${t}${d ? " — " + d : ""}`); fallos++; };

const { count: libresAntes } = await db
  .from("numeros").select("numero", { count: "exact" }).is("pedido_id", null).limit(1);
const { count: pedidosAntes } = await db
  .from("pedidos").select("id", { count: "exact" }).limit(1);

console.log(`\nEstado inicial: ${libresAntes} números libres, ${pedidosAntes} pedidos.`);

if (pedidosAntes > 0) {
  console.log("\nLa base ya tiene pedidos reales. Cancelo para no ensuciar nada.\n");
  process.exit(1);
}

// --- Creamos los pedidos de prueba ---
const filas = Array.from({ length: COMPRAS }, (_, i) => ({
  nombre: `${MARCA} ${i}`,
  whatsapp: "0000000000",
  cantidad: POR_COMPRA,
  total: POR_COMPRA * 4000,
}));

const { data: pedidos, error: eIns } = await db.from("pedidos").insert(filas).select("id");
if (eIns) { mal("no se pudieron crear los pedidos", eIns.message); process.exit(1); }
ok(`${pedidos.length} pedidos de prueba creados`);

// --- El momento de la verdad: todas las asignaciones a la vez ---
console.log(`\nDisparando ${COMPRAS} asignaciones simultáneas de ${POR_COMPRA} números...`);
const arranque = Date.now();

const resultados = await Promise.all(
  pedidos.map((p) =>
    db.rpc("asignar_numeros", { p_pedido_id: p.id, p_payment_id: `PAGO-${p.id}` }),
  ),
);

const tardo = Date.now() - arranque;
console.log(`Terminaron en ${tardo} ms.\n`);

const errores = resultados.filter((r) => r.error);
const entregados = resultados.flatMap((r) => r.data ?? []);

if (errores.length) {
  mal(`${errores.length} asignaciones fallaron`, errores[0].error.message);
} else {
  ok("las 40 asignaciones respondieron sin error");
}

const cantidadesMal = resultados.filter((r) => !r.error && (r.data ?? []).length !== POR_COMPRA);
if (cantidadesMal.length) {
  mal(`${cantidadesMal.length} compras no recibieron ${POR_COMPRA} números`);
} else {
  ok(`cada compra recibió exactamente ${POR_COMPRA} números`);
}

// --- Lo que importa: ¿hay repetidos? ---
const unicos = new Set(entregados);
if (unicos.size !== entregados.length) {
  const cuenta = {};
  const repes = entregados.filter((n) => (cuenta[n] = (cuenta[n] ?? 0) + 1) === 2);
  mal("HAY NÚMEROS REPETIDOS", `${repes.length}: ${repes.slice(0, 10).join(", ")}`);
} else {
  ok(`${entregados.length} números entregados, CERO repetidos`);
}

// --- Contraste contra la base ---
const { data: enBase } = await db
  .from("numeros").select("numero").not("pedido_id", "is", null);
const enBaseUnicos = new Set((enBase ?? []).map((f) => f.numero));

if ((enBase ?? []).length !== enBaseUnicos.size) {
  mal("la tabla tiene el mismo número asignado dos veces");
} else {
  ok("en la tabla cada número figura una sola vez", `${enBaseUnicos.size} tomados`);
}

const { count: libresAhora } = await db
  .from("numeros").select("numero", { count: "exact" }).is("pedido_id", null).limit(1);

const esperados = libresAntes - COMPRAS * POR_COMPRA;
if (libresAhora === esperados) {
  ok("la cuenta cierra", `${libresAntes} - ${COMPRAS * POR_COMPRA} = ${libresAhora} libres`);
} else {
  mal("la cuenta no cierra", `esperaba ${esperados}, hay ${libresAhora}`);
}

// --- Idempotencia bajo concurrencia: reintentamos los mismos webhooks a la vez ---
console.log("\nReintentando los mismos pagos en paralelo (Mercado Pago reintenta)...");
const reintentos = await Promise.all(
  pedidos.map((p) =>
    db.rpc("asignar_numeros", { p_pedido_id: p.id, p_payment_id: `PAGO-${p.id}` }),
  ),
);
const entregadosOtraVez = reintentos.flatMap((r) => r.data ?? []);
const mismos =
  entregadosOtraVez.length === entregados.length &&
  new Set(entregadosOtraVez).size === unicos.size &&
  [...new Set(entregadosOtraVez)].every((n) => unicos.has(n));

if (mismos) ok("los reintentos devuelven los mismos números, no toman nuevos");
else mal("los reintentos entregaron números distintos");

const { count: libresTrasReintento } = await db
  .from("numeros").select("numero", { count: "exact" }).is("pedido_id", null).limit(1);
if (libresTrasReintento === libresAhora) ok("los reintentos no consumieron stock");
else mal("los reintentos consumieron stock", `${libresAhora} → ${libresTrasReintento}`);

// --- Limpieza: borramos SOLO los pedidos que creamos, por id ---
console.log("\nLimpiando...");
const ids = pedidos.map((p) => p.id);
const { error: eDel } = await db.from("pedidos").delete().in("id", ids);
if (eDel) { mal("no se pudieron borrar los pedidos de prueba", eDel.message); }

const { count: libresFinal } = await db
  .from("numeros").select("numero", { count: "exact" }).is("pedido_id", null).limit(1);
const { count: pedidosFinal } = await db
  .from("pedidos").select("id", { count: "exact" }).limit(1);

if (libresFinal === libresAntes && pedidosFinal === 0) {
  ok("base restaurada", `${libresFinal} números libres, ${pedidosFinal} pedidos`);
} else {
  mal("la base NO quedó como estaba", `${libresFinal} libres, ${pedidosFinal} pedidos`);
}

console.log(`\n${fallos === 0 ? "TODO VERDE" : `${fallos} FALLA(S)`}\n`);
process.exit(fallos === 0 ? 0 : 1);
