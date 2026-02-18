import { redirect } from "next/navigation";

export default function PayrollReportsRedirectPage() {
  redirect("/reports?view=payroll");
}
