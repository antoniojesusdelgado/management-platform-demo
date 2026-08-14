"use client";

import {
  IconArrowRight,
  IconArrowLeft,
  IconBuilding,
  IconCheck,
  IconKey,
  IconSparkles,
} from "@tabler/icons-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  acceptOrganizationInvitationAction,
  completeOrganizationOnboardingAction,
  completeFounderProfileAction,
  createOrganizationAction,
} from "@/app/app/organization-actions";
import { employmentContractLabels, employmentContractTypes } from "@/domain/people";

type OrganizationOnboardingProps = {
  existingOrganizationId?: string;
  initialInvitationToken?: string;
  creationOnly?: boolean;
  cancelHref?: string;
  initialProfileCompleted?: boolean;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}

export function OrganizationOnboarding({
  existingOrganizationId,
  initialInvitationToken = "",
  creationOnly = false,
  cancelHref = "/app/inicio",
  initialProfileCompleted = false,
}: OrganizationOnboardingProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [templateMode, setTemplateMode] = useState<"empty" | "synthetic">("empty");
  const [token, setToken] = useState(initialInvitationToken);
  const [organizationId, setOrganizationId] = useState(existingOrganizationId);
  const [profileCompleted, setProfileCompleted] = useState(initialProfileCompleted);
  const [displayName, setDisplayName] = useState("");
  const [team, setTeam] = useState("Dirección");
  const [positionTitle, setPositionTitle] = useState("Administración de la empresa");
  const [employmentContractType, setEmploymentContractType] = useState<(typeof employmentContractTypes)[number]>("indefinite_ordinary");
  const [employmentStartDate, setEmploymentStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const suggestedSlug = useMemo(() => slug || slugify(name), [name, slug]);

  function finish(targetOrganizationId: string, next = "/app/inicio") {
    startTransition(async () => {
      const result = await completeOrganizationOnboardingAction(targetOrganizationId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      window.location.assign(next);
    });
  }

  if (organizationId && !profileCompleted) {
    return (
      <main className="onboarding-page">
        <section className="onboarding-card" aria-labelledby="profile-title">
          <div className="onboarding-progress onboarding-progress-three" aria-label="Paso 2 de 3"><span /><span /><i /></div>
          <p className="eyebrow">Tu ficha profesional</p>
          <h1 id="profile-title">Añádete al equipo</h1>
          <p className="lede">Completa tu perfil inicial. Quedarás vinculado a esta empresa como su persona administradora.</p>
          <form className="onboarding-form" onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await completeFounderProfileAction({
                organizationId,
                displayName,
                team,
                positionTitle,
                employmentContractType,
                employmentStartDate,
              });
              if (!result.ok) { toast.error(result.message); return; }
              setProfileCompleted(true);
            });
          }}>
            <div className="field-grid onboarding-profile-grid">
              <label>Nombre y apellidos<input required minLength={2} maxLength={100} autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Ej. Ana Martínez" /></label>
              <label>Equipo<input required minLength={2} maxLength={100} value={team} onChange={(event) => setTeam(event.target.value)} /></label>
              <label>Puesto<input required minLength={2} maxLength={120} value={positionTitle} onChange={(event) => setPositionTitle(event.target.value)} /></label>
              <label>Tipo de contrato<select value={employmentContractType} onChange={(event) => setEmploymentContractType(event.target.value as (typeof employmentContractTypes)[number])}>{employmentContractTypes.map((type) => <option key={type} value={type}>{employmentContractLabels[type]}</option>)}</select></label>
              <label>Fecha de incorporación<input required type="date" value={employmentStartDate} onChange={(event) => setEmploymentStartDate(event.target.value)} /></label>
            </div>
            <button className="button button-primary onboarding-primary" disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar ficha y continuar"}<IconArrowRight size={18} /></button>
          </form>
        </section>
      </main>
    );
  }

  if (organizationId) {
    return (
      <main className="onboarding-page">
        <section className="onboarding-card" aria-labelledby="suite-title">
          <div className="onboarding-progress onboarding-progress-three" aria-label="Paso 3 de 3"><span /><span /><span /></div>
          <p className="eyebrow">Empresa preparada</p>
          <h1 id="suite-title">Conecta tu entorno de trabajo</h1>
          <p className="lede">Tu acceso ya está listo. Si conectas Google Workspace o Microsoft 365, podrás elegir por separado qué herramientas quieres usar.</p>
          <div className="onboarding-choice-grid">
            <button className="onboarding-choice" type="button" disabled={pending} onClick={() => finish(organizationId, "/api/workspace/oauth/google_workspace/start")}>
              <strong>Google Workspace</strong>
              <span>Drive, Sheets, Calendar y personas de la empresa.</span>
            </button>
            <button className="onboarding-choice" type="button" disabled={pending} onClick={() => finish(organizationId, "/api/workspace/oauth/microsoft_365/start")}>
              <strong>Microsoft 365</strong>
              <span>OneDrive, Excel, Outlook y personas de la empresa.</span>
            </button>
          </div>
          <button className="button button-primary onboarding-primary" type="button" disabled={pending} onClick={() => finish(organizationId)}>
            {pending ? "Finalizando…" : "Configurar más adelante"}
            <IconArrowRight size={18} aria-hidden="true" />
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <div className="onboarding-progress onboarding-progress-three" aria-label="Paso 1 de 3"><span /><i /><i /></div>
          <p className="eyebrow">{creationOnly ? "Nueva empresa" : "Primeros pasos"}</p>
          <h1 id="onboarding-title">{creationOnly ? "Crea otro espacio de trabajo" : "Prepara tu espacio de trabajo"}</h1>
          <p className="lede">{creationOnly ? "La nueva empresa tendrá sus propios datos, permisos y conexiones." : "Crea una empresa aislada o utiliza una invitación que ya hayas recibido."}</p>
          {!creationOnly ? <div className="onboarding-mode" role="tablist" aria-label="Forma de acceso">
            <button type="button" role="tab" aria-selected={mode === "create"} onClick={() => setMode("create")}><IconBuilding size={18} />Crear empresa</button>
            <button type="button" role="tab" aria-selected={mode === "join"} onClick={() => setMode("join")}><IconKey size={18} />Usar invitación</button>
          </div> : null}

        {mode === "create" ? (
          <form className="onboarding-form" onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await createOrganizationAction({ name, slug: suggestedSlug, templateMode });
              if (!result.ok) { toast.error(result.message); return; }
              setOrganizationId(result.data.organizationId);
            });
          }}>
            <label>Nombre de la empresa<input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Consultoría Norte" /></label>
            <label>Nombre corto para enlaces<input required minLength={2} maxLength={63} value={suggestedSlug} onChange={(event) => setSlug(slugify(event.target.value))} placeholder="consultoria-norte" /></label>
            <fieldset className="onboarding-template"><legend>Datos iniciales</legend>
              <label><input type="radio" name="template" checked={templateMode === "empty"} onChange={() => setTemplateMode("empty")} /><span><strong>Empresa vacía</strong>Empieza con tu estructura real.</span></label>
              <label><input type="radio" name="template" checked={templateMode === "synthetic"} onChange={() => setTemplateMode("synthetic")} /><span><strong>Plantilla de ejemplo</strong>Explora el sistema con datos ficticios.</span></label>
            </fieldset>
            <button className="button button-primary onboarding-primary" disabled={pending} type="submit">{pending ? "Creando…" : "Crear empresa"}<IconArrowRight size={18} /></button>
            {creationOnly ? <button className="button button-quiet onboarding-cancel" type="button" disabled={pending} onClick={() => router.push(cancelHref as Route)}><IconArrowLeft size={17} />Cancelar y volver</button> : null}
          </form>
        ) : (
          <form className="onboarding-form" onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await acceptOrganizationInvitationAction(token);
              if (!result.ok) { toast.error(result.message); return; }
              toast.success("Te has unido a la empresa");
              router.replace("/app/inicio");
              router.refresh();
            });
          }}>
            <label>Código de invitación<input required minLength={16} maxLength={200} value={token} onChange={(event) => setToken(event.target.value)} placeholder="Pega aquí el código recibido" /></label>
            <p className="onboarding-security"><IconCheck size={18} />La invitación solo se acepta si coincide con el correo verificado de tu cuenta.</p>
            <button className="button button-primary onboarding-primary" disabled={pending} type="submit">{pending ? "Comprobando…" : "Unirme a la empresa"}<IconSparkles size={18} /></button>
          </form>
        )}
      </section>
    </main>
  );
}
