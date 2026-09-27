export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  couple_id: string | null;
};

export type Couple = {
  id: string;
  together_since: string;
  created_by: string;
};

export type Moment = {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  emoji: string;
  happened_on: string;
};

export type DatePlanStatus = "planned" | "done" | "cancelled";

export type DatePlan = {
  id: string;
  created_by: string;
  title: string;
  scheduled_at: string;
  location: string | null;
  notes: string | null;
  status: DatePlanStatus;
  moment_id: string | null;
};

export type Photo = {
  id: string;
  uploaded_by: string;
  storage_path: string;
  caption: string | null;
  taken_on: string;
  is_special: boolean;
};

export type QuizQuestion = {
  id: string;
  couple_id: string | null;
  created_by: string | null;
  prompt: string;
  options: string[];
};

export type QuizAnswer = {
  user_id: string;
  question_id: string;
  answer_index: number;
};

export type QuizRound = {
  id: string;
  player_id: string;
  score: number;
  total: number;
  played_at: string;
};
