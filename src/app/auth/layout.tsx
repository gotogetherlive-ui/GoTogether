import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Authentication | GoTogether");

export default function AuthPrivateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
