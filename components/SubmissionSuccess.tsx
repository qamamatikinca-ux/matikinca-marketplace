"use client";

import { useEffect, useMemo, useState } from "react";
import LoadLinkActionToast from "@/components/LoadLinkActionToast";
import LoadLinkIcon from "@/components/LoadLinkIcon";

type SubmissionSuccessProps = {
  open: boolean;
  title?: string;
  message?: string;
  listingId?: string | null;
  listingTitle?: string;
  surface?: "job" | "contract" | "asset" | "vehicle";
  continueLabel?: string;
  onContinue?: () => void;
  enableFeedback?: boolean;
  reference?: string | null;
  category?: string | null;
  entityName?: string | null;
  submittedAt?: string | Date | null;
  controlCentre?: boolean;
};

export default function SubmissionSuccess({
  open,
  title = "Submission sent",
  message = "Your submission has been received.",
  listingTitle = "",
  continueLabel = "Manage post",
  onContinue,
  controlCentre = false,
}: SubmissionSuccessProps) {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    setVisible(open);
    if (!open) return;
    try { if ("vibrate" in navigator) navigator.vibrate(45); } catch { /* optional */ }
  }, [open]);

  const toastTitle = controlCentre ? "Sent to Control Centre" : title;
  const toastMessage = useMemo(() => {
    if (controlCentre) return message || "LoadLink received your request and will review it shortly.";
    if (listingTitle) return `${message} ${listingTitle}`.trim();
    return message;
  }, [controlCentre, listingTitle, message]);

  if (!visible) return null;

  return (
    <LoadLinkActionToast
      open
      tone="success"
      title={toastTitle}
      message={toastMessage}
      primaryLabel={onContinue ? continueLabel : undefined}
      onPrimary={onContinue}
      onClose={() => setVisible(false)}
      icon={<LoadLinkIcon name="check" size={20} strokeWidth={2.2} />}
    />
  );
}
