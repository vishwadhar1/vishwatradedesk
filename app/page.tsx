import { auth, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100">
      <h1 className="text-lg font-medium">TradeDesk</h1>
      <p className="text-sm text-neutral-400">
        Signed in as {session?.user?.email}
      </p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="rounded border border-neutral-700 px-4 py-2 text-sm transition-colors duration-[120ms] hover:bg-neutral-900"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
