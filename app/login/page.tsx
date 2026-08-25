import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-text text-lg font-medium">TradeDesk</h1>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="border-border text-text hover:bg-surface rounded-sm border px-4 py-2 text-sm transition-colors duration-[120ms]"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
