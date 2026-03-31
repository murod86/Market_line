interface PwaConfig {
  manifest: string;
  appleTitle: string;
  themeColor: string;
}

export function getPwaConfig(urlPath: string): PwaConfig {
  if (urlPath.startsWith("/portal")) {
    return {
      manifest: "/manifest.json",
      appleTitle: "ML Portal",
      themeColor: "#4F46E5",
    };
  } else if (urlPath.startsWith("/dealer-portal")) {
    return {
      manifest: "/dealer-manifest.json",
      appleTitle: "ML Diller",
      themeColor: "#3B82F6",
    };
  } else {
    return {
      manifest: "/admin-manifest.json",
      appleTitle: "ML Admin",
      themeColor: "#0f172a",
    };
  }
}

export function injectPwaMeta(html: string, urlPath: string): string {
  const cfg = getPwaConfig(urlPath);
  return html
    .replace(
      /<meta name="theme-color" content="[^"]*"\s*\/>/,
      `<meta name="theme-color" content="${cfg.themeColor}" />`
    )
    .replace(
      /<meta name="apple-mobile-web-app-title" content="[^"]*"\s*\/>/,
      `<meta name="apple-mobile-web-app-title" content="${cfg.appleTitle}" />`
    )
    .replace(
      /<link rel="manifest"[^>]*id="app-manifest"[^>]*\/>/,
      `<link rel="manifest" href="${cfg.manifest}" />`
    )
    .replace(
      /<script id="pwa-manifest-switcher">[\s\S]*?<\/script>/,
      ""
    );
}
