"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  IconAlertTriangle,
  IconBriefcase,
  IconCalendar,
  IconChevronRight,
  IconSearch,
  IconTicket,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActionResult } from "@/domain/action-result";
import type { WorkspaceSearchResult, WorkspaceWorkItem } from "@/domain/workspace-productivity";

type WorkspaceCommandCenterProps = {
  search: (query: string) => Promise<ActionResult<WorkspaceSearchResult[]>>;
  loadInbox: () => Promise<ActionResult<WorkspaceWorkItem[]>>;
  onOpenItem?: (item: WorkspaceSearchResult | WorkspaceWorkItem) => void;
};

const kindLabels = {
  person: "Personas",
  project: "Proyectos",
  task: "Tareas",
  incident: "Incidencias",
} as const;
const priorityLabels = { low: "Baja", medium: "Media", high: "Alta", critical: "Crítica" };

export function WorkspaceCommandCenter({ search, loadInbox, onOpenItem }: WorkspaceCommandCenterProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"search" | "inbox">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkspaceSearchResult[]>([]);
  const [inbox, setInbox] = useState<WorkspaceWorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const requestId = useRef(0);
  const inboxRequestId = useRef(0);

  const openItem = useCallback((item: WorkspaceSearchResult | WorkspaceWorkItem) => {
    setOpen(false);
    if (onOpenItem) onOpenItem(item);
    else router.push(item.href as Route);
  }, [onOpenItem, router]);

  const openSearch = useCallback(() => {
    setTab("search");
    setError("");
    setLoading(query.trim().length >= 2);
    setOpen(true);
  }, [query]);
  const openInbox = useCallback(() => {
    const currentRequest = ++inboxRequestId.current;
    setTab("inbox");
    setLoading(true);
    setError("");
    setActiveIndex(0);
    setOpen(true);
    void loadInbox().then((result) => {
      if (currentRequest !== inboxRequestId.current) return;
      if (result.ok) setInbox(result.data);
      else setError(result.message);
      setLoading(false);
    });
  }, [loadInbox]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [openSearch]);

  useEffect(() => {
    if (!open || tab !== "search") return;
    const currentRequest = ++requestId.current;
    if (query.trim().length < 2) return;
    const timer = window.setTimeout(() => {
      void search(query).then((result) => {
        if (currentRequest !== requestId.current) return;
        if (result.ok) {
          setResults(result.data);
          setError("");
        } else {
          setResults([]);
          setError(result.message);
        }
        setActiveIndex(0);
        setLoading(false);
      });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open, query, search, tab]);

  function changeQuery(value: string) {
    setQuery(value);
    setError("");
    setActiveIndex(0);
    if (value.trim().length < 2) {
      requestId.current += 1;
      setResults([]);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  const groupedResults = useMemo(() => Object.entries(kindLabels)
    .map(([kind, label]) => ({ kind, label, items: results.filter((item) => item.kind === kind) }))
    .filter((group) => group.items.length), [results]);
  const visibleItems = tab === "search" ? results : inbox;

  function handleListKeyDown(event: React.KeyboardEvent) {
    if (!visibleItems.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + direction + visibleItems.length) % visibleItems.length);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = visibleItems[activeIndex];
      if (item) openItem(item);
    }
  }

  return (
    <>
      <div className="workspace-tools">
        <button type="button" className="button button-quiet workspace-search-trigger" aria-label="Buscar en el espacio de trabajo" onClick={openSearch}>
          <IconSearch size={18} aria-hidden="true" />
          <span>Buscar</span><kbd>Ctrl K</kbd>
        </button>
        <button type="button" className="button button-quiet workspace-inbox-trigger" aria-label="Bandeja" onClick={openInbox}>
          <IconBriefcase size={18} aria-hidden="true" />
          <span>Bandeja</span>
        </button>
      </div>
      <Dialog.Root open={open} onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          requestId.current += 1;
          inboxRequestId.current += 1;
        }
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content workspace-command-dialog" aria-describedby="workspace-command-description">
            <div className="dialog-header">
              <div><Dialog.Title>Centro de trabajo</Dialog.Title><Dialog.Description id="workspace-command-description" className="muted">Busca cualquier elemento o revisa lo que requiere tu atención.</Dialog.Description></div>
              <Dialog.Close className="icon-button" aria-label="Cerrar"><IconX size={19} /></Dialog.Close>
            </div>
            <div className="segmented workspace-command-tabs" role="tablist" aria-label="Vista del centro de trabajo">
              <button type="button" role="tab" aria-selected={tab === "search"} className={tab === "search" ? "active" : ""} onClick={openSearch}><IconSearch size={17} />Buscar</button>
              <button type="button" role="tab" aria-selected={tab === "inbox"} className={tab === "inbox" ? "active" : ""} onClick={openInbox}><IconBriefcase size={17} />Mi bandeja</button>
            </div>
            {tab === "search" ? <label className="workspace-command-search"><span className="sr-only">Buscar en el espacio de trabajo</span><IconSearch size={19} aria-hidden="true" /><input autoFocus type="search" value={query} onChange={(event) => changeQuery(event.target.value)} onKeyDown={handleListKeyDown} placeholder="Persona, proyecto, tarea o incidencia…" autoComplete="off" /></label> : null}
            <div className="workspace-command-results" role="region" aria-label={tab === "search" ? "Resultados de búsqueda" : "Elementos de la bandeja"} aria-busy={loading} onKeyDown={handleListKeyDown} tabIndex={tab === "inbox" ? 0 : -1}>
              {loading ? <p className="muted workspace-command-state">Cargando…</p> : null}
              {error ? <p className="inline-alert workspace-command-state" role="status">{error}</p> : null}
              {!loading && !error && tab === "search" && query.trim().length < 2 ? <p className="muted workspace-command-state">Escribe al menos dos caracteres. Puedes usar ↑, ↓ y Enter.</p> : null}
              {!loading && !error && tab === "search" && query.trim().length >= 2 && !results.length ? <p className="muted workspace-command-state">No hay coincidencias en tu espacio.</p> : null}
              {!loading && !error && tab === "inbox" && !inbox.length ? <p className="muted workspace-command-state">No tienes trabajo pendiente en esta bandeja.</p> : null}
              {tab === "search" ? groupedResults.map((group) => <section className="workspace-command-group" key={group.kind}><h3>{group.label}</h3>{group.items.map((item) => {
                const index = results.indexOf(item); return <CommandResult key={`${item.kind}-${item.id}`} item={item} active={index === activeIndex} onOpen={() => openItem(item)} />;
              })}</section>) : inbox.map((item, index) => <button type="button" data-kind={item.kind} aria-current={index === activeIndex ? "true" : undefined} className={`workspace-command-item${index === activeIndex ? " active" : ""}`} key={`${item.kind}-${item.id}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => openItem(item)}><span className={`workspace-command-priority priority-${item.priority}`} aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.description}{item.dueAt ? ` · ${item.dueAt}` : ""}</small></span><span className={`status priority-label-${item.priority}`}>{priorityLabels[item.priority]}</span><IconChevronRight size={18} aria-hidden="true" /></button>)}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function CommandResult({ item, active, onOpen }: { item: WorkspaceSearchResult; active: boolean; onOpen: () => void }) {
  const Icon = item.kind === "person" ? IconUser : item.kind === "project" ? IconBriefcase : item.kind === "task" ? IconCalendar : item.priority === "critical" ? IconAlertTriangle : IconTicket;
  return <button type="button" aria-current={active ? "true" : undefined} className={`workspace-command-item${active ? " active" : ""}`} onClick={onOpen}><Icon size={19} aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.description}</small></span>{item.status ? <span className="status">{item.status.replaceAll("_", " ")}</span> : null}<IconChevronRight size={18} aria-hidden="true" /></button>;
}
