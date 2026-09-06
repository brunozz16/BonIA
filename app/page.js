"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { config, formatearPrecio } from "./config";

// Opciones del desplegable: 1 número — $4.000, 2 números — $8.000, ...
const opciones = Array.from({ length: config.maxNumeros }, (_, i) => {
  const cantidad = i + 1;
  return {
    cantidad,
    etiqueta:
      `${cantidad} ${cantidad === 1 ? "número" : "números"} — ` +
      formatearPrecio(cantidad * config.precioPorNumero),
  };
});

const claseCampo =
  "mb-[18px] w-full rounded-[25px] border-2 border-rosa-borde bg-white px-[25px] py-5 text-[17px] outline-none transition duration-300 focus:border-rosa focus:shadow-[0_0_15px_rgba(255,93,168,.25)] disabled:opacity-60 min-[701px]:text-[18px]";

export default function Home() {
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const total = cantidad * config.precioPorNumero;

  // Si Mercado Pago nos devolvió por un pago rechazado, avisamos.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("pago") === "rechazado") {
      setError("El pago no se pudo completar. Podés intentarlo de nuevo.");
    }
  }, []);

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setError("");

    const datos = {
      nombre: nombre.trim(),
      whatsapp: whatsapp.trim(),
      cantidad,
    };

    if (!datos.nombre || !datos.whatsapp) {
      setError("Completá todos los datos.");
      return;
    }

    setEnviando(true);

    try {
      const respuesta = await fetch("/api/crear-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok || !resultado.linkDePago) {
        throw new Error(resultado.error ?? "No pudimos iniciar el pago.");
      }

      // A Mercado Pago. Cuando el pago se acredite, el webhook le asigna
      // los números y vuelve a /gracias?pedido=...
      window.location.href = resultado.linkDePago;
    } catch (problema) {
      console.error(problema);
      setError(problema.message);
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen justify-center bg-[linear-gradient(180deg,#fffdfd,#fff6fb)] px-5 py-10">
      <div className="w-full max-w-[650px] text-center">
        <Image
          src="/img/logo.svg"
          alt={config.marca}
          width={220}
          height={147}
          priority
          className="mx-auto mb-[25px] block h-auto w-[170px] min-[701px]:w-[220px]"
        />

        <Image
          src="/img/hero.svg"
          alt="Premios de la dinámica"
          width={560}
          height={560}
          priority
          className="mx-auto block h-auto w-full max-w-[560px] animate-flotar"
        />

        <form onSubmit={manejarEnvio} className="mt-[25px]">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="👤 Nombre y apellido"
            required
            autoComplete="name"
            disabled={enviando}
            className={claseCampo}
          />

          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="📲 Número de WhatsApp"
            required
            autoComplete="tel"
            disabled={enviando}
            className={claseCampo}
          />

          <label
            htmlFor="cantidad"
            className="mt-[30px] mb-[15px] block text-[20px] font-semibold text-[#555]"
          >
            ✨ Completá tus datos
          </label>

          <select
            id="cantidad"
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            required
            disabled={enviando}
            className="select-dinamica mx-auto block w-full max-w-full cursor-pointer rounded-[20px] border-2 border-rosa-borde bg-white py-[18px] pr-[50px] pl-[22px] text-[17px] font-semibold text-[#555] outline-none transition duration-300 hover:border-rosa focus:border-rosa focus:shadow-[0_0_15px_rgba(255,93,168,.25)] disabled:opacity-60 min-[701px]:w-[360px] min-[701px]:text-[18px]"
          >
            {opciones.map((opcion) => (
              <option key={opcion.cantidad} value={opcion.cantidad}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>

          <h3 className="mt-[30px] mb-10 text-[30px] font-extrabold text-texto-fuerte min-[701px]:text-[34px]">
            Total: {formatearPrecio(total)}
          </h3>

          {error && (
            <p
              role="alert"
              className="mb-6 rounded-[18px] bg-rosa-fondo px-5 py-4 text-[16px] font-semibold text-rosa"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full cursor-pointer rounded-[40px] bg-[linear-gradient(90deg,#ff5da8,#ff80be)] p-5 text-[20px] font-bold text-white shadow-[0_15px_30px_rgba(255,93,168,.35)] transition duration-300 hover:-translate-y-[3px] hover:shadow-[0_20px_40px_rgba(255,93,168,.45)] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 min-[701px]:p-[22px] min-[701px]:text-[23px]"
          >
            {enviando ? "Abriendo Mercado Pago…" : "🤍 QUIERO PARTICIPAR"}
          </button>
        </form>

        <p className="mx-auto mt-[55px] max-w-[520px] text-[16px] leading-[1.9] text-texto-suave min-[701px]:text-[17px]">
          💖 Vas a pagar con Mercado Pago. Apenas se acredite, tus números se
          asignan solos y se muestran en la siguiente pantalla.
        </p>
      </div>
    </main>
  );
}
