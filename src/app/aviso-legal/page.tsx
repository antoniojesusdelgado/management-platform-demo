import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";

export default function LegalNoticePage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Información legal</p>
        <h1>Aviso legal y propiedad intelectual</h1>
        <p>
          Antonio Jesús Delgado Briones es autor y titular de esta réplica técnica
          pública, de su código original, documentación, identidad visual y
          materiales propios, salvo los componentes de terceros identificados en
          el inventario de licencias.
        </p>
        <p>
          El repositorio se distribuye bajo una licencia propietaria de todos los
          derechos reservados. No se autoriza la reproducción, modificación,
          redistribución, explotación comercial o creación de obras derivadas sin
          autorización expresa y por escrito del titular.
        </p>
        <p>
          El proyecto original fue realizado e implantado en Fundación
          Cibervoluntarios. Esta réplica posterior no contiene código, datos,
          documentos, credenciales, reglas internas, pantallas ni conexiones del
          sistema de la Fundación. Su mención explica el origen funcional y no
          implica patrocinio, afiliación o respaldo del repositorio público.
        </p>
        <p>
          El servicio se facilita con fines de demostración técnica. Aunque se han
          aplicado medidas de calidad y seguridad, no sustituye a un sistema de
          producción ni constituye asesoramiento laboral, financiero o jurídico.
        </p>
        <Link className="button button-secondary" href="/login">
          Volver al acceso
        </Link>
        <LegalFooter />
      </article>
    </main>
  );
}
