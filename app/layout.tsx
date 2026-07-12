import type { Metadata } from "next";
import "./globals.css";
import GlobalLoading from "@/components/GlobalLoading";
import ChatLauncher from "@/components/ChatLauncher";
import SwipeDotsEnhancer from "@/components/SwipeDotsEnhancer";
import AuthBootstrap from "@/components/AuthBootstrap";
import MyPostsLauncher from "@/components/MyPostsLauncher";

export const metadata: Metadata = {
  title: "LoadLink",
  description: "Logistics marketplace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <GlobalLoading />
        <SwipeDotsEnhancer />
        <AuthBootstrap />
        <ChatLauncher />
        <MyPostsLauncher />
        {children}
      </body>
    </html>
  );
}
