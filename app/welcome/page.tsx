import { redirect } from "next/navigation";

/** 旧URL互換: 一般向けトップは `/` に統一 */
export default function WelcomePage() {
  redirect("/");
}
