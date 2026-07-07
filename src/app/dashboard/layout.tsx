import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Dashboard | GoTogether");

export default function DashboardPrivateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
