import { CheckCircle2, Mail, Pill } from "lucide-react";
import { signInWithEmail, signOut } from "@/app/actions";
import PillTrackApp from "@/components/pill-track-app";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { IntakeLog, Medication } from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    sent?: string;
  }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;

  if (!hasSupabaseEnv()) {
    return <SetupRequired />;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <Login sent={params?.sent === "1"} />;
  }

  const [medicationsResult, logsResult] = await Promise.all([
    supabase
      .from("medications")
      .select("*")
      .order("is_active", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("intake_logs")
      .select("*, medications(id,name,color,is_active)")
      .order("taken_on", { ascending: false })
      .order("taken_at", { ascending: false })
      .limit(500)
  ]);

  return (
    <PillTrackApp
      userEmail={user.email ?? "Cuenta"}
      medications={(medicationsResult.data ?? []) as Medication[]}
      logs={(logsResult.data ?? []) as IntakeLog[]}
      signOutAction={signOut}
    />
  );
}

function Login({ sent }: { sent: boolean }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between px-5 py-6">
      <div className="pt-10">
        <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-full bg-leaf text-white shadow-soft">
          <Pill aria-hidden="true" size={28} />
        </div>
        <h1 className="text-4xl font-semibold tracking-normal text-ink">Pill Track</h1>
        <p className="mt-3 text-base leading-7 text-ink/70">
          Tu calendario privado para registrar tomas, dosis y efectos.
        </p>
      </div>

      <section className="rounded-lg border border-ink/10 bg-white/86 p-4 shadow-soft backdrop-blur">
        {sent ? (
          <div className="mb-4 flex items-start gap-3 rounded-md bg-mint p-3 text-sm text-leaf">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <p>Revisa tu email para entrar.</p>
          </div>
        ) : null}
        <form action={signInWithEmail} className="space-y-3">
          <label className="block text-sm font-medium text-ink" htmlFor="email">
            Email
          </label>
          <div className="flex items-center gap-2 rounded-md border border-ink/15 bg-white px-3">
            <Mail aria-hidden="true" className="text-ink/45" size={18} />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="tu@email.com"
              className="min-h-12 w-full bg-transparent text-base outline-none placeholder:text-ink/35"
            />
          </div>
          <button className="focus-ring min-h-12 w-full rounded-md bg-leaf px-4 font-semibold text-white">
            Enviar enlace
          </button>
        </form>
      </section>
    </main>
  );
}

function SetupRequired() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-8">
      <section className="rounded-lg border border-coral/30 bg-white p-5 shadow-soft">
        <Pill aria-hidden="true" className="mb-4 text-coral" size={32} />
        <h1 className="text-2xl font-semibold text-ink">Configura Supabase</h1>
        <p className="mt-3 leading-7 text-ink/70">
          Añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local`.
        </p>
      </section>
    </main>
  );
}
