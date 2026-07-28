import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";

export default function DataProvenancePage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Procedencia</p>
        <h1>Procedencia de los datos</h1>
        <p>
          La plataforma genera de forma determinista un conjunto completamente
          ficticio de personas, proyectos, tareas, vacaciones, incidencias,
          tesorería, nóminas agregadas e integraciones. No copia filas, nombres,
          contactos, identificadores ni procesos de organizaciones reales.
        </p>
        <h2>Escenario y periodo</h2>
        <p>
          La versión actual del escenario es la 5. El histórico
          comienza el 1 de enero de 2025 y termina en el ancla guardada al crear
          o restaurar cada espacio. La misma semilla y la misma ancla producen el
          mismo catálogo y checksum.
        </p>
        <h2>Referencias y transformaciones</h2>
        <p>
          AdventureWorks (MIT) se usa únicamente como referencia relacional
          opcional y las estadísticas agregadas del INE (CC BY 4.0) pueden
          orientar distribuciones. Los adaptadores son offline, no consumen
          microdatos y solo producen perfiles estadísticos agregados. Toda fila
          operativa final se genera de nuevo mediante reglas propias.
        </p>
        <p>
          Los conectores visibles son neutrales y no representan bancos,
          proveedores de nóminas ni formatos de terceros. Los importes de nómina
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
