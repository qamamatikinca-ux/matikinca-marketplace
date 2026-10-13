// These are LoadLink's public browser credentials. Supabase publishable keys are
// intentionally safe to ship in client code; database access remains protected
// by Auth + RLS. Keeping them as fallbacks prevents locally prebuilt Vercel
// deployments from silently compiling an unusable auth client when NEXT_PUBLIC
// variables are unavailable during the build step.
export const LOADLINK_SUPABASE_URL = "https://cqmjgulfbbwxyecsnzed.supabase.co";
export const LOADLINK_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_jpBfLJ-DUl9-JVnYX-_7Hg_UIZ47EnP";

