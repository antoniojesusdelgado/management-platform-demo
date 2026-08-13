"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  analyticsConsentSchema,
  type AnalyticsConsent,
} from "@/domain/analytics-consent";

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

export const OPEN_ANALYTICS_PREFERENCES_EVENT =
  "management-platform:open-analytics-preferences";

type AnalyticsConsentManagerProps = {
  measurementId?: string;
};

export function AnalyticsConsentManager({ measurementId }: AnalyticsConsentManagerProps) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [ready, setReady] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const parsed = analyticsConsentSchema.safeParse(
          window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY),
        );
        setConsent(parsed.success ? parsed.data : null);
      } catch {
        setConsent(null);
      }
      setReady(true);
    }, 0);
    const openPreferences = () => setShowPreferences(true);
    window.addEventListener(OPEN_ANALYTICS_PREFERENCES_EVENT, openPreferences);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(OPEN_ANALYTICS_PREFERENCES_EVENT, openPreferences);
    };
  }, []);

  useEffect(() => {
    if (consent !== "accepted" || !measurementId || !window.gtag) return;
    window.gtag("event", "page_view", {
      page_path: pathname,
      page_title: document.title,
      send_to: measurementId,
    });
  }, [consent, measurementId, pathname]);

  function choose(nextConsent: AnalyticsConsent) {
    if (nextConsent === "rejected") {
      window.gtag?.("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    }
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, nextConsent);
    setConsent(nextConsent);
    setShowPreferences(false);
  }

  function configureAnalytics() {
    if (!measurementId) return;
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag("js", new Date());
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("config", measurementId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      send_page_view: false,
    });
    window.gtag("event", "page_view", {
      page_path: pathname,
      page_title: document.title,
      send_to: measurementId,
    });
  }

  return (
    <>
      {consent === "accepted" && measurementId ? (
        <>
          <Script
            id="google-analytics-consent-default"
            strategy="afterInteractive"
          >
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('consent','default',{'analytics_storage':'denied','ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied','wait_for_update':500});`}
          </Script>
          <Script
            id="google-analytics"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
            strategy="afterInteractive"
            onLoad={configureAnalytics}
          />
        </>
      ) : null}
      {ready && (consent === null || showPreferences) ? (
        <section
          className="analytics-consent"
          aria-labelledby="analytics-consent-title"
          aria-describedby="analytics-consent-description"
          role="dialog"
        >
          <div>
            <h2 id="analytics-consent-title">Analítica opcional</h2>
            <p id="analytics-consent-description">
              Puedes permitir métricas de uso agregadas para ayudarnos a mejorar
              la plataforma. No se activan hasta que aceptes y puedes cambiar tu
              decisión cuando quieras. <Link href="/privacidad">Más información</Link>.
            </p>
          </div>
          <div className="analytics-consent-actions">
            <button className="button button-secondary" type="button" onClick={() => choose("rejected")}>Rechazar</button>
            <button className="button button-primary" type="button" onClick={() => choose("accepted")}>Aceptar analítica</button>
          </div>
        </section>
      ) : null}
    </>
  );
}

export function AnalyticsPreferencesButton() {
  return (
    <button
      className="legal-link-button"
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_ANALYTICS_PREFERENCES_EVENT))}
    >
      Preferencias de analítica
    </button>
  );
}
