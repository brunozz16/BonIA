"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { config, formatearPrecio, linkWhatsApp } from "../config";

function Gracias() {
  const parametros = useSearchParams();

  const nombre = parametros.get("nombre") ?? "";
  const whatsapp = parametros.get("whatsapp") ?? "";
  const cantidad = Number(parametros.get("cantidad")) || 1;
  const total = cantidad * config.precioPorNumero;

  // Si alguien entra directo a /gracias no hay pedido que mostrar.
  if (!nombre) {
    return (
      <div className="w-full max-w-[430px] rounded-[28px] bg-white px-[25px] py-[30px] text-center shadow-[0_15px_40px_rgba(0,0,0,.12)] min-[701px]:px-[35px] min-[701px]:py-10">
        <h1 className="mb-[10px] text-[32px] font-extrabold text-texto-fuerte">
          No encontramos tu pedido
        </h1>
        <p className="mb-10 text-[20px] text-texto-suave">
          Volvé al inicio y completá tus datos. 💖
        </p>
        <Link
          href="/"
          className="mt-[15px] block w-full rounded-2xl bg-[linear-gradient(90deg,#ff5da8,#ff80be)] p-[18px] text-[20px] font-bold text-white no-underline transition duration-[250ms] hover:-translate-y-[2px]"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[430px] rounded-[28px] bg-white px-[25px] py-[30px] text-center shadow-[0_15px_40px_rgba(0,0,0,.12)] min-[701px]:px-[35px] min-[701px]:py-10">
      <Image
        src="/img/logo.svg"
        alt={config.marca}
        width={120}
        height={80}
        className="mx-auto mb-[25px] block h-auto w-[120px]"
      />

      <h1 className="mb-[10px] text-[38px] leading-tight font-extrabold text-texto-fuerte min-[701px]:text-[46px]">
        🎉 ¡Casi listo!
      </h1>

      <p className="mb-10 text-[20px] text-texto-suave">
        {nombre.split(" ")[0]}, te abrimos WhatsApp con tu pedido escrito. 💖
      </p>

      <h2 className="mb-5 text-[32px] font-extrabold text-rosa min-[701px]:text-[38px]">
        🍀 Tu pedido
      </h2>

      <dl className="mb-10 rounded-[18px] bg-rosa-fondo px-[22px] py-5 text-left text-[17px] text-texto-suave">
        <div className="flex justify-between gap-3 py-[6px]">
          <dt>Nombre</dt>
          <dd className="text-right font-semibold text-texto-fuerte">
            {nombre}
          </dd>
        </div>
        <div className="flex justify-between gap-3 py-[6px]">
          <dt>WhatsApp</dt>
          <dd className="text-right font-semibold text-texto-fuerte">
            {whatsapp}
          </dd>
        </div>
        <div className="flex justify-between gap-3 py-[6px]">
          <dt>Números</dt>
          <dd className="text-right font-semibold text-texto-fuerte">
            {cantidad}
          </dd>
        </div>
        <div className="mt-2 flex justify-between gap-3 border-t-2 border-white pt-3">
          <dt className="font-semibold text-texto-fuerte">Total</dt>
          <dd className="text-right text-[22px] font-extrabold text-rosa">
            {formatearPrecio(total)}
          </dd>
        </div>
      </dl>

      <a
        href={linkWhatsApp({ nombre, whatsapp, cantidad })}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-[15px] block w-full rounded-2xl bg-[#25D366] p-[16px] text-[18px] font-bold text-white no-underline transition duration-[250ms] hover:-translate-y-[2px] hover:shadow-[0_12px_25px_rgba(37,211,102,.30)] min-[701px]:p-[18px] min-[701px]:text-[20px]"
      >
        💬 Enviar mi pedido por WhatsApp
      </a>

      {config.canalWhatsapp && (
        <a
          href={config.canalWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-[15px] block w-full rounded-2xl border-2 border-rosa-borde p-[16px] text-[18px] font-bold text-rosa no-underline transition duration-[250ms] hover:-translate-y-[2px] hover:border-rosa min-[701px]:p-[18px] min-[701px]:text-[20px]"
        >
          ✨ Unirme al canal de WhatsApp
        </a>
      )}

      <p className="mt-10 text-[16px] leading-[1.9] text-texto-suave min-[701px]:text-[17px]">
        Podés transferir a <strong className="text-rosa">{config.alias}</strong>
        {config.titular ? ` (${config.titular})` : ""} y mandarme el
        comprobante por el chat.
        <br />
        <br />
        Cuando confirme el pago te asigno tus números y publico el listado
        completo de participantes en mi canal de WhatsApp.
      </p>
    </div>
  );
}

export default function PaginaGracias() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-rosa-fondo p-5">
      <Suspense fallback={null}>
        <Gracias />
      </Suspense>
    </main>
  );
}
