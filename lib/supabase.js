import { createClient } from "@supabase/supabase-js";

let cliente = null;

/**
 * Cliente de Supabase para usar SOLO en el servidor.
 *
 * Usa la service_role key, que se saltea RLS y puede leer y escribir todo.
 * Nunca importes este archivo desde un componente con "use client".
 */
export function getSupabase() {
  if (cliente) return cliente;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. " +
        "Copiá .env.example a .env.local y completalas.",
    );
  }

  // El panel de Supabase muestra el "API URL" como https://xxx.supabase.co/rest/v1/,
  // pero la librería agrega ese path sola. Nos quedamos con el origen para que
  // pegar el valor tal cual del dashboard no rompa nada.
  const urlLimpia = url.trim().replace(/\/(rest|auth|storage|realtime)\/v\d.*$/, "").replace(/\/+$/, "");

  cliente = createClient(urlLimpia, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cliente;
}
