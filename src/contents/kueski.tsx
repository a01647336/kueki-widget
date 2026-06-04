import { useEffect, useState } from "react";
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo";

import cssText from "data-text:~styles/globals.css";

import App from "~App";
import { PriceDetector, type CartData } from "~utils/priceDetector";
import { hydrateStorage } from "~utils/storage";

export const config: PlasmoCSConfig = {
  matches: [
    "*://*.amazon.com.mx/*",
    "*://*.mercadolibre.com.mx/*",
    "*://*.liverpool.com.mx/*",
    "*://*.coppel.com/*",
    "*://*.elektra.com.mx/*"
  ],
  run_at: "document_idle",
  all_frames: false
};

/** Plasmo lee este export y mete el <style> con `cssText` dentro del shadow root. */
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style");
  style.textContent = cssText;
  return style;
};

function detectSite(hostname: string): string | null {
  if (hostname.includes("amazon.com.mx"))       return "amazon";
  if (hostname.includes("mercadolibre.com.mx")) return "mercadolibre";
  if (hostname.includes("liverpool.com.mx"))    return "liverpool";
  if (hostname.includes("coppel.com"))          return "coppel";
  if (hostname.includes("elektra.com.mx"))      return "elektra";
  return null;
}

/**
 * Componente raíz del content script.
 *
 * Plasmo se encarga de crear el host element + Shadow DOM,
 * inyectar el CSS de `getStyle`, y montar este componente.
 */
export default function KueskiContent() {
  const site = detectSite(window.location.hostname);
  const [cartData, setCartData] = useState<CartData>({ total: 0, items: [] });
  const [hydrated, setHydrated] = useState(false);

  // Hidratar storage (chrome.storage.local) antes de renderizar el árbol
  useEffect(() => {
    hydrateStorage().finally(() => setHydrated(true));
  }, []);

  // Detector de precios del sitio host
  useEffect(() => {
    if (!site || !hydrated) return;
    const detector = new PriceDetector(site, setCartData);
    detector.start();
    return () => detector.stop();
  }, [site, hydrated]);

  if (!site || !hydrated) return null;

  return (
    <div className="kueski-root">
      <App
        currentSite={site}
        detectedCartTotal={cartData.total}
        detectedCartItems={cartData.items}
      />
    </div>
  );
}
