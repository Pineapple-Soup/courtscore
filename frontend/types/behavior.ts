export interface Behavior {
  name: string;
  hotkey: string;
  description?: string;
  threshold?: number;
}

export enum BehaviorStatus {
  EMPTY,
  ACTIVE,
  COMPLETE,
}
