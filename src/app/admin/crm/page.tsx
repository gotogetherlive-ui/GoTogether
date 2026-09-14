import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { privateMetadata } from "@/lib/seo";
import CrmClient from "./CrmClient";

export const metadata = privateMetadata("Customer CRM | GoTogether Admin");
export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const user = await getSession();
  if (!user || !(await isAdminUser(user))) redirect("/login?next=/admin/crm");
  return <CrmClient />;
}
