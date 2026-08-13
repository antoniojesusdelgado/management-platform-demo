import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";

const contact =
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL ??
  "contacto@antoniodelgado.tech";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Transparencia</p>
        <h1>Política de privacidad</h1>
        <p>
          El responsable de la Plataforma de gestión es Antonio Jesús Delgado Briones.
          Para consultas o para ejercer derechos de acceso, rectificación,
          supresión, oposición, limitación y portabilidad puedes utilizar{" "}
          <a href={`mailto:${contact}`}>{contact}</a>
          .
        </p>
        <h2>Datos y finalidad</h2>
        <p>
          Google o Microsoft verifican tu identidad. La plataforma conserva el
          correo, una referencia interna y la información necesaria para mantener
          tu sesión y separar los datos de cada empresa. No copia automáticamente
          tu nombre ni tu imagen a la lista de personal.
        </p>
        <p>
          La finalidad es permitir el acceso, mantener la sesión, proteger el
          aislamiento entre espacios y prestar el servicio. La base jurídica
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
        <h2>Analítica opcional, almacenamiento local y cookies</h2>
        <p>
          El modo de exploración guarda los cambios solo durante la sesión del
          navegador y los elimina al cerrarla. El acceso con Google o Microsoft
          utiliza cookies necesarias para mantener la sesión y protegerla.
        </p>
        <p>
          Google Analytics 4 solo se carga si eliges “Permitir” en el
          aviso de preferencias. Se utiliza para conocer de forma agregada qué
          rutas se consultan, detectar problemas de uso y mejorar el producto.
          No se emplea para publicidad, se desactivan las señales de Google y la
          personalización de anuncios, y no se envían los datos operativos que
          introduces en formularios. Puedes rechazarlo con la misma facilidad o
          retirar el consentimiento en “Preferencias de analítica”, disponible
          en el pie legal.
        </p>
        <p>
          Google Search Console se utiliza para comprobar el dominio y conocer
          el rendimiento agregado en el buscador. No instala cookies en esta
          aplicación ni modifica tu elección de analítica.
        </p>
        <h2>Supresión de la cuenta</h2>
        <p>
          Desde “Mi perfil” puedes solicitar la supresión irreversible de tu
          identidad y desactivar el acceso. El correo, la cuenta de acceso y la
          imagen de perfil se eliminan o anonimizan. Los registros operativos que
          deban conservarse para mantener la integridad y el historial de una
          organización quedan desvinculados de tu identidad. También puedes
          ejercer este derecho escribiendo a <a href={`mailto:${contact}`}>{contact}</a>.
        </p>
        <h2>Seguridad y reclamaciones</h2>
        <p>
          Se aplican permisos por empresa, conexiones cifradas y un historial de
          cambios relevantes. Si consideras que el tratamiento no es correcto, también
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
