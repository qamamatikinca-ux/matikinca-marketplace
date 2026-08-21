"use client";

import { useEffect, useState } from "react";
import LoadLinkFinalReleasePolish20260821 from "@/components/LoadLinkFinalReleasePolish20260821";

export default function LoadLinkFinalReleasePolishBootstrap20260821() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <LoadLinkFinalReleasePolish20260821 /> : null;
}
