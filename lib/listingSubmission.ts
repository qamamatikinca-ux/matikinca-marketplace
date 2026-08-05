import { errorMessage, withTransientRetry } from "@/lib/reliableSupabase";
import { supabase } from "@/lib/supabaseClient";

type ListingInsertPayload = Record<string, unknown> & {
  user_id: string;
  client_request_id?: string | null;
};

type JobRpcArguments = {
  p_title: string;
  p_city: string;
  p_vehicle_group: string;
  p_rate: string;
  p_posted_by: string;
  p_contact_number: string;
  p_whatsapp_number: string;
  p_poster_photo: string;
  p_description: string;
  p_photos: string[];
  p_listing_kind: string;
  p_client_request_id: string;
  p_owner_key: string;
};

function listingIdFromResult(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : "";
  }
  return "";
}

function isDuplicateError(error: unknown) {
  const message = errorMessage(error, "");
  const code = error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code || "")
    : "";
  return code === "23505" || /duplicate key|unique constraint/i.test(message);
}

function isRestrictedAccountError(error: unknown) {
  return /ACCOUNT_ACCESS_RESTRICTED|account access is restricted|blocked|suspended/i.test(
    errorMessage(error, ""),
  );
}

async function findExistingListing(userId: string, submissionId: string) {
  if (!userId || !submissionId) return "";
  const result = await supabase
    .from("job_listings")
    .select("id")
    .eq("user_id", userId)
    .eq("client_request_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) return "";
  return String(result.data?.id || "");
}

export async function submitListingDirect(
  payload: ListingInsertPayload,
  userId: string,
  submissionId: string,
) {
  const existingBeforeInsert = await findExistingListing(userId, submissionId);
  if (existingBeforeInsert) return existingBeforeInsert;

  try {
    const response = await withTransientRetry(async () => {
      const result = await supabase.from("job_listings").insert(payload).select("id").single();
      if (result.error) throw result.error;
      return result.data;
    }, 2);

    const id = listingIdFromResult(response);
    if (!id) throw new Error("The listing was created without an ID.");
    return id;
  } catch (error) {
    if (isDuplicateError(error)) {
      const existing = await findExistingListing(userId, submissionId);
      if (existing) return existing;
    }
    throw error;
  }
}

export async function submitJobListing(options: {
  payload: ListingInsertPayload;
  rpcArguments: JobRpcArguments;
  userId: string;
  submissionId: string;
}) {
  const { payload, rpcArguments, userId, submissionId } = options;
  let rpcError: unknown = null;

  try {
    const rpcData = await withTransientRetry(async () => {
      const response = await supabase.rpc("loadlink_submit_listing_v2", rpcArguments);
      if (response.error) throw response.error;
      return response.data;
    }, 2);

    const rpcId = listingIdFromResult(rpcData);
    if (rpcId) return rpcId;
  } catch (error) {
    if (isRestrictedAccountError(error)) throw error;
    rpcError = error;
  }

  // A response can be lost after the database committed the row. Check the
  // request ID before falling back so retrying never creates a duplicate post.
  const existing = await findExistingListing(userId, submissionId);
  if (existing) return existing;

  try {
    return await submitListingDirect(payload, userId, submissionId);
  } catch (directError) {
    const rpcMessage = errorMessage(rpcError, "");
    const directMessage = errorMessage(directError, "");
    if (rpcMessage && directMessage && rpcMessage !== directMessage) {
      throw new Error(`${directMessage} · RPC fallback: ${rpcMessage}`);
    }
    throw directError;
  }
}
