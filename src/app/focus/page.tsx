import FocusPageClient from '@/components/FocusPageClient';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "REMOTE OS — Focus Mode",
  description: "One task. One timer. No distractions. Deep work guard for async teams.",
};

export default function FocusPage() {
  return <FocusPageClient />;
}
