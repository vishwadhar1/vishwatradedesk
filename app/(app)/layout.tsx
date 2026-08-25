import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Nav } from "@/components/Nav";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <Nav email={session.user?.email} />
      <main className="mx-auto max-w-[1400px] px-4 py-6">{children}</main>
    </>
  );
}
