export type GoogleMapsNamespace = {
  importLibrary: (libraryName: string) => Promise<Record<string, unknown>>;
};

declare global {
  interface Window {
    google?: {
      maps?: GoogleMapsNamespace;
    };
  }
}

const SCRIPT_ID = "loadlink-google-maps-js";
let mapsPromise: Promise<GoogleMapsNamespace> | null = null;

export function googleMapsApiKey() {
  return (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim();
}

export function googleMapsConfigured() {
  return Boolean(googleMapsApiKey());
}

export async function loadGoogleMaps(): Promise<GoogleMapsNamespace> {
  if (typeof window === "undefined") throw new Error("Google Maps can only load in the browser.");

  const existingMaps = window.google?.maps;
  if (existingMaps?.importLibrary) return existingMaps;

  const apiKey = googleMapsApiKey();
  if (!apiKey) throw new Error("Google Maps is not configured yet.");

  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise<GoogleMapsNamespace>((resolve, reject) => {
    const finish = () => {
      const maps = window.google?.maps;
      if (maps?.importLibrary) resolve(maps);
      else reject(new Error("Google Maps loaded without the expected Maps JavaScript API."));
    };

    const fail = () => {
      mapsPromise = null;
      reject(new Error("Google Maps could not load. Check the API key and its website/API restrictions."));
    };

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.google?.maps?.importLibrary) {
        finish();
        return;
      }
      existingScript.addEventListener("load", finish, { once: true });
      existingScript.addEventListener("error", fail, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`;
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", fail, { once: true });
    document.head.appendChild(script);
  });

  return mapsPromise;
}
