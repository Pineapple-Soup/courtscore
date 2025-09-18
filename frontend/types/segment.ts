import { Behavior } from "@/types/behavior";

export type Segment = {
  behavior: Behavior;
  startTime: number;
  endTime: number | null;
  notes?: string;
};
