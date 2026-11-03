
"use client";
import { useId } from "react";

export default function SmartSearchIcon() {
  const id = useId().replaceAll(":", "");
  return (
    <svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true" focusable="false">
      <defs><linearGradient id={id} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#4F83FF" />
        <stop offset=".52" stopColor="#8D5DF5" />
        <stop offset="1" stopColor="#E24BA4" />
      </linearGradient></defs>
      <path d="M16 1.7 28.3 8.8v14.4L16 30.3 3.7 23.2V8.8L16 1.7Z" fill={`url(#${id})`} />
      <path d="m16 7.3 2.4 6.3 6.3 2.4-6.3 2.4-2.4 6.3-2.4-6.3-6.3-2.4 6.3-2.4L16 7.3Z" fill="#fff" />
      <circle cx="24.1" cy="8.1" r="1.1" fill="#fff" opacity=".9" />
    </svg>
  );
}
