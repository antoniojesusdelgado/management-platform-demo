import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Transparencia</p>
        <h1>Privacidad de la demostración</h1>
        <p>
          Google OAuth se utiliza para verificar la sesión y crear un workspace
          técnico aislado. El correo permanece en Supabase Auth y no se publica
          en el directorio operativo. El perfil de aplicación usa un alias
          sintético y no copia el nombre ni el avatar del proveedor.
        </p>
        <p>
          La demo no solicita ni modela NIF, NAF, IBAN, teléfono, dirección,
          salario individual o documentación personal. Los registros
          operativos son sintéticos y pueden restaurarse.
        </p>
        <p>
          La demo invitada funciona únicamente en memoria y `sessionStorage`;
          sus cambios terminan con la sesión del navegador.
        </p>
        <Link className="button button-secondary" href="/login">
          Volver al acceso
        </Link>
      </article>
    </main>
  );
}
