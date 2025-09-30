// src/app/page.tsx  (NO pongas "use client")
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/mobile/pricesearch");
}
