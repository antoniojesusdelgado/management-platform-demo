import Link from "next/link";

export default function DataProvenancePage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="eyebrow">Procedencia</p>
        <h1>Procedencia de los datos</h1>
        <p>
          La plataforma genera un grafo determinista de personas, proyectos,
          tareas, vacaciones, incidencias y registros agregados. No copia filas
          de bases públicas ni mantiene conexiones SQL externas en producción.
        </p>
        <p>
          AdventureWorks, bajo licencia MIT, se utiliza únicamente como
          referencia relacional opcional. Las estadísticas abiertas del INE,
          bajo CC BY 4.0, pueden calibrar magnitudes agregadas mediante
          adaptadores offline que no aceptan microdatos.
        </p>
        <p>
          El conjunto de datos se identifica mediante una versión y puede
          reproducirse con una semilla estable. Los conectores visibles se
          denominan Fuente financiera A, Fuente financiera B, Maestro de
          nóminas y Maestro de personal.
        </p>
        <Link className="button button-secondary" href="/login">
          Volver al acceso
        </Link>
      </article>
    </main>
  );
}
