export type FollowTargetType = "dealership" | "contractor" | "opportunity_poster" | "user";

export type FollowPreferences = {
  newListings: boolean;
  updates: boolean;
  priceChanges: boolean;
};

export type FollowedProfile = {
  id: string;
  type: FollowTargetType;
  name: string;
  href: string;
  location?: string;
  image?: string;
  preferences: FollowPreferences;
  followedAt: string;
};

const STORAGE_KEY = "loadlink-following-v2";

export function getFollowedProfiles(): FollowedProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFollowedProfile(profile: FollowedProfile) {
  const next = [profile, ...getFollowedProfiles().filter((item) => !(item.id === profile.id && item.type === profile.type))];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("loadlink-following-changed"));
}

export function removeFollowedProfile(type: FollowTargetType, id: string) {
  const next = getFollowedProfiles().filter((item) => !(item.id === id && item.type === type));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("loadlink-following-changed"));
}

export function isFollowing(type: FollowTargetType, id: string) {
  return getFollowedProfiles().some((item) => item.type === type && item.id === id);
}

export function mergeFollowedProfiles(profiles: FollowedProfile[]) {
  const current = getFollowedProfiles();
  const merged = [...profiles, ...current].filter((item, index, all) =>
    all.findIndex((candidate) => candidate.type === item.type && candidate.id === item.id) === index
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  window.dispatchEvent(new Event("loadlink-following-changed"));
}
