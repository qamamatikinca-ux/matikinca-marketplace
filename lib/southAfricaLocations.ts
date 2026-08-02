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

export type SouthAfricanProvince = (typeof SOUTH_AFRICAN_PROVINCES)[number];
export type SouthAfricanLocationKind = "country" | "province" | "place";

export type SouthAfricanLocation = {
  name: string;
  province: SouthAfricanProvince | "";
  kind: SouthAfricanLocationKind;
  aliases: string[];
  searchText: string;
};

const LOCATION_GROUPS: Record<SouthAfricanProvince, string[]> = {
  "Eastern Cape": [
    "Adelaide", "Alice", "Aliwal North", "Barkly East", "Berlin", "Bhisho|Bisho", "Bizana|Mbizana", "Burgersdorp",
    "Butterworth", "Cathcart", "Cofimvaba", "Cradock", "Despatch", "East London|eMonti", "Elliot|Khowa",
    "Flagstaff", "Fort Beaufort|KwaMaqoma", "Gqeberha|Port Elizabeth|PE", "Graaff-Reinet", "Humansdorp", "Indwe",
    "Jansenville", "Jeffreys Bay", "Joubertina", "Kareedouw", "Kariega|Uitenhage", "Kirkwood", "Komani|Queenstown",
    "Lady Frere|Cacadu", "Lusikisiki", "Makhanda|Grahamstown", "Matatiele", "Middeldrift", "Middelburg Eastern Cape|Middelburg EC",
    "Molteno", "Mount Ayliff|eMaxesibeni", "Mount Fletcher", "Mount Frere|KwaBhaca", "Mthatha|Umtata", "Ngcobo|Engcobo",
    "Ngqeleni", "Nqanqarhu|Maclear", "Ntabankulu", "Patensie", "Peddie", "Port Alfred", "Port St Johns",
    "Qonce|King William's Town|King Williams Town", "Qumbu", "Somerset East|KwaNojoli", "Sterkstroom", "Steynsburg",
    "St Francis Bay", "Stutterheim", "Tarkastad", "Tsomo", "Willowmore", "Zwelitsha",
  ],
  "Free State": [
    "Bethlehem", "Bloemfontein", "Botshabelo", "Brandfort", "Bultfontein", "Clarens", "Clocolan", "Dewetsdorp",
    "Edenburg", "Excelsior", "Fauresmith", "Ficksburg", "Fouriesburg", "Frankfort", "Harrismith", "Heilbron",
    "Hennenman", "Hertzogville", "Hobhouse", "Hoopstad", "Jacobsdal", "Jagersfontein", "Kestell", "Koffiefontein",
    "Kroonstad", "Ladybrand", "Lindley", "Marquard", "Memel", "Odendaalsrus", "Parys", "Paul Roux", "Petrus Steyn",
    "Petrusburg", "Phuthaditjhaba|QwaQwa", "Reitz", "Reddersburg", "Rouxville", "Sasolburg", "Senekal", "Smithfield",
    "Springfontein", "Steynsrus", "Theunissen", "Trompsburg", "Tweeling", "Ventersburg", "Viljoenskroon", "Virginia",
    "Vrede", "Warden", "Welkom", "Wepener", "Winburg", "Zastron",
  ],
  Gauteng: [
    "Alberton", "Alexandra", "Atteridgeville", "Benoni", "Boksburg", "Brakpan", "Bronkhorstspruit", "Carletonville",
    "Centurion|Verwoerdburg", "Cullinan", "Daveyton", "Diepsloot", "Edenvale", "Ennerdale", "Ga-Rankuwa|Ga Rankuwa",
    "Germiston", "Hammanskraal", "Heidelberg Gauteng", "Johannesburg|Joburg|eGoli", "Kagiso", "Katlehong",
    "Kempton Park", "Krugersdorp", "Lenasia", "Magaliesburg", "Mamelodi", "Meyerton", "Midrand", "Nigel",
    "Orange Farm", "Pretoria|Tshwane", "Randburg", "Randfontein", "Roodepoort", "Sandton", "Sebokeng",
    "Sharpeville", "Soshanguve", "Soweto", "Springs", "Tembisa|Thembisa", "Thokoza", "Tsakane", "Vanderbijlpark",
    "Vereeniging", "Westonaria", "Winterveld",
  ],
  "KwaZulu-Natal": [
    "Amanzimtoti", "Ballito", "Bergville", "Camperdown", "Chatsworth", "Colenso", "Dalton", "Dannhauser", "Dundee",
    "Durban|eThekwini", "Eshowe", "Empangeni", "Estcourt", "Greytown", "Harding", "Hibberdene", "Hilton", "Hluhluwe",
    "Howick", "Ixopo", "Jozini", "Kokstad", "Kranskop", "KwaDukuza|Stanger", "Ladysmith", "Mandeni", "Margate",
    "Melmoth", "Mooi River", "Mpumalanga KwaZulu-Natal|Hammarsdale", "Mtubatuba", "Newcastle", "Nongoma",
    "Paulpietersburg", "Phoenix", "Pietermaritzburg|Maritzburg", "Pinetown", "Pongola", "Port Edward",
    "Port Shepstone", "Richards Bay", "Richmond KwaZulu-Natal", "Scottburgh", "St Lucia", "Tongaat|oThongathi",
    "Ulundi", "Umlazi", "Umhlanga", "Umkomaas", "Underberg", "Vryheid", "Wartburg", "Weenen",
  ],
  Limpopo: [
    "Bela-Bela|Warmbaths", "Burgersfort", "Dendron|Mogwadi", "Elim", "Giyani", "Groblersdal", "Jane Furse",
    "Lephalale|Ellisras", "Letsitele", "Louis Trichardt|Makhado", "Marble Hall", "Modimolle|Nylstroom",
    "Modjadjiskloof|Duiwelskloof", "Mokopane|Potgietersrus", "Musina|Messina", "Northam", "Phalaborwa", "Polokwane|Pietersburg",
    "Roedtan", "Senwabarwana|Bochum", "Seshego", "Thabazimbi", "Thohoyandou", "Tzaneen", "Vaalwater", "Vivo", "Zebediela",
  ],
  Mpumalanga: [
    "Amersfoort", "Amsterdam", "Barberton", "Bethal", "Breyten", "Carolina", "Delmas", "Dullstroom", "Emalahleni|Witbank",
    "Emgwenya|Waterval Boven", "eManzana|Badplaas", "eMakhazeni|Belfast", "Ermelo", "Evander", "Graskop", "Hazyview",
    "Hendrina", "Kaapmuiden", "Komatipoort", "Kriel", "Malalane|Malelane", "Mashishing|Lydenburg", "Mbombela|Nelspruit",
    "Middelburg Mpumalanga", "Morgenzon", "Ogies", "Pilgrim's Rest", "Sabie", "Secunda", "Standerton", "Trichardt",
    "Volksrust", "White River",
  ],
  "North West": [
    "Bloemhof", "Brits", "Christiana", "Coligny", "Delareyville", "Ganyesa", "Groot Marico", "Hartbeespoort|Harties",
    "Klerksdorp", "Lichtenburg", "Mahikeng|Mafikeng", "Makwassie", "Mmabatho", "Mogwase", "Orkney", "Ottosdal",
    "Potchefstroom", "Rustenburg", "Schweizer-Reneke", "Stilfontein", "Sun City", "Taung", "Ventersdorp", "Vryburg",
    "Wolmaransstad", "Zeerust",
  ],
  "Northern Cape": [
    "Alexander Bay", "Barkly West", "Brandvlei", "Britstown", "Calvinia", "Carnarvon", "Colesberg", "Danielskuil",
    "De Aar", "Douglas", "Fraserburg", "Garies", "Griekwastad", "Groblershoop", "Hanover", "Hartswater", "Hopetown",
    "Kakamas", "Kathu", "Keimoes", "Kenhardt", "Kimberley", "Kuruman", "Lime Acres", "Loeriesfontein", "Marydale",
    "Modderrivier", "Noupoort", "Olifantshoek", "Pofadder", "Port Nolloth", "Postmasburg", "Prieska", "Richmond Northern Cape",
    "Ritchie", "Sishen", "Springbok", "Strydenburg", "Sutherland", "Upington", "Victoria West", "Warrenton", "Williston",
  ],
  "Western Cape": [
    "Ashton", "Atlantis", "Beaufort West", "Bellville", "Brackenfell", "Bredasdorp", "Caledon", "Calitzdorp", "Cape Town",
    "Ceres", "Clanwilliam", "Darling", "De Doorns", "Durbanville", "Elands Bay", "Fish Hoek", "Franschhoek", "Gansbaai",
    "George", "Goodwood", "Gordon's Bay", "Grabouw", "Great Brak River", "Heidelberg Western Cape", "Hermanus", "Hopefield",
    "Khayelitsha", "Knysna", "Kuils River", "Laingsburg", "Lambert's Bay", "Langebaan", "Malmesbury", "McGregor",
    "Milnerton", "Mitchells Plain", "Montagu", "Mossel Bay", "Murraysburg", "Oudtshoorn", "Paarl", "Parow", "Piketberg",
    "Plettenberg Bay", "Prince Albert", "Rawsonville", "Riversdale", "Robertson", "Saldanha", "Somerset West", "Stellenbosch",
    "Strand", "Swellendam", "Tulbagh", "Vredenburg", "Vredendal", "Wellington", "Wolseley", "Worcester",
  ],
};

const POPULAR_LOCATIONS = [
  "Johannesburg", "Pretoria", "Centurion", "Cape Town", "Durban", "Gqeberha", "East London", "Bloemfontein",
  "Polokwane", "Mbombela", "Rustenburg", "Kimberley", "Mthatha", "Pietermaritzburg", "George", "Emalahleni",
];

function normalise(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function makeLocation(raw: string, province: SouthAfricanProvince): SouthAfricanLocation {
  const [name, ...aliases] = raw.split("|").map((item) => item.trim()).filter(Boolean);
  return {
    name,
    province,
    kind: "place",
    aliases,
    searchText: normalise([name, province, ...aliases].join(" ")),
  };
}

const PLACE_LOCATIONS = SOUTH_AFRICAN_PROVINCES.flatMap((province) =>
  LOCATION_GROUPS[province].map((entry) => makeLocation(entry, province)),
);

const PROVINCE_LOCATIONS: SouthAfricanLocation[] = SOUTH_AFRICAN_PROVINCES.map((province) => ({
  name: province,
  province,
  kind: "province",
  aliases: province === "KwaZulu-Natal" ? ["KZN", "KwaZulu Natal"] : province === "North West" ? ["North-West"] : [],
  searchText: normalise(province),
}));

export const ALL_SOUTH_AFRICA_LOCATION: SouthAfricanLocation = {
  name: "All South Africa",
  province: "",
  kind: "country",
  aliases: ["South Africa", "Nationwide", "National"],
  searchText: "all south africa nationwide national",
};

export const SOUTH_AFRICA_LOCATIONS: SouthAfricanLocation[] = [
  ALL_SOUTH_AFRICA_LOCATION,
  ...PROVINCE_LOCATIONS,
  ...PLACE_LOCATIONS,
];

export const SOUTH_AFRICA_PLACE_NAMES = PLACE_LOCATIONS.map((location) => location.name);

export function formatSouthAfricanLocation(location: SouthAfricanLocation) {
  if (location.kind === "country") return location.name;
  if (location.kind === "province") return `${location.name} — Province`;
  return `${location.name} — ${location.province}`;
}

export function resolveSouthAfricanLocation(value: string | null | undefined) {
  const clean = normalise(String(value || "").replace(/\s+[—-]\s+.*$/, ""));
  if (!clean) return null;
  return SOUTH_AFRICA_LOCATIONS.find((location) => {
    if (normalise(location.name) === clean) return true;
    return location.aliases.some((alias) => normalise(alias) === clean);
  }) || null;
}

export function searchSouthAfricanLocations(query: string, limit = 12) {
  const clean = normalise(query);
  if (!clean) {
    const popular = POPULAR_LOCATIONS.map((name) => resolveSouthAfricanLocation(name)).filter(Boolean) as SouthAfricanLocation[];
    return [ALL_SOUTH_AFRICA_LOCATION, ...PROVINCE_LOCATIONS, ...popular].slice(0, limit);
  }

  const tokens = clean.split(" ").filter(Boolean);
  return SOUTH_AFRICA_LOCATIONS
    .map((location) => {
      const name = normalise(location.name);
      const exact = name === clean || location.aliases.some((alias) => normalise(alias) === clean);
      const starts = name.startsWith(clean) || location.aliases.some((alias) => normalise(alias).startsWith(clean));
      const tokenMatches = tokens.filter((token) => location.searchText.includes(token)).length;
      const score = exact ? 1000 : starts ? 700 : tokenMatches === tokens.length ? 400 + tokenMatches * 10 : -1;
      return { location, score };
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.location.name.localeCompare(b.location.name))
    .slice(0, limit)
    .map((item) => item.location);
}

export function provinceForSouthAfricanLocation(value: string | null | undefined) {
  return resolveSouthAfricanLocation(value)?.province || "";
}

export function locationSearchTerms(value: string | null | undefined) {
  const location = resolveSouthAfricanLocation(value);
  if (!location) return String(value || "").trim();
  return [location.name, location.province, ...location.aliases].filter(Boolean).join(" ");
}

export function matchesSouthAfricanLocation(candidate: string | null | undefined, selected: string | null | undefined) {
  const selectedText = String(selected || "").trim();
  if (!selectedText) return true;
  const selectedLocation = resolveSouthAfricanLocation(selectedText);
  if (selectedLocation?.kind === "country") return true;

  const candidateText = String(candidate || "").trim();
  const candidateLocation = resolveSouthAfricanLocation(candidateText);

  if (selectedLocation?.kind === "province") {
    return candidateLocation?.province === selectedLocation.province || normalise(candidateText).includes(normalise(selectedLocation.name));
  }

  if (selectedLocation?.kind === "place") {
    if (candidateLocation) return candidateLocation.name === selectedLocation.name;
    return selectedLocation.searchText.includes(normalise(candidateText)) || normalise(candidateText).includes(normalise(selectedLocation.name));
  }

  return normalise(candidateText).includes(normalise(selectedText));
}
