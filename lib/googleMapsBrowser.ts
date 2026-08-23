"use client";

export type LoadLinkLatLng = { latitude: number; longitude: number };

type GoogleLocation = { lat: () => number; lng: () => number };
type GooglePlace = { formatted_address?: string; name?: string; geometry?: { location?: GoogleLocation } };
type GoogleGeocoderResult = { formatted_address?: string; geometry?: { location?: GoogleLocation } };
type GoogleAutocomplete = {
  addListener: (eventName: string, callback: () => void) => { remove?: () => void };
  getPlace: () => GooglePlace;
};
type GoogleGeocoder = {
  geocode: (
    request: { address?: string; location?: { lat: number; lng: number }; componentRestrictions?: { country: string }; region?: string },
    callback: (results: GoogleGeocoderResult[] | null, status: string) => void,
  ) => void;
};
type GoogleMapsBrowser = {
  maps: {
    places?: {
      Autocomplete: new (
        input: HTMLInputElement,
        options?: { componentRestrictions?: { country: string }; fields?: string[]; types?: string[] },
      ) => GoogleAutocomplete;
    };
    Geocoder: new () => GoogleGeocoder;
  };
};

declare global {
  interface Window {
    google?: GoogleMapsBrowser;
    __loadlinkGoogleMapsPromise?: Promise<GoogleMapsBrowser | null>;
  }
}

export function googleMapsKey() {
  return String(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim();
}

export function loadGoogleMapsBrowser(): Promise<GoogleMapsBrowser | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.google?.maps) return Promise.resolve(window.google);
  if (window.__loadlinkGoogleMapsPromise) return window.__loadlinkGoogleMapsPromise;

  const key = googleMapsKey();
  if (!key) return Promise.resolve(null);

  window.__loadlinkGoogleMapsPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-loadlink-google-maps="true"]');
    const finish = () => resolve(window.google?.maps ? window.google : null);
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => resolve(null), { once: true });
      window.setTimeout(finish, 4000);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&region=ZA&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.loadlinkGoogleMaps = "true";
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => resolve(null), { once: true });
    document.head.appendChild(script);
  });

  return window.__loadlinkGoogleMapsPromise;
}

export async function geocodeLoadLinkAddress(address: string): Promise<{ address: string; coordinates: LoadLinkLatLng } | null> {
  const google = await loadGoogleMapsBrowser();
  if (!google?.maps || !address.trim()) return null;
  return await new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: address.trim(), componentRestrictions: { country: "ZA" }, region: "ZA" }, (results, status) => {
      const first = status === "OK" ? results?.[0] : null;
      const location = first?.geometry?.location;
      if (!first || !location) {
        resolve(null);
        return;
      }
      resolve({
        address: String(first.formatted_address || address).trim(),
        coordinates: { latitude: location.lat(), longitude: location.lng() },
      });
    });
  });
}

export async function reverseGeocodeLoadLink(latitude: number, longitude: number): Promise<string | null> {
  const google = await loadGoogleMapsBrowser();
  if (!google?.maps) return null;
  return await new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
      resolve(status === "OK" && results?.[0]?.formatted_address ? String(results[0].formatted_address) : null);
    });
  });
}

export async function attachSouthAfricaAutocomplete(
  input: HTMLInputElement,
  onPlace: (value: { address: string; coordinates: LoadLinkLatLng }) => void,
) {
  const google = await loadGoogleMapsBrowser();
  if (!google?.maps.places?.Autocomplete) return null;
  const autocomplete = new google.maps.places.Autocomplete(input, {
    componentRestrictions: { country: "za" },
    fields: ["formatted_address", "geometry", "name"],
    types: ["geocode"],
  });
  return autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    const location = place.geometry?.location;
    if (!location) return;
    onPlace({
      address: String(place.formatted_address || place.name || input.value).trim(),
      coordinates: { latitude: location.lat(), longitude: location.lng() },
    });
  });
}
