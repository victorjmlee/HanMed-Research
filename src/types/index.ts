export interface Profile {
  id: string;
  name: string;
  role: "형" | "아버지";
}

export interface ClinicalCase {
  id: string;
  doctor_id: string;
  case_number: string;
  age_group: string;
  gender: "남" | "여";
  chief_complaint: string;
  symptoms: Record<string, string>;
  tongue_diagnosis: string;
  pulse_diagnosis: string;
  pattern_identification: string;
  prescription: string;
  herb_details: HerbDetail[];
  treatment_duration: string;
  outcome: "완치" | "호전" | "변화없음" | "악화" | "추적불가";
  outcome_notes: string;
  clinical_notes: string;
  learning_points: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface HerbDetail {
  name: string;
  dose: string;
}

export interface AIConversation {
  id: string;
  case_id: string | null;
  doctor_id: string;
  question: string;
  answer: string;
  referenced_cases: string[];
  created_at: string;
}
