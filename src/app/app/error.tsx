"use client";

import Link from "next/link";

export default function AuthenticatedAreaError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="landing">
      <section className="landing-card">
        <div>
          <p className="eyebrow" style={{ color: "#93c5fd" }}>
            Acceso temporalmente interrumpido
          </p>
          <h1>No se pudo cargar el espacio</h1>
          <p>
            La sesión sigue protegida. Puedes volver a intentarlo o regresar a
            la pantalla de acceso.
          </p>
          <div className="landing-actions">
            <button className="button button-primary" type="button" onClick={unstable_retry}>
              Reintentar
            </button>
            <Link className="button button-secondary" href="/login">
              Volver al acceso
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
