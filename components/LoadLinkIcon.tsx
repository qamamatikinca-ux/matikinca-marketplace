import type { SVGProps } from "react";

export type LoadLinkIconName =
  | "archive"
  | "bell"
  | "calendar"
  | "check"
  | "chevronDown"
  | "chevronLeft"
  | "chevronRight"
  | "close"
  | "edit"
  | "home"
  | "logout"
  | "menu"
  | "message"
  | "mic"
  | "paperclip"
  | "phone"
  | "plus"
  | "search"
  | "send"
  | "settings"
  | "tools"
  | "trash"
  | "truck"
  | "user"
  | "volume";

type Props = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: LoadLinkIconName;
  size?: number;
  strokeWidth?: number;
};

export default function LoadLinkIcon({ name, size = 20, strokeWidth = 1.9, ...props }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };

  switch (name) {
    case "menu": return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "close": return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case "search": return <svg {...common}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
    case "user": return <svg {...common}><circle cx="12" cy="8" r="3.3" /><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6" /></svg>;
    case "message": return <svg {...common}><path d="M5 5.5h14v10H9l-4 3v-13Z" /><path d="M8.5 9h7M8.5 12h5" /></svg>;
    case "bell": return <svg {...common}><path d="M6.5 16.5h11l-1.4-2.1V10a4.1 4.1 0 0 0-8.2 0v4.4l-1.4 2.1Z" /><path d="M10 19a2.2 2.2 0 0 0 4 0" /></svg>;
    case "calendar": return <svg {...common}><rect x="4" y="5.5" width="16" height="14" rx="2.5" /><path d="M8 3.5v4M16 3.5v4M4 9.5h16" /></svg>;
    case "check": return <svg {...common}><path d="m5 12.5 4.2 4.2L19 7" /></svg>;
    case "trash": return <svg {...common}><path d="M5 7h14M9 7V4.5h6V7M7.5 7l.7 12h7.6l.7-12M10 10.5v5M14 10.5v5" /></svg>;
    case "logout": return <svg {...common}><path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10M14 8l4 4-4 4M9 12h9" /></svg>;
    case "settings": return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.1l2-1.6-2-3.4-2.5 1A7.4 7.4 0 0 0 14.5 6L14 3.5h-4L9.5 6a7.4 7.4 0 0 0-1.9 1l-2.5-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .7.1 1.1l-2 1.6 2 3.4 2.5-1a7.4 7.4 0 0 0 1.9 1l.5 2.4h4l.5-2.4a7.4 7.4 0 0 0 1.9-1l2.5 1 2-3.4-2-1.6c.1-.4.1-.7.1-1.1Z" /></svg>;
    case "tools": return <svg {...common}><path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h7M15 17h5" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="13" cy="17" r="2" /></svg>;
    case "paperclip": return <svg {...common}><path d="m9 12.5 5.8-5.8a3 3 0 1 1 4.2 4.2l-7.5 7.5a5 5 0 0 1-7.1-7.1l7.1-7.1" /></svg>;
    case "send": return <svg {...common}><path d="m4 5 16 7-16 7 3-7-3-7Z" /><path d="M7 12h13" /></svg>;
    case "truck": return <svg {...common}><path d="M3 7h11v9H3V7Zm11 3h3.5l3.5 3.7V16h-7v-6Z" /><circle cx="7" cy="17.5" r="1.7" /><circle cx="17.5" cy="17.5" r="1.7" /></svg>;
    case "archive": return <svg {...common}><path d="M4 7h16v12H4V7ZM3 4h18v3H3V4Z" /><path d="M9 11h6" /></svg>;
    case "edit": return <svg {...common}><path d="M5 19h4l10-10-4-4L5 15v4ZM13.5 6.5l4 4" /></svg>;
    case "home": return <svg {...common}><path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4v-9Z" /></svg>;
    case "chevronLeft": return <svg {...common}><path d="m14.5 6-6 6 6 6" /></svg>;
    case "chevronRight": return <svg {...common}><path d="m9.5 6 6 6-6 6" /></svg>;
    case "chevronDown": return <svg {...common}><path d="m6 9 6 6 6-6" /></svg>;
    case "phone": return <svg {...common}><path d="M6.5 3.8 9 3l2.1 5-1.7 1.5c1 2.1 2.9 4 5 5l1.5-1.7 5 2.1-.8 2.5c-.4 1.2-1.5 2-2.8 2C10.2 19.4 4.6 13.8 4.6 6.6c0-1.3.8-2.4 1.9-2.8Z" /></svg>;
    case "mic": return <svg {...common}><rect x="8" y="3" width="8" height="12" rx="4" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" /></svg>;
    case "volume": return <svg {...common}><path d="M4 10h4l5-4v12l-5-4H4v-4Z" /><path d="M16 9.2c1.5 1.6 1.5 4 0 5.6M18.5 7c2.8 2.8 2.8 7.2 0 10" /></svg>;
    case "plus": return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    default: return null;
  }
}
