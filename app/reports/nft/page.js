import { redirect } from "next/navigation";

export default function NftReportsRedirectPage() {
  redirect("/reports?view=nft");
}
