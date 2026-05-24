import { redirect } from "next/navigation";

/*
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return <main className="grid min-h-screen place-items-center p-4"><AuthForm mode="signup" /></main>;
}
*/

export default function SignupPage() {
  redirect("/login");
}
