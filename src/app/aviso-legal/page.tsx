import Link from "next/link";
import type { Route } from "next";
import { LegalFooter } from "@/components/legal-footer";

export default function LegalNoticePage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Información legal</p>
        <h1>Aviso legal y propiedad intelectual</h1>
        <p>
          Antonio Jesús Delgado Briones es autor y titular de la Plataforma de
          gestión, de su código original, documentación, identidad visual y
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
          Cibervoluntarios. Esta implementación posterior no contiene código, datos,
          documentos, credenciales, reglas internas, pantallas ni conexiones del
          sistema de la Fundación. Su mención explica el origen funcional y no
          implica patrocinio, afiliación o respaldo del repositorio público.
        </p>
        <p>
          El servicio se facilita como producto digital en evolución. Aunque se
          aplican medidas de calidad y seguridad, su uso no constituye asesoramiento
          laboral, financiero o jurídico.
        </p>
        <h2>Transparencia del desarrollo</h2>
        <p>
          La metodología, la supervisión humana y las referencias normativas se
          explican en <Link href={"/transparencia-ia" as Route}>Transparencia con IA</Link>.
        </p>
        <Link className="button button-secondary" href="/login">
          Volver al acceso
        </Link>
        <LegalFooter />
      </article>
    </main>
  );
}
