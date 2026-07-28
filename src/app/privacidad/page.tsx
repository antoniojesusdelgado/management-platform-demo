import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";

const contact = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL;

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Transparencia</p>
        <h1>Política de privacidad</h1>
        <p>
          El responsable de esta demostración es Antonio Jesús Delgado Briones.
          Para consultas o para ejercer derechos de acceso, rectificación,
          supresión, oposición, limitación y portabilidad puedes utilizar{" "}
          {contact ? (
            <a href={`mailto:${contact}`}>{contact}</a>
          ) : (
            "el canal público de contacto indicado en el portfolio"
          )}
          .
        </p>
        <h2>Datos y finalidad</h2>
        <p>
          Google OAuth verifica la identidad y Supabase Auth conserva el correo,
          el identificador técnico, la sesión y los registros necesarios para
          crear un espacio personal aislado. La aplicación no copia el nombre ni
          el avatar de Google al directorio operativo.
        </p>
        <p>
          La finalidad es permitir el acceso, mantener la sesión, proteger el
          aislamiento entre espacios y operar esta demostración. La base jurídica
          es la solicitud de acceso y el interés legítimo en mantener la seguridad
          del servicio. No se realizan comunicaciones comerciales, perfiles
          publicitarios ni decisiones automatizadas.
        </p>
        <h2>Conservación, proveedores y transferencias</h2>
        <p>
          Los espacios inactivos pueden eliminarse tras 90 días. Los datos
          técnicos se alojan en Supabase y Vercel, y la autenticación utiliza
          Google. Estos proveedores pueden realizar transferencias internacionales
          con las garantías indicadas en sus condiciones y mecanismos aplicables.
        </p>
        <h2>Almacenamiento local y cookies</h2>
        <p>
          La modalidad invitada usa únicamente <code>sessionStorage</code>; sus
          cambios se eliminan al terminar la sesión del navegador. La modalidad
          OAuth emplea cookies técnicas imprescindibles para PKCE, sesión y
          seguridad. No se instalan cookies de marketing.
        </p>
        <h2>Seguridad y reclamaciones</h2>
        <p>
          Se aplican control de acceso, RLS, cifrado en tránsito y registros de
          auditoría. Si consideras que el tratamiento no es correcto, también
          puedes reclamar ante la Agencia Española de Protección de Datos.
        </p>
        <div className="legal-actions">
          <Link className="button button-secondary" href="/login">
            Volver al acceso
          </Link>
          <a href="https://www.aepd.es/" rel="noreferrer">AEPD</a>
        </div>
        <LegalFooter />
      </article>
    </main>
  );
}
