"use client";

import { useEffect, useRef, useState } from "react";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import { googleMapsConfigured, loadGoogleMaps } from "@/lib/googleMapsClient";

export type GoogleLocationSelection = {
  label: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  source: "google" | "gps";
};

type PlacesAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type PlaceLocation = {
  lat: () => number;
  lng: () => number;
};

type PlaceResult = {
  id?: string;
  displayName?: string;
  formattedAddress?: string;
  location?: PlaceLocation;
  addressComponents?: PlacesAddressComponent[];
  fetchFields: (request: { fields: string[] }) => Promise<void>;
};

type PlacePrediction = {
  toPlace: () => PlaceResult;
};

type PlaceSelectEvent = Event & {
  placePrediction?: PlacePrediction;
};

type PlaceAutocompleteElementLike = HTMLElement & {
  includedRegionCodes: string[];
  placeholder: string;
  description?: string;
  value: string;
  noInputIcon?: boolean;
};

type PlaceAutocompleteConstructor = new () => PlaceAutocompleteElementLike;

type GeocoderAddressComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

type GeocoderResult = {
  formatted_address?: string;
  place_id?: string;
  address_components?: GeocoderAddressComponent[];
};

type GeocoderResponse = { results?: GeocoderResult[] };

type GeocoderInstance = {
  geocode: (request: { location: { lat: number; lng: number } }) => Promise<GeocoderResponse>;
};

type GeocoderConstructor = new () => GeocoderInstance;

function componentValue(
  components: PlacesAddressComponent[] | undefined,
  types: string[],
) {
  for (const type of types) {
    const component = components?.find((item) => item.types?.includes(type));
    if (component?.longText) return component.longText;
  }
  return "";
}

function geocoderComponentValue(
  components: GeocoderAddressComponent[] | undefined,
  types: string[],
) {
  for (const type of types) {
    const component = components?.find((item) => item.types?.includes(type));
    if (component?.long_name) return component.long_name;
  }
  return "";
}

const CITY_TYPES = [
  "locality",
  "postal_town",
  "administrative_area_level_2",
  "sublocality_level_1",
  "sublocality",
] as const;

export default function GoogleLocationPicker({
  value,
  onValueChange,
  onSelect,
  darkMode,
  className = "",
  placeholder = "City, town or exact address",
  ariaLabel = "Location",
  allowCurrentLocation = true,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (selection: GoogleLocationSelection) => void;
  darkMode: boolean;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  allowCurrentLocation?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const elementRef = useRef<PlaceAutocompleteElementLike | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!googleMapsConfigured()) return;
    let active = true;
    let inputListener: EventListener | null = null;
    let selectListener: EventListener | null = null;

    void (async () => {
      try {
        const maps = await loadGoogleMaps();
        const library = await maps.importLibrary("places") as {
          PlaceAutocompleteElement?: PlaceAutocompleteConstructor;
        };
        if (!active || !hostRef.current || !library.PlaceAutocompleteElement) return;

        const autocomplete = new library.PlaceAutocompleteElement();
        autocomplete.includedRegionCodes = ["za"];
        autocomplete.placeholder = placeholder;
        autocomplete.description = ariaLabel;
        autocomplete.value = value;
        autocomplete.noInputIcon = true;
        autocomplete.style.display = "block";
        autocomplete.style.width = "100%";
        autocomplete.style.minWidth = "0";

        inputListener = (() => {
          onValueChange(autocomplete.value || "");
        }) as EventListener;

        selectListener = (async (event: Event) => {
          const prediction = (event as PlaceSelectEvent).placePrediction;
          if (!prediction) return;
          try {
            setMessage("");
            const place = prediction.toPlace();
            await place.fetchFields({
              fields: ["id", "displayName", "formattedAddress", "location", "addressComponents"],
            });
            if (!place.location) throw new Error("This place does not have usable coordinates.");

            const latitude = place.location.lat();
            const longitude = place.location.lng();
            const city = componentValue(place.addressComponents, [...CITY_TYPES]);
            const province = componentValue(place.addressComponents, ["administrative_area_level_1"]);
            const label = place.formattedAddress || place.displayName || autocomplete.value || city;

            autocomplete.value = label;
            onValueChange(label);
            onSelect({
              label,
              city: city || place.displayName || label,
              province,
              latitude,
              longitude,
              placeId: place.id,
              source: "google",
            });
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "LoadLink could not confirm that map location.");
          }
        }) as EventListener;

        autocomplete.addEventListener("input", inputListener);
        autocomplete.addEventListener("gmp-select", selectListener);
        hostRef.current.replaceChildren(autocomplete);
        elementRef.current = autocomplete;
        setReady(true);
      } catch {
        if (active) setFailed(true);
      }
    })();

    return () => {
      active = false;
      if (elementRef.current && inputListener) elementRef.current.removeEventListener("input", inputListener);
      if (elementRef.current && selectListener) elementRef.current.removeEventListener("gmp-select", selectListener);
      elementRef.current = null;
    };
  }, [ariaLabel, onSelect, onValueChange, placeholder]);

  useEffect(() => {
    if (!elementRef.current || elementRef.current.value === value) return;
    elementRef.current.value = value;
  }, [value]);

  async function useCurrentLocation() {
    if (!navigator.geolocation || locating) {
      if (!navigator.geolocation) setMessage("Location services are not available on this device.");
      return;
    }
    setLocating(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void (async () => {
          try {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const maps = await loadGoogleMaps();
            const library = await maps.importLibrary("geocoding") as { Geocoder?: GeocoderConstructor };
            if (!library.Geocoder) throw new Error("Google reverse geocoding is unavailable.");
            const geocoder = new library.Geocoder();
            const response = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
            const result = response.results?.[0];
            const city = geocoderComponentValue(result?.address_components, [...CITY_TYPES]);
            const province = geocoderComponentValue(result?.address_components, ["administrative_area_level_1"]);
            const label = result?.formatted_address || city || "Current location";
            if (elementRef.current) elementRef.current.value = label;
            onValueChange(label);
            onSelect({
              label,
              city: city || label,
              province,
              latitude,
              longitude,
              placeId: result?.place_id,
              source: "gps",
            });
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "LoadLink could not identify your current location.");
          } finally {
            setLocating(false);
          }
        })();
      },
      (error) => {
        setLocating(false);
        setMessage(error.code === 1 ? "Location permission was not granted. You can still type a city or address." : "Your current location could not be detected. You can still type it manually.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
    );
  }

  if (!googleMapsConfigured() || failed) {
    return (
      <SouthAfricaLocationInput
        value={value}
        onChange={(next) => onValueChange(next)}
        darkMode={darkMode}
        allowAllSouthAfrica={false}
        placeholder="City or town"
        ariaLabel={ariaLabel}
        className={className}
      />
    );
  }

  return (
    <div>
      <div
        className={`min-w-0 overflow-visible rounded-[15px] ${darkMode ? "[&>div]:text-white" : "[&>div]:text-black"}`}
        aria-busy={!ready}
      >
        <div ref={hostRef} className={ready ? "min-w-0" : className}>
          {!ready ? <span className="flex h-full items-center px-4 text-sm font-semibold opacity-45">Loading Google locations…</span> : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className={`text-[10px] font-semibold leading-4 ${darkMode ? "text-white/42" : "text-black/45"}`}>
          Exact address is optional. Choose a town/city, search an address, or use your current location.
        </p>
        {allowCurrentLocation ? (
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating || !ready}
            className={`shrink-0 rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[.08em] transition disabled:opacity-45 ${darkMode ? "border-white/15 bg-white/[.04] text-white" : "border-black/10 bg-white/55 text-black"}`}
          >
            {locating ? "Finding location…" : "Use my location"}
          </button>
        ) : null}
      </div>
      {message ? <p className="mt-2 text-[10px] font-bold text-amber-700 dark:text-amber-300">{message}</p> : null}
    </div>
  );
}
