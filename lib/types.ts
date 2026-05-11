export type Medication = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type IntakeLog = {
  id: string;
  user_id: string;
  medication_id: string;
  taken_on: string;
  taken_at: string;
  dose: string | null;
  effect_score: number | null;
  symptoms: string[];
  comment: string | null;
  created_at: string;
  updated_at: string;
  medications?: Pick<Medication, "id" | "name" | "color" | "is_active"> | null;
};
