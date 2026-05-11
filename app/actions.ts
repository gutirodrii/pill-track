"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value.length > 0 ? value : null;
}

function readSymptoms(formData: FormData) {
  return readString(formData, "symptoms")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/");
  }

  return { supabase, userId: user.id };
}

async function getAuthCallbackUrl() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const requestOrigin = origin ?? (host ? `${proto}://${host}` : undefined);

  return `${siteUrl ?? requestOrigin ?? "http://localhost:3000"}/auth/callback`;
}

export async function signInWithEmail(formData: FormData) {
  const email = readString(formData, "email").toLowerCase();
  if (!email) {
    redirect("/");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: await getAuthCallbackUrl()
    }
  });

  if (error) {
    console.error("Supabase magic link error:", error.message);
    redirect("/?authError=1");
  }

  redirect("/?sent=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function createMedication(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const name = readString(formData, "name");
  const color = readString(formData, "color") || "#2f6d4f";

  if (!name) {
    return;
  }

  await supabase.from("medications").insert({
    user_id: userId,
    name,
    color,
    notes: readNullableString(formData, "notes")
  });

  revalidatePath("/");
}

export async function updateMedication(formData: FormData) {
  const { supabase } = await getUserId();
  const id = readString(formData, "id");
  const name = readString(formData, "name");

  if (!id || !name) {
    return;
  }

  await supabase
    .from("medications")
    .update({
      name,
      color: readString(formData, "color") || "#2f6d4f",
      notes: readNullableString(formData, "notes")
    })
    .eq("id", id);

  revalidatePath("/");
}

export async function setMedicationActive(formData: FormData) {
  const { supabase } = await getUserId();
  const id = readString(formData, "id");
  const isActive = readString(formData, "is_active") === "true";

  if (!id) {
    return;
  }

  await supabase.from("medications").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/");
}

export async function createIntakeLog(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const medicationId = readString(formData, "medication_id");
  const takenOn = readString(formData, "taken_on");
  const takenAt = readString(formData, "taken_at") || "08:00";
  const score = Number(readString(formData, "effect_score"));

  if (!medicationId || !takenOn) {
    return;
  }

  await supabase.from("intake_logs").insert({
    user_id: userId,
    medication_id: medicationId,
    taken_on: takenOn,
    taken_at: takenAt,
    dose: readNullableString(formData, "dose"),
    effect_score: Number.isFinite(score) ? score : null,
    symptoms: readSymptoms(formData),
    comment: readNullableString(formData, "comment")
  });

  revalidatePath("/");
}

export async function updateIntakeLog(formData: FormData) {
  const { supabase } = await getUserId();
  const id = readString(formData, "id");
  const medicationId = readString(formData, "medication_id");
  const takenOn = readString(formData, "taken_on");
  const score = Number(readString(formData, "effect_score"));

  if (!id || !medicationId || !takenOn) {
    return;
  }

  await supabase
    .from("intake_logs")
    .update({
      medication_id: medicationId,
      taken_on: takenOn,
      taken_at: readString(formData, "taken_at") || "08:00",
      dose: readNullableString(formData, "dose"),
      effect_score: Number.isFinite(score) ? score : null,
      symptoms: readSymptoms(formData),
      comment: readNullableString(formData, "comment")
    })
    .eq("id", id);

  revalidatePath("/");
}

export async function deleteIntakeLog(formData: FormData) {
  const { supabase } = await getUserId();
  const id = readString(formData, "id");

  if (!id) {
    return;
  }

  await supabase.from("intake_logs").delete().eq("id", id);
  revalidatePath("/");
}
