import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Sign In | GoTogether");

export default function LoginPrivateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
