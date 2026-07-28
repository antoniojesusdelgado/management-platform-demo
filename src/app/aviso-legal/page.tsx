import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";

export default function LegalNoticePage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Información legal</p>
        <h1>Aviso legal y propiedad intelectual</h1>
        <p>
          Antonio Jesús Delgado Briones es autor y titular de esta reconstrucción
          técnica independiente, de su código original, documentación, identidad
          visual y materiales propios, salvo los componentes de terceros
          identificados en el inventario de licencias.
        </p>
        <p>
          El repositorio se distribuye bajo una licencia propietaria de todos los
          derechos reservados. No se autoriza la reproducción, modificación,
          redistribución, explotación comercial o creación de obras derivadas sin
          autorización expresa y por escrito del titular.
        </p>
        <p>
          Esta demostración no contiene ni representa código, datos, marcas,
          pantallas, documentación, encargos, formatos o procesos internos de
          terceros. Los nombres de tecnologías conservan las marcas de sus
          respectivos titulares y su mención no implica afiliación ni respaldo.
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
