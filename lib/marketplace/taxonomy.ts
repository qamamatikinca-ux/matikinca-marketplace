export type VehicleType = {
  value: string;
  label: string;
  group: "truck" | "trailer" | "mobile-unit" | "special";
};

export const COMMERCIAL_VEHICLE_TYPES: VehicleType[] = [
  { value: "truck-tractor", label: "Truck tractor", group: "truck" },
  { value: "tipper", label: "Tipper", group: "truck" },
  { value: "dropside", label: "Dropside", group: "truck" },
  { value: "tautliner", label: "Tautliner", group: "truck" },
  { value: "refrigerated", label: "Refrigerated truck", group: "truck" },
  { value: "tanker", label: "Tanker", group: "truck" },
  { value: "crane-truck", label: "Crane truck", group: "truck" },
  { value: "flatbed", label: "Flatbed", group: "truck" },
  { value: "lowbed", label: "Lowbed", group: "trailer" },
  { value: "side-tipper-trailer", label: "Side tipper trailer", group: "trailer" },
  { value: "superlink", label: "Superlink", group: "trailer" },
  { value: "interlink", label: "Interlink", group: "trailer" },
  { value: "mobile-fridge", label: "Mobile fridge", group: "mobile-unit" },
  { value: "food-truck", label: "Food truck", group: "mobile-unit" },
  { value: "mobile-kitchen", label: "Mobile kitchen", group: "mobile-unit" },
  { value: "mobile-toilet", label: "Mobile toilet", group: "mobile-unit" },
  { value: "special-unit", label: "Special commercial unit", group: "special" },
  { value: "other", label: "Other", group: "special" },
];

export const SOUTH_AFRICAN_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;

export const VEHICLE_SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
  { value: "year-new", label: "Newest model year" },
  { value: "mileage-low", label: "Lowest mileage" },
] as const;
