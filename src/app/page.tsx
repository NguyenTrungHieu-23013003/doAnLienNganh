import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  
  if (!user) {
    redirect("/auth/login");
  }

  const role = user?.role || "user";
  
  if (role === "admin") redirect("/admin");
  if (role === "coach") redirect("/coach");
  redirect("/user");
}
