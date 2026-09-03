"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { config, formatearPrecio, linkWhatsApp } from "./config";

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

export default function Home() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cantidad, setCantidad] = useState(1);

  const total = cantidad * config.precioPorNumero;

  function manejarEnvio(evento) {
    evento.preventDefault();

    const datos = {
      nombre: nombre.trim(),
      whatsapp: whatsapp.trim(),
      cantidad,
    };

    if (!datos.nombre || !datos.whatsapp) {
      alert("Completá todos los datos.");
      return;
    }

    // Abrimos WhatsApp con el pedido ya escrito (esto corre dentro del
    // clic, así que el navegador no lo bloquea) y mostramos la pantalla
    // de confirmación por si no llegó a abrirse.
    window.open(linkWhatsApp(datos), "_blank", "noopener,noreferrer");

    const parametros = new URLSearchParams({
      nombre: datos.nombre,
      whatsapp: datos.whatsapp,
      cantidad: String(datos.cantidad),
    });

    router.push(`/gracias?${parametros.toString()}`);
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
            className="mb-[18px] w-full rounded-[25px] border-2 border-rosa-borde bg-white px-[25px] py-5 text-[17px] outline-none transition duration-300 focus:border-rosa focus:shadow-[0_0_15px_rgba(255,93,168,.25)] min-[701px]:text-[18px]"
          />

          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="📲 Número de WhatsApp"
            required
            autoComplete="tel"
            className="mb-[18px] w-full rounded-[25px] border-2 border-rosa-borde bg-white px-[25px] py-5 text-[17px] outline-none transition duration-300 focus:border-rosa focus:shadow-[0_0_15px_rgba(255,93,168,.25)] min-[701px]:text-[18px]"
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
            className="select-dinamica mx-auto block w-full max-w-full cursor-pointer rounded-[20px] border-2 border-rosa-borde bg-white py-[18px] pr-[50px] pl-[22px] text-[17px] font-semibold text-[#555] outline-none transition duration-300 hover:border-rosa focus:border-rosa focus:shadow-[0_0_15px_rgba(255,93,168,.25)] min-[701px]:w-[360px] min-[701px]:text-[18px]"
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

          <button
            type="submit"
            className="w-full cursor-pointer rounded-[40px] bg-[linear-gradient(90deg,#ff5da8,#ff80be)] p-5 text-[20px] font-bold text-white shadow-[0_15px_30px_rgba(255,93,168,.35)] transition duration-300 hover:-translate-y-[3px] hover:shadow-[0_20px_40px_rgba(255,93,168,.45)] min-[701px]:p-[22px] min-[701px]:text-[23px]"
          >
            🤍 QUIERO PARTICIPAR
          </button>
        </form>

        <p className="mx-auto mt-[55px] max-w-[520px] text-[16px] leading-[1.9] text-texto-suave min-[701px]:text-[17px]">
          💖 Al tocar el botón se abre WhatsApp con tu pedido ya escrito. Una vez
          confirmado el pago, tus números se asignan y te los paso por ese mismo
          chat.
        </p>
      </div>
    </main>
  );
}
