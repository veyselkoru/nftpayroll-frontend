import { redirect } from "next/navigation";

export default function EmployeeReportsRedirectPage() {
  redirect("/reports?view=employee");
}
