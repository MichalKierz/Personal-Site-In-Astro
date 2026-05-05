import { defineMiddleware } from "astro:middleware";
import navigationContent from "./content/navigation.json";

type NavigationTab = {
  label: string;
  path: string;
  subdomain?: string;
};

type AuthResult =
  | {
      ok: true;
      response: null;
    }
  | {
      ok: false;
      response: Response;
    };

const productionDomain = "michalkierzkowski.com";
const tabs = navigationContent.tabs as NavigationTab[];

let localContentImportTimer: ReturnType<typeof setTimeout> | undefined;
let localContentImportRunning = false;
let localContentImportRequested = false;

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function isLocalhost(hostname: string) {
  return hostname === "localhost" || hostname.endsWith(".localhost");
}

function isProductionDomain(hostname: string) {
  return hostname === productionDomain || hostname.endsWith(`.${productionDomain}`);
}

function getSubdomain(hostname: string) {
  if (hostname.endsWith(".localhost")) {
    return hostname.replace(".localhost", "");
  }

  if (hostname.endsWith(`.${productionDomain}`)) {
    return hostname.replace(`.${productionDomain}`, "");
  }

  return "";
}

function getMainHostname(hostname: string) {
  if (isLocalhost(hostname)) {
    return "localhost";
  }

  if (isProductionDomain(hostname)) {
    return productionDomain;
  }

  return hostname;
}

function isStaticOrDevPath(pathname: string) {
  return (
    pathname.startsWith("/_astro") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/@vite") ||
    pathname.startsWith("/@fs") ||
    pathname.startsWith("/node_modules") ||
    pathname.startsWith("/src/")
  );
}

function isKeystaticPath(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/keystatic" ||
    pathname.startsWith("/keystatic/")
  );
}

function isKeystaticWritePath(pathname: string, method: string) {
  const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  return isWriteMethod && pathname.startsWith("/api/keystatic/");
}

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function scheduleLocalContentImport() {
  localContentImportRequested = true;

  if (localContentImportTimer) {
    clearTimeout(localContentImportTimer);
  }

  localContentImportTimer = setTimeout(() => {
    void runScheduledLocalContentImport();
  }, 1200);
}

async function runScheduledLocalContentImport() {
  localContentImportTimer = undefined;

  if (localContentImportRunning) {
    return;
  }

  localContentImportRunning = true;
  localContentImportRequested = false;

  try {
    const importerPath = new URL(
      "./local/local-content-importer.mjs",
      import.meta.url
    );

    const importer = (await import(importerPath.href)) as {
      processAllLocalContentFiles: () => Promise<void> | void;
    };

    await importer.processAllLocalContentFiles();
  } catch (error) {
    console.error("[local-content-importer] Failed after Keystatic write:");
    console.error(error);
  } finally {
    localContentImportRunning = false;

    if (localContentImportRequested) {
      scheduleLocalContentImport();
    }
  }
}

function checkBasicAuth(request: Request): AuthResult {
  const expectedUsername = import.meta.env.KEYSTATIC_USERNAME;
  const expectedPassword = import.meta.env.KEYSTATIC_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return {
      ok: false,
      response: new Response(
        "Missing KEYSTATIC_USERNAME or KEYSTATIC_PASSWORD in .env",
        { status: 500 }
      ),
    };
  }

  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Basic ")) {
    const encoded = authorization.slice("Basic ".length);
    const decoded = globalThis.atob(encoded);
    const separatorIndex = decoded.indexOf(":");

    const username =
      separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : "";

    const password =
      separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : "";

    if (username === expectedUsername && password === expectedPassword) {
      return {
        ok: true,
        response: null,
      };
    }
  }

  return {
    ok: false,
    response: new Response("Login required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Local Admin"',
      },
    }),
  };
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  const hostname = url.hostname;
  const subdomain = getSubdomain(hostname);

  if (!import.meta.env.DEV && isKeystaticPath(pathname)) {
    return notFound();
  }

  if (!import.meta.env.DEV && pathname.startsWith("/api/keystatic/")) {
    return notFound();
  }

  if (import.meta.env.DEV && isKeystaticWritePath(pathname, context.request.method)) {
    const response = await next();

    if (response.ok) {
      scheduleLocalContentImport();
    }

    return response;
  }

  if (import.meta.env.DEV && isKeystaticPath(pathname)) {
    const mainHostname = getMainHostname(hostname);

    if (hostname !== mainHostname) {
      const target = new URL(url);
      target.hostname = mainHostname;
      target.pathname = pathname.startsWith("/admin") ? "/admin" : pathname;

      return Response.redirect(target, 302);
    }

    const auth = checkBasicAuth(context.request);

    if (!auth.ok) {
      return auth.response;
    }

    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return Response.redirect(new URL("/keystatic", url), 302);
    }

    return next();
  }

  if (isStaticOrDevPath(pathname)) {
    return next();
  }

  if (!subdomain || subdomain === "www") {
    return next();
  }

  const matchingTab = tabs.find((tab) => tab.subdomain?.trim() === subdomain);

  if (!matchingTab) {
    return next();
  }

  const internalBasePath = normalizePath(matchingTab.path);

  if (pathname === "/") {
    return context.rewrite(internalBasePath);
  }

  if (
    pathname === internalBasePath ||
    pathname.startsWith(`${internalBasePath}/`)
  ) {
    return next();
  }

  return context.rewrite(`${internalBasePath}${pathname}`);
});