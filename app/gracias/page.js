"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { config, formatearPrecio, linkConsulta } from "../config";

const ESPERA_MS = 2500; // cada cuánto le preguntamos al servidor
const INTENTOS_MAX = 48; // ~2 minutos antes de decir que algo raro pasa

const claseCaja =
  "w-full max-w-[430px] rounded-[28px] bg-white px-[25px] py-[30px] text-center shadow-[0_15px_40px_rgba(0,0,0,.12)] min-[701px]:px-[35px] min-[701px]:py-10";

const claseBotonRosa =
  "mt-[15px] block w-full rounded-2xl bg-[linear-gradient(90deg,#ff5da8,#ff80be)] p-[18px] text-[20px] font-bold text-white no-underline transition duration-[250ms] hover:-translate-y-[2px]";

const claseBotonVerde =
  "mt-[15px] block w-full rounded-2xl bg-[#25D366] p-4 text-[18px] font-bold text-white no-underline transition duration-[250ms] hover:-translate-y-[2px] hover:shadow-[0_12px_25px_rgba(37,211,102,.30)] min-[701px]:p-[18px] min-[701px]:text-[20px]";

function Caja({ children }) {
  return (
    <div className={claseCaja}>
      <Image
        src="/img/logo.svg"
        alt={config.marca}
        width={120}
        height={80}
        className="mx-auto mb-[25px] block h-auto w-[120px]"
      />
      {children}
    </div>
  );
}

function Titulo({ children }) {
  return (
    <h1 className="mb-[10px] text-[38px] leading-tight font-extrabold text-texto-fuerte min-[701px]:text-[46px]">
      {children}
    </h1>
  );
}

function Mensaje({ children }) {
  return <p className="mb-10 text-[20px] text-texto-suave">{children}</p>;
}

function BotonConsulta() {
  return (
    <a
      href={linkConsulta()}
      target="_blank"
      rel="noopener noreferrer"
      className={claseBotonVerde}
    >
      💬 Escribime por WhatsApp
    </a>
  );
}

function Gracias() {
  const pedidoId = useSearchParams().get("pedido");

  const [pedido, setPedido] = useState(null);
  const [estado, setEstado] = useState("cargando"); // cargando, ok, perdido, demorado, error

  useEffect(() => {
    if (!pedidoId) {
      setEstado("perdido");
      return;
    }

    let vivo = true;
    let intentos = 0;
    let temporizador;
    let ultimoPedido = null;

    // Volvemos a preguntar más tarde, salvo que ya hayamos insistido demasiado.
    function reintentar() {
      intentos += 1;

      if (intentos >= INTENTOS_MAX) {
        // Si nunca llegamos a leer el pedido es un problema nuestro; si lo
        // leímos y sigue pendiente, es el pago el que está demorado.
        setEstado(ultimoPedido ? "demorado" : "error");
        return;
      }

      temporizador = setTimeout(consultar, ESPERA_MS);
    }

    async function consultar() {
      if (!vivo) return;

      try {
        const respuesta = await fetch(`/api/pedido/${pedidoId}`, {
          cache: "no-store",
        });

        if (!vivo) return;

        if (respuesta.status === 404 || respuesta.status === 400) {
          setEstado("perdido");
          return;
        }

        // Error pasajero del servidor: insistimos en vez de quedarnos
        // colgados en la pantalla de carga.
        if (!respuesta.ok) {
          reintentar();
          return;
        }

        const datos = await respuesta.json();

        if (!vivo) return;

        ultimoPedido = datos;
        setPedido(datos);
        setEstado("ok");

        // Mientras el pago siga pendiente volvemos a preguntar: el webhook
        // de Mercado Pago puede tardar unos segundos en llegar.
        if (datos.estado === "pendiente") reintentar();
      } catch (problema) {
        console.error(problema);
        if (vivo) reintentar();
      }
    }

    consultar();

    return () => {
      vivo = false;
      clearTimeout(temporizador);
    };
  }, [pedidoId]);

  // --- No sabemos de qué pedido nos hablan ---
  if (estado === "perdido") {
    return (
      <Caja>
        <Titulo>No encontramos tu pedido</Titulo>
        <Mensaje>Volvé al inicio y completá tus datos. 💖</Mensaje>
        <Link href="/" className={claseBotonRosa}>
          Volver al inicio
        </Link>
      </Caja>
    );
  }

  // --- No conseguimos leer el pedido después de insistir ---
  if (estado === "error") {
    return (
      <Caja>
        <Titulo>No pudimos consultarlo</Titulo>
        <Mensaje>
          Tuvimos un problema para leer tu pedido. Si ya pagaste quedate
          tranquila, no se pierde: escribime y lo reviso a mano. 💖
        </Mensaje>
        <BotonConsulta />
      </Caja>
    );
  }

  if (estado === "cargando" || !pedido) {
    return (
      <Caja>
        <Titulo>Un segundo…</Titulo>
        <Mensaje>Estamos buscando tu pedido. 💖</Mensaje>
      </Caja>
    );
  }

  // --- Pago rechazado ---
  if (pedido.estado === "rechazado") {
    return (
      <Caja>
        <Titulo>El pago no salió</Titulo>
        <Mensaje>
          Mercado Pago rechazó la operación, así que no te cobramos nada.
        </Mensaje>
        <Link href="/" className={claseBotonRosa}>
          Intentar de nuevo
        </Link>
      </Caja>
    );
  }

  // --- Se agotaron los números con el pago ya hecho ---
  if (pedido.estado === "sin_stock") {
    return (
      <Caja>
        <Titulo>Se agotaron los números</Titulo>
        <Mensaje>
          Tu pago entró justo cuando se terminaban. Escribime y te devuelvo la
          plata enseguida. 💖
        </Mensaje>
        <BotonConsulta />
      </Caja>
    );
  }

  // --- Pago acreditado: acá están los números ---
  if (pedido.estado === "pagado") {
    return (
      <Caja>
        <Titulo>🎉 ¡Ya estás participando!</Titulo>
        <Mensaje>Tu pago se acreditó correctamente. 💖</Mensaje>

        <h2 className="mb-5 text-[32px] font-extrabold text-rosa min-[701px]:text-[38px]">
          🍀 ¡Estos son tus números!
        </h2>

        <div className="my-[25px] flex flex-wrap justify-center gap-[14px]">
          {pedido.numeros.map((numero) => (
            <span
              key={numero}
              className="flex h-[58px] min-w-[58px] items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff5da8,#ff80be)] px-3 text-[24px] font-bold text-white shadow-[0_10px_25px_rgba(255,93,168,.30)] min-[701px]:h-[65px] min-[701px]:min-w-[65px] min-[701px]:text-[28px]"
            >
              {numero}
            </span>
          ))}
        </div>

        {config.canalWhatsapp && (
          <a
            href={config.canalWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={claseBotonVerde}
          >
            💬 Unirme al canal de WhatsApp
          </a>
        )}

        <p className="mt-10 text-[16px] leading-[1.9] text-texto-suave min-[701px]:text-[17px]">
          ✨ Hacé una captura para guardar tus númeritos.
          <br />
          <br />
          Cuando termine la dinámica publico el listado completo de
          participantes y los números asignados.
        </p>
      </Caja>
    );
  }

  // --- Pendiente: esperando que Mercado Pago confirme ---
  return (
    <Caja>
      <Titulo>{estado === "demorado" ? "Está tardando" : "Casi listo…"}</Titulo>

      <Mensaje>
        {estado === "demorado"
          ? "Tu pago todavía no nos llegó confirmado. Si ya pagaste, escribime y lo reviso a mano."
          : "Estamos esperando que Mercado Pago confirme el pago. No cierres esta pantalla."}
      </Mensaje>

      {estado !== "demorado" && (
        <div
          aria-hidden
          className="mx-auto mb-10 h-12 w-12 animate-spin rounded-full border-4 border-rosa-borde border-t-rosa"
        />
      )}

      <dl className="rounded-[18px] bg-rosa-fondo px-[22px] py-5 text-left text-[17px] text-texto-suave">
        <div className="flex justify-between gap-3 py-[6px]">
          <dt>Nombre</dt>
          <dd className="text-right font-semibold text-texto-fuerte">
            {pedido.nombre}
          </dd>
        </div>
        <div className="flex justify-between gap-3 py-[6px]">
          <dt>Números</dt>
          <dd className="text-right font-semibold text-texto-fuerte">
            {pedido.cantidad}
          </dd>
        </div>
        <div className="mt-2 flex justify-between gap-3 border-t-2 border-white pt-3">
          <dt className="font-semibold text-texto-fuerte">Total</dt>
          <dd className="text-right text-[22px] font-extrabold text-rosa">
            {formatearPrecio(pedido.total)}
          </dd>
        </div>
      </dl>

      {estado === "demorado" && <BotonConsulta />}
    </Caja>
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
