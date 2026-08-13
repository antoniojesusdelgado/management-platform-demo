"use client";

import {
  IconCamera,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { removeOwnAvatarAction, uploadOwnAvatarAction } from "@/app/app/profile-actions";

type AvatarUploaderProps = {
  currentPath: string | null;
  currentUrl: string | null;
  displayName: string;
};

const MAX_INPUT_BYTES = 10 * 1024 * 1024;

export function AvatarUploader({
  currentPath,
  currentUrl,
  displayName,
}: AvatarUploaderProps) {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(currentUrl);
  const [avatarPath, setAvatarPath] = useState(currentPath);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(
    () => () => {
      if (selectedUrl) URL.revokeObjectURL(selectedUrl);
    },
    [selectedUrl],
  );

  function chooseFile(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Selecciona una imagen JPEG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      toast.error("La imagen original no puede superar 10 MB.");
      return;
    }
    if (selectedUrl) URL.revokeObjectURL(selectedUrl);
    setSelectedUrl(URL.createObjectURL(file));
    setSelectedFile(file);
  }

  function upload() {
    if (!selectedUrl || !selectedFile) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("avatar", selectedFile);
        const result = await uploadOwnAvatarAction(formData);
        if (!result.ok) throw new Error(result.message);
        setAvatarPath(result.data?.path ?? null);
        setAvatarUrl(result.data?.signedUrl ?? null);
        setSelectedUrl(null);
        setSelectedFile(null);
        toast.success("Foto de perfil actualizada");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar la foto de perfil.");
      }
    });
  }

  function remove() {
    if (!avatarPath) return;
    startTransition(async () => {
      const result = await removeOwnAvatarAction();
      if (!result.ok) { toast.error(result.message); return; }
      setAvatarPath(null);
      setAvatarUrl(null);
      toast.success("Foto de perfil eliminada");
      router.refresh();
    });
  }

  const previewUrl = selectedUrl ?? avatarUrl;

  return (
    <section className="profile-avatar-editor" aria-labelledby="avatar-title">
      <div className="profile-avatar-preview">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={`Foto de perfil de ${displayName}`}
            fill
            sizes="144px"
            unoptimized
            style={{
              objectFit: "cover",
            }}
          />
        ) : (
          <span aria-hidden="true">
            {displayName
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase()}
          </span>
        )}
        <button
          className="profile-avatar-camera"
          type="button"
          aria-label="Seleccionar una foto de perfil"
          onClick={() => inputRef.current?.click()}
        >
          <IconCamera aria-hidden="true" size={18} />
        </button>
      </div>

      <div className="profile-avatar-controls">
        <div>
          <p className="eyebrow">Imagen privada</p>
          <h2 id="avatar-title">Foto de perfil</h2>
          <p className="muted">
            Se recorta a 512 px y se convierte a WebP antes de subirla.
          </p>
        </div>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />

        <div className="profile-avatar-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
          >
            <IconUpload aria-hidden="true" size={18} />
            {avatarPath ? "Sustituir" : "Seleccionar"}
          </button>
          {selectedUrl ? (
            <button
              className="button button-primary"
              type="button"
              onClick={upload}
              disabled={pending}
            >
              {pending ? "Subiendo…" : "Guardar foto"}
            </button>
          ) : null}
          {avatarPath && !selectedUrl ? (
            <button
              className="button button-danger"
              type="button"
              onClick={remove}
              disabled={pending}
            >
              <IconTrash aria-hidden="true" size={18} />
              Eliminar
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
