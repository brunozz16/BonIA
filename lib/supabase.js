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

  cliente = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cliente;
}
