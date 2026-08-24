import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-100">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-lg font-medium">TradeDesk</h1>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition-colors duration-[120ms] hover:bg-neutral-900"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
