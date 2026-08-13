import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";

export default function DataProvenancePage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Procedencia</p>
        <h1>Procedencia de los datos</h1>
        <p>
          La plataforma genera un conjunto completamente
          ficticio de personas, proyectos, tareas, vacaciones, incidencias,
          tesorería, nóminas agregadas e integraciones. No copia filas, nombres,
          contactos, identificadores ni procesos de organizaciones reales.
        </p>
        <h2>Periodo de los datos de ejemplo</h2>
        <p>
          La información de ejemplo comienza el 1 de enero de 2025 y se amplía
          hasta la fecha preparada para cada espacio. Si se restauran los datos,
          la plataforma vuelve a crear un conjunto coherente sin utilizar
          información de personas u organizaciones reales.
        </p>
        <h2>Referencias y transformaciones</h2>
        <p>
          AdventureWorks (MIT) se usa únicamente como referencia opcional para
          organizar relaciones entre datos. Las estadísticas públicas y
          agregadas del INE (CC BY 4.0) pueden orientar algunas distribuciones.
          No se consultan datos individuales y todo el contenido final se crea
          de nuevo mediante reglas propias.
        </p>
        <p>
          Las conexiones de ejemplo no representan bancos, servicios de nóminas
          ni formatos de terceros. Los importes de nómina
          son siempre agregados; la relación de participantes no contiene
          retribuciones individuales.
        </p>
        <Link className="button button-secondary" href="/login">
          Volver al acceso
        </Link>
        <LegalFooter />
      </article>
    </main>
  );
}
