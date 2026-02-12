export interface Assignment {
  id: string;
  project_video_id: string;
  user_id: string;
  status: string;
  created_at?: string;
  // optional enriched fields
  // project_id?: string;
  // video_id?: string;
}
