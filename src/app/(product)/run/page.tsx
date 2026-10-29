import { redirect } from "next/navigation";

export default async function RunPage({ searchParams }: PageProps<"/run">) {
  const sp = await searchParams;
  redirect(typeof sp.prompt === "string" ? `/app?q=${encodeURIComponent(sp.prompt)}` : "/app");
}
