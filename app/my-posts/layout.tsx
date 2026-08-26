import type { ReactNode } from "react";
import MyPostsCancellationEnhancer from "@/components/MyPostsCancellationEnhancer";

export default function MyPostsLayout({ children }: { children: ReactNode }) {
  return <><MyPostsCancellationEnhancer />{children}</>;
}
