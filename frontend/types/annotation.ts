import { Behavior } from "@/types/behavior";

export type Segment = {
  behavior: Behavior;
  startTime: number;
  endTime: number | null;
  notes?: string;
};

export type Annotation = {
  id: string;
  assignment_id: string;
  segments: Segment[];
  submitted: boolean;
  submitted_at: string;
  updated_at: string;
};
