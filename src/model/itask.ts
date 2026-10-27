import type { TaskStatus, UserRole } from './types';
export type { TaskStatus, UserRole };

export interface IUser {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
}

export interface IProject {
  id: string;
  name: string;
  client: string;
  startDate: string;
  deadline: string;
  desc: string;
  plannedBudget: number;
  hourlyRate: number;
}

export interface IStage {
  id: string;
  name: string;
  startDate: string;
  deadline: string;
  completed: boolean;
  progress: number;
  prevProgress?: number;
}

export interface ITeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface IDocument {
  id: string;
  name: string;
  sizeMb: number;
  ext: string;
}

export interface ITask {
  id: string;
  title: string;
  desc: string;
  deadline: string;
  estimatedHours: number;
  spentHours: number;
  status: TaskStatus;
  assigneeId?: string;
  tag: string;
}

export interface IWorkLog {
  id: string;
  taskId: string;
  userId: string;
  date: string;
  hours: number;
  comment: string;
}

export interface IAppData {
  currentUser: IUser;
  project: IProject;
  stages: IStage[];
  teamPool: ITeamMember[];
  team: ITeamMember[];
  documents: IDocument[];
  tasks: ITask[];
  workLogs: IWorkLog[];
}