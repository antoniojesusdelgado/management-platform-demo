"use client";

import { IconExternalLink, IconLock, IconPlayerPlay } from "@tabler/icons-react";
import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { GuestDemoApp } from "@/components/guest-demo-app";

export function EmbedDemoEntry() {
  const [guestStarted, setGuestStarted] = useState(false);
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (guestStarted) return <GuestDemoApp />;

  return (
    <main className="embed-entry" data-embed-entry="true">
      <section className="embed-entry-card" aria-labelledby="embed-entry-title">
        <div className="embed-entry-brand" aria-hidden="true">
          <Image src="/brand-symbol.svg" alt="" width={56} height={56} priority />
        </div>
        <p className="eyebrow">Réplica pública</p>
        <h1 id="embed-entry-title">Explora la Plataforma de gestión</h1>
        <p className="embed-entry-lede">
          Recorre una demostración independiente del sistema interno, preparada exclusivamente con
          datos ficticios y sin información de Fundación Cibervoluntarios.
        </p>

        <div className="embed-entry-actions">
          <button
            type="button"
            className="button button-primary"
            disabled={!hydrated}
            onClick={() => setGuestStarted(true)}
          >
            <IconPlayerPlay size={20} aria-hidden="true" />
            Explorar demo sin registro
          </button>
          <a
            className="button button-secondary"
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
          >
            Continuar con Google
            <IconExternalLink size={18} aria-hidden="true" />
          </a>
        </div>

        <p className="embed-entry-note">
          <IconLock size={17} aria-hidden="true" />
          El acceso con Google se abre en una pestaña nueva y crea un espacio ficticio aislado.
        </p>
        <nav className="embed-entry-links" aria-label="Información de la demostración">
          <a href="/privacidad" target="_blank" rel="noopener noreferrer">
            Privacidad
          </a>
          <a href="/procedencia-datos" target="_blank" rel="noopener noreferrer">
            Procedencia de los datos
          </a>
          <a href="/aviso-legal" target="_blank" rel="noopener noreferrer">
            Aviso legal
          </a>
        </nav>
      </section>
    </main>
  );
}
