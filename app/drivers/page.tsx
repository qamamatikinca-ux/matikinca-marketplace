"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import DriversAvailableForWork from "@/components/phase2/DriversAvailableForWork";

export default function DriversPage(){
  return <main><div style={{width:'min(1180px,calc(100% - 32px))',margin:'28px auto 0'}}><Link href="/">Back to LoadLink</Link></div><DriversAvailableForWork /></main>;
}
