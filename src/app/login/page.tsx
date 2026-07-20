import { IconArrowLeft, IconLock } from "@tabler/icons-react";
import Link from "next/link";
import { LoginButton } from "@/app/login/login-button";

export default function LoginPage() {
  return (
    <main className="landing">
      <section className="landing-card" aria-labelledby="login-title">
        <div>
          <p className="eyebrow" style={{ color: "#93c5fd" }}>
            Acceso restringido
          </p>
          <h1 id="login-title">Entrar en la plataforma</h1>
          <p>
            La aplicación completa usa Google OAuth y solo admite cuentas
            invitadas por una organización. No existe registro público.
          </p>
          <div className="landing-actions">
            <LoginButton />
            <Link className="button button-secondary" href="/demo/embed">
              <IconArrowLeft aria-hidden="true" size={18} />
              Volver a la demo
            </Link>
          </div>
        </div>
        <aside className="demo-note">
          <IconLock aria-hidden="true" size={31} />
          <h2 style={{ marginTop: "1rem" }}>Autenticación preparada</h2>
          <p>
            La conexión permanecerá desactivada hasta crear el proyecto
            Supabase independiente y configurar Google OAuth.
          </p>
        </aside>
      </section>
    </main>
  );
}
