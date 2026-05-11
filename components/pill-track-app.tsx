"use client";

import clsx from "clsx";
import {
  Activity,
  Archive,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  LogOut,
  Pencil,
  Pill,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type { ReactNode, TransitionStartFunction } from "react";
import {
  createIntakeLog,
  createMedication,
  deleteIntakeLog,
  setMedicationActive,
  updateIntakeLog,
  updateMedication
} from "@/app/actions";
import type { IntakeLog, Medication } from "@/lib/types";

type Tab = "calendar" | "history" | "medications";

type Props = {
  userEmail: string;
  medications: Medication[];
  logs: IntakeLog[];
  signOutAction: () => Promise<void>;
};

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];
const DEFAULT_COLORS = ["#2f6d4f", "#e86f51", "#6b5dd3", "#d49b1f", "#2d7f90", "#b24c63"];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayKey() {
  return dateKey(new Date());
}

function timeNow() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function getMonthCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const cell = new Date(start);
    cell.setDate(start.getDate() + index);
    return cell;
  });
}

function formatShortDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function symptomsToString(log: IntakeLog) {
  return (log.symptoms ?? []).join(", ");
}

export default function PillTrackApp({ userEmail, medications, logs, signOutAction }: Props) {
  const activeMedications = useMemo(() => medications.filter((med) => med.is_active), [medications]);
  const initialMedication = activeMedications[0]?.id ?? medications[0]?.id ?? "";
  const [tab, setTab] = useState<Tab>("calendar");
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedMedicationIds, setSelectedMedicationIds] = useState<string[]>([]);
  const [comboMedicationIds, setComboMedicationIds] = useState<string[]>(
    activeMedications.slice(0, 2).map((med) => med.id)
  );
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const medicationsById = useMemo(() => new Map(medications.map((med) => [med.id, med])), [medications]);
  const filteredLogs = useMemo(() => {
    if (selectedMedicationIds.length === 0) {
      return logs;
    }

    const selected = new Set(selectedMedicationIds);
    return logs.filter((log) => selected.has(log.medication_id));
  }, [logs, selectedMedicationIds]);

  const logsByDate = useMemo(() => {
    const grouped = new Map<string, IntakeLog[]>();
    filteredLogs.forEach((log) => {
      grouped.set(log.taken_on, [...(grouped.get(log.taken_on) ?? []), log]);
    });
    return grouped;
  }, [filteredLogs]);

  const selectedDayLogs = logsByDate.get(selectedDate) ?? [];
  const monthCells = getMonthCells(visibleMonth);
  const selectedMonthLabel = `${MONTHS[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`;

  const combinationDays = useMemo(() => {
    if (comboMedicationIds.length < 2) {
      return [];
    }

    const selected = new Set(comboMedicationIds);
    const byDate = new Map<string, IntakeLog[]>();
    logs.forEach((log) => {
      if (selected.has(log.medication_id)) {
        byDate.set(log.taken_on, [...(byDate.get(log.taken_on) ?? []), log]);
      }
    });

    return Array.from(byDate.entries())
      .filter(([, dayLogs]) => {
        const medsOnDay = new Set(dayLogs.map((log) => log.medication_id));
        return comboMedicationIds.every((id) => medsOnDay.has(id));
      })
      .sort(([a], [b]) => b.localeCompare(a));
  }, [comboMedicationIds, logs]);

  function toggleSelectedMedication(id: string) {
    setSelectedMedicationIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleComboMedication(id: string) {
    setComboMedicationIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function changeMonth(delta: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-4 pb-24 pt-5 sm:px-6 lg:px-8">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-leaf text-white">
            <Pill aria-hidden="true" size={22} />
          </div>
          <h1 className="text-3xl font-semibold text-ink">Pill Track</h1>
          <p className="mt-1 max-w-full truncate text-sm text-ink/60">{userEmail}</p>
        </div>
        <form action={signOutAction}>
          <button
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="focus-ring grid h-11 w-11 place-items-center rounded-md border border-ink/10 bg-white/80 text-ink shadow-soft"
          >
            <LogOut aria-hidden="true" size={19} />
          </button>
        </form>
      </header>

      <nav className="sticky top-3 z-10 mb-5 grid grid-cols-3 gap-2 rounded-lg border border-ink/10 bg-white/86 p-1 shadow-soft backdrop-blur">
        <TabButton active={tab === "calendar"} icon={<CalendarDays size={18} />} label="Calendario" onClick={() => setTab("calendar")} />
        <TabButton active={tab === "history"} icon={<History size={18} />} label="Historial" onClick={() => setTab("history")} />
        <TabButton active={tab === "medications"} icon={<Pill size={18} />} label="Medicinas" onClick={() => setTab("medications")} />
      </nav>

      <MedicationFilter
        medications={medications}
        selectedMedicationIds={selectedMedicationIds}
        toggleSelectedMedication={toggleSelectedMedication}
      />

      {tab === "calendar" ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-ink/10 bg-white/88 p-3 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <button
                aria-label="Mes anterior"
                title="Mes anterior"
                onClick={() => changeMonth(-1)}
                className="focus-ring grid h-10 w-10 place-items-center rounded-md border border-ink/10 text-ink"
              >
                <ChevronLeft aria-hidden="true" size={20} />
              </button>
              <h2 className="text-lg font-semibold text-ink">{selectedMonthLabel}</h2>
              <button
                aria-label="Mes siguiente"
                title="Mes siguiente"
                onClick={() => changeMonth(1)}
                className="focus-ring grid h-10 w-10 place-items-center rounded-md border border-ink/10 text-ink"
              >
                <ChevronRight aria-hidden="true" size={20} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink/50">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((cell) => {
                const key = dateKey(cell);
                const dayLogs = logsByDate.get(key) ?? [];
                const isCurrentMonth = cell.getMonth() === visibleMonth.getMonth();
                const isSelected = key === selectedDate;
                const isToday = key === todayKey();

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    className={clsx(
                      "focus-ring flex aspect-square min-h-11 flex-col items-center justify-center rounded-md border text-sm transition",
                      isSelected
                        ? "border-leaf bg-leaf text-white"
                        : "border-transparent bg-paper/60 text-ink hover:border-ink/10 hover:bg-white",
                      !isCurrentMonth && "opacity-35"
                    )}
                  >
                    <span className={clsx("font-semibold", isToday && !isSelected && "text-coral")}>{cell.getDate()}</span>
                    <span className="mt-1 flex h-2 min-w-2 justify-center gap-0.5">
                      {dayLogs.slice(0, 3).map((log) => {
                        const med = medicationsById.get(log.medication_id);
                        return (
                          <span
                            key={log.id}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: isSelected ? "#ffffff" : med?.color ?? "#2f6d4f" }}
                          />
                        );
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <DayPanel
            selectedDate={selectedDate}
            medications={activeMedications}
            allMedications={medications}
            logs={selectedDayLogs}
            initialMedication={initialMedication}
            editingLogId={editingLogId}
            setEditingLogId={setEditingLogId}
            isPending={isPending}
            startTransition={startTransition}
          />
        </div>
      ) : null}

      {tab === "history" ? (
        <HistoryPanel
          logs={filteredLogs}
          medications={medications}
          comboMedicationIds={comboMedicationIds}
          toggleComboMedication={toggleComboMedication}
          combinationDays={combinationDays}
        />
      ) : null}

      {tab === "medications" ? (
        <MedicationsPanel
          medications={medications}
          editingMedicationId={editingMedicationId}
          setEditingMedicationId={setEditingMedicationId}
        />
      ) : null}
    </main>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "focus-ring flex min-h-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-semibold",
        active ? "bg-leaf text-white" : "text-ink/60"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function MedicationFilter({
  medications,
  selectedMedicationIds,
  toggleSelectedMedication
}: {
  medications: Medication[];
  selectedMedicationIds: string[];
  toggleSelectedMedication: (id: string) => void;
}) {
  if (medications.length === 0) {
    return null;
  }

  return (
    <section className="mb-5 flex gap-2 overflow-x-auto pb-1">
      {medications.map((medication) => {
        const selected = selectedMedicationIds.includes(medication.id);
        return (
          <button
            key={medication.id}
            onClick={() => toggleSelectedMedication(medication.id)}
            className={clsx(
              "focus-ring flex min-h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold",
              selected ? "border-leaf bg-leaf text-white" : "border-ink/10 bg-white/80 text-ink/70"
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: medication.color }} />
            {medication.name}
          </button>
        );
      })}
    </section>
  );
}

function DayPanel({
  selectedDate,
  medications,
  allMedications,
  logs,
  initialMedication,
  editingLogId,
  setEditingLogId,
  isPending,
  startTransition
}: {
  selectedDate: string;
  medications: Medication[];
  allMedications: Medication[];
  logs: IntakeLog[];
  initialMedication: string;
  editingLogId: string | null;
  setEditingLogId: (id: string | null) => void;
  isPending: boolean;
  startTransition: TransitionStartFunction;
}) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white/88 p-4 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">{formatShortDate(selectedDate)}</h2>
          <p className="text-sm text-ink/55">{logs.length} tomas</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-md bg-mint text-leaf">
          <Activity aria-hidden="true" size={22} />
        </div>
      </div>

      <IntakeForm
        selectedDate={selectedDate}
        medications={medications}
        initialMedication={initialMedication}
        isPending={isPending}
      />

      <div className="mt-5 space-y-3">
        {logs.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink/15 p-4 text-sm text-ink/55">Sin tomas en este día.</div>
        ) : null}

        {logs.map((log) => {
          const medication = allMedications.find((item) => item.id === log.medication_id) ?? log.medications;
          const editing = editingLogId === log.id;

          return (
            <article key={log.id} className="rounded-md border border-ink/10 bg-paper/70 p-3">
              {editing ? (
                <EditLogForm log={log} medications={allMedications} onDone={() => setEditingLogId(null)} />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: medication?.color ?? "#2f6d4f" }} />
                        <h3 className="font-semibold text-ink">{medication?.name ?? "Medicamento"}</h3>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/55">
                        <Clock3 aria-hidden="true" size={14} />
                        {log.taken_at.slice(0, 5)}
                        {log.dose ? ` · ${log.dose}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        aria-label="Editar toma"
                        title="Editar toma"
                        onClick={() => setEditingLogId(log.id)}
                        className="focus-ring grid h-9 w-9 place-items-center rounded-md text-ink/60"
                      >
                        <Pencil aria-hidden="true" size={17} />
                      </button>
                      <form
                        action={(formData) => {
                          startTransition(() => {
                            void deleteIntakeLog(formData);
                          });
                        }}
                      >
                        <input type="hidden" name="id" value={log.id} />
                        <button
                          aria-label="Eliminar toma"
                          title="Eliminar toma"
                          disabled={isPending}
                          className="focus-ring grid h-9 w-9 place-items-center rounded-md text-coral disabled:opacity-50"
                        >
                          <Trash2 aria-hidden="true" size={17} />
                        </button>
                      </form>
                    </div>
                  </div>
                  <LogMeta log={log} />
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function IntakeForm({
  selectedDate,
  medications,
  initialMedication,
  isPending
}: {
  selectedDate: string;
  medications: Medication[];
  initialMedication: string;
  isPending: boolean;
}) {
  if (medications.length === 0) {
    return <div className="rounded-md border border-dashed border-ink/15 p-4 text-sm text-ink/55">Crea un medicamento para registrar tomas.</div>;
  }

  return (
    <form action={createIntakeLog} className="grid gap-3 rounded-md border border-ink/10 bg-white p-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium text-ink">
          Medicamento
          <select name="medication_id" defaultValue={initialMedication} className="mt-1 min-h-11 w-full rounded-md border border-ink/15 bg-white px-3">
            {medications.map((medication) => (
              <option key={medication.id} value={medication.id}>
                {medication.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-ink">
          Hora
          <input name="taken_at" type="time" defaultValue={timeNow()} className="mt-1 min-h-11 w-full rounded-md border border-ink/15 px-3" />
        </label>
      </div>
      <input type="hidden" name="taken_on" value={selectedDate} />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium text-ink">
          Dosis
          <input name="dose" placeholder="10 mg" className="mt-1 min-h-11 w-full rounded-md border border-ink/15 px-3" />
        </label>
        <label className="text-sm font-medium text-ink">
          Efecto
          <input
            name="effect_score"
            type="number"
            min="1"
            max="5"
            defaultValue="3"
            className="mt-1 min-h-11 w-full rounded-md border border-ink/15 px-3"
          />
        </label>
      </div>
      <label className="text-sm font-medium text-ink">
        Síntomas
        <input name="symptoms" placeholder="sueño, calma" className="mt-1 min-h-11 w-full rounded-md border border-ink/15 px-3" />
      </label>
      <label className="text-sm font-medium text-ink">
        Comentario
        <textarea name="comment" rows={3} className="mt-1 w-full rounded-md border border-ink/15 px-3 py-2" />
      </label>
      <button disabled={isPending} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-leaf px-4 font-semibold text-white disabled:opacity-55">
        <Plus aria-hidden="true" size={18} />
        Registrar
      </button>
    </form>
  );
}

function EditLogForm({ log, medications, onDone }: { log: IntakeLog; medications: Medication[]; onDone: () => void }) {
  return (
    <form action={updateIntakeLog} className="grid gap-3">
      <input type="hidden" name="id" value={log.id} />
      <div className="grid grid-cols-2 gap-3">
        <select name="medication_id" defaultValue={log.medication_id} className="min-h-11 rounded-md border border-ink/15 bg-white px-3">
          {medications.map((medication) => (
            <option key={medication.id} value={medication.id}>
              {medication.name}
            </option>
          ))}
        </select>
        <input name="taken_on" type="date" defaultValue={log.taken_on} className="min-h-11 rounded-md border border-ink/15 px-3" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input name="taken_at" type="time" defaultValue={log.taken_at.slice(0, 5)} className="min-h-11 rounded-md border border-ink/15 px-3" />
        <input name="dose" defaultValue={log.dose ?? ""} placeholder="Dosis" className="min-h-11 rounded-md border border-ink/15 px-3" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          name="effect_score"
          type="number"
          min="1"
          max="5"
          defaultValue={log.effect_score ?? 3}
          className="min-h-11 rounded-md border border-ink/15 px-3"
        />
        <input name="symptoms" defaultValue={symptomsToString(log)} placeholder="Síntomas" className="min-h-11 rounded-md border border-ink/15 px-3" />
      </div>
      <textarea name="comment" rows={3} defaultValue={log.comment ?? ""} className="rounded-md border border-ink/15 px-3 py-2" />
      <div className="grid grid-cols-2 gap-2">
        <button className="focus-ring min-h-10 rounded-md bg-leaf px-3 font-semibold text-white">Guardar</button>
        <button type="button" onClick={onDone} className="focus-ring min-h-10 rounded-md border border-ink/10 px-3 font-semibold text-ink/65">
          Cerrar
        </button>
      </div>
    </form>
  );
}

function LogMeta({ log }: { log: IntakeLog }) {
  return (
    <div className="mt-3 space-y-2 text-sm text-ink/70">
      <div className="flex flex-wrap gap-2">
        {log.effect_score ? <span className="rounded-md bg-mint px-2 py-1 font-semibold text-leaf">Efecto {log.effect_score}/5</span> : null}
        {(log.symptoms ?? []).map((symptom) => (
          <span key={symptom} className="rounded-md bg-lilac/55 px-2 py-1 text-ink/70">
            {symptom}
          </span>
        ))}
      </div>
      {log.comment ? <p className="leading-6">{log.comment}</p> : null}
    </div>
  );
}

function HistoryPanel({
  logs,
  medications,
  comboMedicationIds,
  toggleComboMedication,
  combinationDays
}: {
  logs: IntakeLog[];
  medications: Medication[];
  comboMedicationIds: string[];
  toggleComboMedication: (id: string) => void;
  combinationDays: [string, IntakeLog[]][];
}) {
  const medicationsById = new Map(medications.map((med) => [med.id, med]));

  return (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-lg border border-ink/10 bg-white/88 p-4 shadow-soft">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-lilac text-ink">
            <History aria-hidden="true" size={22} />
          </div>
          <h2 className="text-xl font-semibold text-ink">Historial</h2>
        </div>
        <div className="space-y-3">
          {logs.length === 0 ? <div className="rounded-md border border-dashed border-ink/15 p-4 text-sm text-ink/55">Sin registros.</div> : null}
          {logs.map((log) => {
            const medication = medicationsById.get(log.medication_id) ?? log.medications;
            return (
              <article key={log.id} className="rounded-md border border-ink/10 bg-paper/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: medication?.color ?? "#2f6d4f" }} />
                      <h3 className="font-semibold text-ink">{medication?.name ?? "Medicamento"}</h3>
                    </div>
                    <p className="mt-1 text-sm text-ink/55">
                      {formatShortDate(log.taken_on)} · {log.taken_at.slice(0, 5)}
                    </p>
                  </div>
                  {log.dose ? <span className="rounded-md bg-white px-2 py-1 text-sm font-semibold text-ink/65">{log.dose}</span> : null}
                </div>
                <LogMeta log={log} />
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white/88 p-4 shadow-soft">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-gold/55 text-ink">
            <Sparkles aria-hidden="true" size={22} />
          </div>
          <h2 className="text-xl font-semibold text-ink">Combinaciones</h2>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {medications.map((medication) => {
            const selected = comboMedicationIds.includes(medication.id);
            return (
              <button
                key={medication.id}
                onClick={() => toggleComboMedication(medication.id)}
                className={clsx(
                  "focus-ring flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold",
                  selected ? "border-gold bg-gold/70 text-ink" : "border-ink/10 bg-white text-ink/60"
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: medication.color }} />
                {medication.name}
              </button>
            );
          })}
        </div>
        <div className="space-y-3">
          {comboMedicationIds.length < 2 ? (
            <div className="rounded-md border border-dashed border-ink/15 p-4 text-sm text-ink/55">Selecciona dos o más medicamentos.</div>
          ) : null}
          {comboMedicationIds.length >= 2 && combinationDays.length === 0 ? (
            <div className="rounded-md border border-dashed border-ink/15 p-4 text-sm text-ink/55">Sin coincidencias.</div>
          ) : null}
          {combinationDays.map(([day, dayLogs]) => (
            <article key={day} className="rounded-md border border-ink/10 bg-paper/70 p-3">
              <h3 className="font-semibold text-ink">{formatShortDate(day)}</h3>
              <div className="mt-3 space-y-2">
                {dayLogs.map((log) => {
                  const medication = medicationsById.get(log.medication_id) ?? log.medications;
                  return (
                    <div key={log.id} className="rounded-md bg-white/75 p-2 text-sm text-ink/70">
                      <div className="flex items-center gap-2 font-semibold text-ink">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: medication?.color ?? "#2f6d4f" }} />
                        {medication?.name ?? "Medicamento"} · {log.taken_at.slice(0, 5)}
                      </div>
                      {log.comment ? <p className="mt-1 leading-6">{log.comment}</p> : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MedicationsPanel({
  medications,
  editingMedicationId,
  setEditingMedicationId
}: {
  medications: Medication[];
  editingMedicationId: string | null;
  setEditingMedicationId: (id: string | null) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-lg border border-ink/10 bg-white/88 p-4 shadow-soft">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-mint text-leaf">
            <Plus aria-hidden="true" size={22} />
          </div>
          <h2 className="text-xl font-semibold text-ink">Nuevo medicamento</h2>
        </div>
        <form action={createMedication} className="grid gap-3">
          <label className="text-sm font-medium text-ink">
            Nombre
            <input name="name" required placeholder="Ibuprofeno" className="mt-1 min-h-11 w-full rounded-md border border-ink/15 px-3" />
          </label>
          <label className="text-sm font-medium text-ink">
            Color
            <div className="mt-2 flex gap-2">
              {DEFAULT_COLORS.map((color, index) => (
                <label key={color} className="grid h-10 w-10 place-items-center rounded-md border border-ink/10 bg-white">
                  <input className="sr-only" name="color" type="radio" value={color} defaultChecked={index === 0} />
                  <span className="h-6 w-6 rounded-full" style={{ backgroundColor: color }} />
                </label>
              ))}
            </div>
          </label>
          <label className="text-sm font-medium text-ink">
            Notas
            <textarea name="notes" rows={4} className="mt-1 w-full rounded-md border border-ink/15 px-3 py-2" />
          </label>
          <button className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-leaf px-4 font-semibold text-white">
            <Plus aria-hidden="true" size={18} />
            Crear
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white/88 p-4 shadow-soft">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-lilac text-ink">
            <Pill aria-hidden="true" size={22} />
          </div>
          <h2 className="text-xl font-semibold text-ink">Medicamentos</h2>
        </div>
        <div className="space-y-3">
          {medications.length === 0 ? <div className="rounded-md border border-dashed border-ink/15 p-4 text-sm text-ink/55">Sin medicamentos.</div> : null}
          {medications.map((medication) => {
            const editing = editingMedicationId === medication.id;
            return (
              <article key={medication.id} className={clsx("rounded-md border border-ink/10 bg-paper/70 p-3", !medication.is_active && "opacity-60")}>
                {editing ? (
                  <form action={updateMedication} className="grid gap-3">
                    <input type="hidden" name="id" value={medication.id} />
                    <input name="name" required defaultValue={medication.name} className="min-h-11 rounded-md border border-ink/15 px-3" />
                    <input name="color" type="color" defaultValue={medication.color} className="h-11 w-full rounded-md border border-ink/15 bg-white px-2" />
                    <textarea name="notes" rows={3} defaultValue={medication.notes ?? ""} className="rounded-md border border-ink/15 px-3 py-2" />
                    <div className="grid grid-cols-2 gap-2">
                      <button className="focus-ring min-h-10 rounded-md bg-leaf px-3 font-semibold text-white">Guardar</button>
                      <button
                        type="button"
                        onClick={() => setEditingMedicationId(null)}
                        className="focus-ring min-h-10 rounded-md border border-ink/10 px-3 font-semibold text-ink/65"
                      >
                        Cerrar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: medication.color }} />
                          <h3 className="font-semibold text-ink">{medication.name}</h3>
                        </div>
                        {medication.notes ? <p className="mt-2 text-sm leading-6 text-ink/65">{medication.notes}</p> : null}
                      </div>
                      <div className="flex gap-1">
                        <button
                          aria-label="Editar medicamento"
                          title="Editar medicamento"
                          onClick={() => setEditingMedicationId(medication.id)}
                          className="focus-ring grid h-9 w-9 place-items-center rounded-md text-ink/60"
                        >
                          <Pencil aria-hidden="true" size={17} />
                        </button>
                        <form action={setMedicationActive}>
                          <input type="hidden" name="id" value={medication.id} />
                          <input type="hidden" name="is_active" value={medication.is_active ? "false" : "true"} />
                          <button
                            aria-label={medication.is_active ? "Archivar medicamento" : "Restaurar medicamento"}
                            title={medication.is_active ? "Archivar medicamento" : "Restaurar medicamento"}
                            className="focus-ring grid h-9 w-9 place-items-center rounded-md text-ink/60"
                          >
                            {medication.is_active ? <Archive aria-hidden="true" size={17} /> : <RotateCcw aria-hidden="true" size={17} />}
                          </button>
                        </form>
                      </div>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
