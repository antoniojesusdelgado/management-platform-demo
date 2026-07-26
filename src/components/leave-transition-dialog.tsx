"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";

type LeaveTransitionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  destructive?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (note: string) => boolean | Promise<boolean>;
};

export function LeaveTransitionDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  destructive = false,
  onOpenChange,
  onConfirm,
}: LeaveTransitionDialogProps) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setNote("");
      setError("");
    }
    onOpenChange(nextOpen);
  }

  async function confirm() {
    const normalizedNote = note.trim();
    if (normalizedNote.length < 3) {
      setError("Añade una nota de al menos 3 caracteres.");
      return;
    }

    const completed = await onConfirm(normalizedNote);
    if (completed) handleOpenChange(false);
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content transition-dialog">
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description className="muted">
            {description}
          </AlertDialog.Description>
          <div className="field transition-note-field">
            <label htmlFor="leave-transition-note">Nota de decisión</label>
            <textarea
              id="leave-transition-note"
              value={note}
              maxLength={300}
              disabled={pending}
              aria-invalid={Boolean(error)}
              onChange={(event) => {
                setNote(event.target.value);
                if (error) setError("");
              }}
            />
            {error ? (
              <p className="field-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <div className="dialog-actions">
            <AlertDialog.Cancel asChild>
              <button
                className="button button-secondary"
                type="button"
                disabled={pending}
              >
                Volver
              </button>
            </AlertDialog.Cancel>
            <button
              className={`button ${destructive ? "button-danger" : "button-primary"}`}
              type="button"
              disabled={pending}
              onClick={confirm}
            >
              {pending ? "Guardando…" : confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
