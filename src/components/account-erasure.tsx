"use client";

import { IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { eraseOwnAccountAction } from "@/app/app/profile-actions";

const CONFIRMATION_TEXT = "ELIMINAR MI CUENTA";

export function AccountErasure() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, startTransition] = useTransition();

  function eraseAccount() {
    startTransition(async () => {
      const result = await eraseOwnAccountAction(confirmation);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      window.localStorage.clear();
      window.sessionStorage.clear();
      router.replace("/login?account=deleted");
      router.refresh();
    });
  }

  return (
    <section className="card profile-section profile-section-wide account-erasure" aria-labelledby="account-erasure-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Privacidad</p>
          <h2 id="account-erasure-title">Eliminar mi cuenta</h2>
        </div>
        <IconTrash aria-hidden="true" size={24} />
      </div>
      <p className="muted">
        Desconecta tus integraciones, anonimiza tu identidad y desactiva el
        acceso de forma irreversible. La trazabilidad operativa se conserva sin
        datos que te identifiquen.
      </p>
      {!expanded ? (
        <button className="button button-danger" type="button" onClick={() => setExpanded(true)}>
          Solicitar supresión
        </button>
      ) : (
        <div className="account-erasure-confirmation">
          <label className="field">
            Escribe <strong>{CONFIRMATION_TEXT}</strong> para confirmar
            <input
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          <div className="dialog-actions">
            <button className="button button-secondary" type="button" onClick={() => setExpanded(false)} disabled={pending}>Cancelar</button>
            <button className="button button-danger" type="button" onClick={eraseAccount} disabled={pending || confirmation !== CONFIRMATION_TEXT}>
              {pending ? "Eliminando…" : "Eliminar definitivamente"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
