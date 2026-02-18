import { redirect } from "next/navigation";

export default function CompanyReportsRedirectPage() {
  redirect("/reports?view=company");
}
