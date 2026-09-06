// Script temporal de verificación. No imprime las claves.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function ok(t, d = "") { console.log(`  OK   ${t}${d ? " — " + d : ""}`); }
function mal(t, d = "") { console.log(` FALLA ${t}${d ? " — " + d : ""}`); }

console.log("\n== Variables ==");

if (!url) { mal("SUPABASE_URL está vacía"); process.exit(1); }

// Nunca imprimimos valores: cualquiera de estas líneas puede tener un secreto
// pegado por error, y lo que se imprime queda en el historial de la terminal.
if (url.startsWith("sb_secret_") || url.startsWith("sb_publishable_")) {
  mal("en SUPABASE_URL hay una CLAVE, no una URL", "las líneas están cruzadas");
  process.exit(1);
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
  mal("SUPABASE_URL tiene forma rara", "debería ser https://xxxx.supabase.co");
} else {
  ok("SUPABASE_URL con formato correcto");
}

if (!key) { mal("SUPABASE_SERVICE_ROLE_KEY está vacía"); process.exit(1); }

const tipo = key.startsWith("sb_secret_")
  ? "clave secreta nueva (sb_secret_)"
  : key.startsWith("sb_publishable_")
    ? "PUBLISHABLE — es la equivocada"
    : key.startsWith("ey")
      ? "JWT legacy (service_role o anon)"
      : "formato desconocido";

if (key.startsWith("sb_publishable_")) {
  mal("pegaste la publishable, no la secreta", "tiene que empezar con sb_secret_");
  process.exit(1);
}
if (key.startsWith("https://")) {
  mal("en SUPABASE_SERVICE_ROLE_KEY hay una URL, no una clave", "las líneas están cruzadas");
  process.exit(1);
}
ok("SUPABASE_SERVICE_ROLE_KEY presente", `${tipo}, ${key.length} caracteres`);

const db = createClient(url, key, { auth: { persistSession: false } });

console.log("\n== Conexión y esquema ==");

// Sin head:true, porque con head:true supabase-js se come el error.
const { count: totalNumeros, error: e1 } = await db
  .from("numeros")
  .select("numero", { count: "exact" })
  .limit(1);

if (e1 || totalNumeros === null) {
  const detalle = e1 ? `${e1.code ?? ""} ${e1.message}` : "la consulta no devolvió nada";
  mal("no se pudo leer la tabla `numeros`", detalle);
  if (/does not exist|schema cache|PGRST205/i.test(detalle)) {
    console.log("\n  → Falta correr supabase/schema.sql en el SQL Editor.\n");
  } else if (/JWT|api key|Invalid/i.test(e1.message)) {
    console.log("\n  → La clave no es válida para este proyecto. Revisá que sean del MISMO proyecto.\n");
  }
  process.exit(1);
}
ok("conecta y lee la tabla `numeros`", `${totalNumeros} números cargados`);

const { count: libres } = await db
  .from("numeros")
  .select("numero", { count: "exact" })
  .is("pedido_id", null)
  .limit(1);
ok("números libres", String(libres));

const { count: pedidos, error: e2 } = await db
  .from("pedidos")
  .select("id", { count: "exact" })
  .limit(1);
if (e2) { mal("tabla `pedidos`", e2.message); process.exit(1); }
ok("tabla `pedidos` accesible", `${pedidos} pedidos`);

// La función tiene que existir y quejarse de que el pedido no existe.
const { error: e3 } = await db.rpc("asignar_numeros", {
  p_pedido_id: "00000000-0000-0000-0000-000000000000",
  p_payment_id: "PRUEBA",
});

if (e3 && /No existe el pedido/.test(e3.message)) {
  ok("la función asignar_numeros() existe y valida bien");
} else if (e3 && /could not find|does not exist|PGRST202/i.test(`${e3.code} ${e3.message}`)) {
  mal("falta la función asignar_numeros()", "corré supabase/schema.sql completo");
  process.exit(1);
} else if (e3) {
  mal("asignar_numeros() dio un error inesperado", e3.message);
  process.exit(1);
} else {
  mal("asignar_numeros() no falló con un pedido inexistente");
  process.exit(1);
}

console.log("\nSUPABASE LISTO\n");
