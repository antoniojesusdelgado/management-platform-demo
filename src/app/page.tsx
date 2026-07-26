import { IconArrowRight, IconShieldCheck } from "@tabler/icons-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing">
      <section className="landing-card" aria-labelledby="landing-title">
        <div>
          <p className="eyebrow" style={{ color: "#93c5fd" }}>
            Demo técnica independiente
          </p>
          <h1 id="landing-title">Plataforma de gestión</h1>
          <p>
            Una reconstrucción neutral de una suite operativa modular para
            explorar flujos, permisos y trazabilidad con datos completamente
            sintéticos.
          </p>
          <div className="landing-actions">
            <Link className="button button-primary" href="/demo/embed">
              Probar demo invitada
              <IconArrowRight aria-hidden="true" size={19} />
            </Link>
            <Link className="button button-secondary" href="/login">
              Continuar con Google
            </Link>
          </div>
        </div>
        <aside className="demo-note" aria-label="Condiciones de la demo">
          <IconShieldCheck aria-hidden="true" size={32} />
          <h2 style={{ marginTop: "1rem" }}>Entorno seguro de demostración</h2>
          <ul>
            <li>Sin datos personales ni información interna.</li>
            <li>Los cambios invitados viven solo en esta pestaña.</li>
            <li>Cada acceso con Google recibe un espacio sintético aislado.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
