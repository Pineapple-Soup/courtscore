export interface Assignment {
  id: string;
  projectVideoId: string;
  userId: string;
  status: string;
  createdAt?: string;
}

export interface AssignmentSummary {
  id: string;
  projectName: string;
  userName: string;
  videoLabel: string;
  status: string;
  createdAt: string;
}
