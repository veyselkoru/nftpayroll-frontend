"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";

export default function SwaggerPage() {
  const [bundleLoaded, setBundleLoaded] = useState(false);
  const [presetLoaded, setPresetLoaded] = useState(false);

  const scriptsReady = useMemo(
    () => bundleLoaded && presetLoaded,
    [bundleLoaded, presetLoaded]
  );

  useEffect(() => {
    if (!scriptsReady) return;
    if (typeof window === "undefined") return;

    if (!window.SwaggerUIBundle) {
      console.error("Swagger UI bundle could not be loaded.");
      return;
    }

    window.SwaggerUIBundle({
      url: "/api/openapi",
      dom_id: "#swagger-ui",
      deepLinking: true,
      presets: [
        window.SwaggerUIBundle.presets.apis,
        window.SwaggerUIStandalonePreset,
      ],
      layout: "BaseLayout",
    });
  }, [scriptsReady]);

  return (
    <main className="min-h-screen bg-white">
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onLoad={() => setBundleLoaded(true)}
      />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"
        strategy="afterInteractive"
        onLoad={() => setPresetLoaded(true)}
      />

      <link
        rel="stylesheet"
        href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
      />

      {!scriptsReady ? (
        <div className="mx-auto max-w-3xl p-6 text-sm text-slate-500">
          Loading Swagger UI...
        </div>
      ) : null}

      <div id="swagger-ui" />
    </main>
  );
}
