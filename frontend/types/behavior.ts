export enum Behavior {
  ORIENTING = 1,
  FOLLOWING,
  TAPPING,
  SINGING,
  LICKING,
  ATT_COPULATION,
  SUC_COPULATION,
}

export interface DurationBehavior {
  id: string;
  title: string;
  description?: string;
}
