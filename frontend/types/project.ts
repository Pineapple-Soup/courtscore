import { Behavior } from "@/types/behavior";
import { User } from "@/types/user";
import { Video } from "@/types/video";

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  user: User;
  created_at: string;
}

export interface ProjectVideo {
  id: string;
  projectId: string;
  videoId: string;
  video: Video;
  createdAt: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  annotatorsPerVideo: number;
  behaviors: Behavior[];
  projectVideos: ProjectVideo[];
  projectMembers: ProjectMember[];
  createdAt: string;
}
