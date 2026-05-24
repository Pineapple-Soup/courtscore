export type VideoPlayerProps = {
  src: string;
};

export type Video = {
  id: string;
  src: string;
  label: string;
  description: string;
  created_at: string;
};

export enum VideoStatus {
  NOT_STARTED = "Not Started",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed",
}
