"use client";

import {
  IconCamera,
  IconPhotoEdit,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type AvatarUploaderProps = {
  currentPath: string | null;
  currentUrl: string | null;
  displayName: string;
};

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;

async function loadImage(source: string) {
  const image = new window.Image();
  image.decoding = "async";
  image.src = source;
  await image.decode();
  return image;
}

async function createAvatarBlob(source: string, zoom: number) {
  const image = await loadImage(source);
  const shortestSide = Math.min(image.naturalWidth, image.naturalHeight);
  const cropSize = shortestSide / zoom;
  const sourceX = (image.naturalWidth - cropSize) / 2;
  const sourceY = (image.naturalHeight - cropSize) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropSize,
    cropSize,
    0,
    0,
    512,
    512,
  );
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.86),
  );
  if (!blob || blob.size > MAX_OUTPUT_BYTES) {
    throw new Error("Avatar output exceeds the allowed size");
  }
  return blob;
}

export function AvatarUploader({
  currentPath,
  currentUrl,
  displayName,
}: AvatarUploaderProps) {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(currentUrl);
  const [avatarPath, setAvatarPath] = useState(currentPath);
  const [zoom, setZoom] = useState(1);
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
    setZoom(1);
  }

  function upload() {
    if (!selectedUrl) return;
    startTransition(async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Missing authenticated user");

        const blob = await createAvatarBlob(selectedUrl, zoom);
        const nextPath = `${user.id}/${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from("profile-avatars")
          .upload(nextPath, blob, {
            contentType: "image/webp",
            cacheControl: "3600",
            upsert: false,
          });
        if (uploadError) throw uploadError;

        const { error: profileError } = await supabase.rpc(
          "set_own_avatar_path",
          { target_path: nextPath },
        );
        if (profileError) {
          await supabase.storage.from("profile-avatars").remove([nextPath]);
          throw profileError;
        }

        if (avatarPath) {
          await supabase.storage.from("profile-avatars").remove([avatarPath]);
        }
        const { data } = await supabase.storage
          .from("profile-avatars")
          .createSignedUrl(nextPath, 3600);
        setAvatarPath(nextPath);
        setAvatarUrl(data?.signedUrl ?? selectedUrl);
        setSelectedUrl(null);
        toast.success("Foto de perfil actualizada");
        router.refresh();
      } catch {
        toast.error("No se pudo actualizar la foto de perfil.");
      }
    });
  }

  function remove() {
    if (!avatarPath) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("clear_own_avatar_path");
      if (error) {
        toast.error("No se pudo eliminar la foto de perfil.");
        return;
      }
      await supabase.storage.from("profile-avatars").remove([avatarPath]);
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
              transform: selectedUrl ? `scale(${zoom})` : undefined,
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

        {selectedUrl ? (
          <label className="avatar-zoom">
            <IconPhotoEdit aria-hidden="true" size={18} />
            Encuadre
            <input
              type="range"
              min="1"
              max="2"
              step="0.05"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
        ) : null}

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
