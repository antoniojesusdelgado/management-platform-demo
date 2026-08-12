export default function ModuleLoading() {
  return (
    <main className="workspace module-loading" id="main-content" aria-busy="true" aria-label="Cargando módulo">
      <div className="loading-heading" aria-hidden="true">
        <span className="loading-line loading-line-short" />
        <span className="loading-line loading-line-title" />
        <span className="loading-line loading-line-copy" />
      </div>
      <div className="loading-metric-grid" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <div className="loading-panel" aria-hidden="true" />
      <span className="sr-only">Cargando el módulo solicitado…</span>
    </main>
  );
}
