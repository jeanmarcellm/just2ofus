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

export type Note = {
  id: string;
  author_id: string;
  body: string;
  emoji: string;
  visible_from: string;
  created_at: string;
};

export type Mood = {
  user_id: string;
  day: string;
  emoji: string;
  note: string | null;
};

export type DailyQuestion = {
  id: number;
  prompt: string;
};

export type DailyAnswer = {
  user_id: string;
  day: string;
  question_id: number;
  answer: string;
};

export type List = {
  id: string;
  title: string;
  emoji: string;
  created_at: string;
};

export type ListItem = {
  id: string;
  list_id: string;
  created_by: string;
  text: string;
  done: boolean;
  done_at: string | null;
  done_by: string | null;
  moment_id: string | null;
};

export type Goal = {
  id: string;
  created_by: string;
  title: string;
  emoji: string;
  target_on: string | null;
  done_on: string | null;
  moment_id: string | null;
  photo_id: string | null;
};

export type SpecialDate = {
  id: string;
  title: string;
  emoji: string;
  day: string;
  yearly: boolean;
};

export type DateIdeaSetting = "home" | "out";
export type DateIdeaBudget = "low" | "medium" | "high";

export type DateIdea = {
  id: string;
  title: string;
  location: string | null;
  setting: DateIdeaSetting;
  budget: DateIdeaBudget;
};

export type Capsule = {
  id: string;
  created_by: string;
  title: string;
  opens_at: string;
  has_photo: boolean;
  created_at: string;
};

export type OnThisDayItem = {
  kind: "moment" | "photo";
  id: string;
  title: string | null;
  emoji: string | null;
  day: string;
  storage_path: string | null;
};
