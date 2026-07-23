import { IconArrowLeft, IconLock } from "@tabler/icons-react";
import Link from "next/link";
import { LoginButton } from "@/app/login/login-button";

export default function LoginPage() {
  return (
    <main className="landing">
      <section className="landing-card" aria-labelledby="login-title">
        <div>
          <p className="eyebrow" style={{ color: "#93c5fd" }}>
            Demo pública
          </p>
          <h1 id="login-title">Entrar en la plataforma</h1>
          <p>
            Google OAuth demuestra el acceso autenticado. Cada persona recibe
            un workspace sintético independiente con todos los permisos.
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
          <h2 style={{ marginTop: "1rem" }}>Privacidad por diseño</h2>
          <p>
            La aplicación no copia tu nombre, correo ni avatar al perfil
            operativo. Los cambios autenticados quedan aislados en tu propio
            espacio de demostración.
          </p>
        </aside>
      </section>
    </main>
  );
}
