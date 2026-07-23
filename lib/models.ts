import type { ObjectId } from "mongodb";

export type WorkType =
  | "BD"
  | "Marketing"
  | "Design"
  | "Frontend"
  | "Backend"
  | "Research"
  | "Ops"
  | "none";

export type TaskType = "Idea" | "Task" | "Bug";

export type TicketStatus =
  | "backlog"
  | "todo"
  | "blocked"
  | "in_progress"
  | "testing"
  | "done";

export type Priority = "none" | "low" | "med" | "high" | "urgent";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  blocked: "Blocked",
  in_progress: "In Progress",
  testing: "Testing",
  done: "Done",
};

export interface TicketLink {
  label: string;
  url: string;
}

export interface GithubRef {
  repo: string;
  prNumber: number;
  branch: string;
}

export interface Ticket {
  _id?: ObjectId;
  key: string;
  title: string;
  description: string;
  workType: WorkType;
  taskType: TaskType;
  status: TicketStatus;
  priority: Priority;
  labels: string[];
  owners: string[];
  dueDate: string | null;
  links: TicketLink[];
  related: string[];
  isPublic: boolean;
  githubRef: GithubRef | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export type UserRole = "founder" | "member";

export interface User {
  _id?: ObjectId;
  discordId: string;
  username: string;
  avatar: string | null;
  role: UserRole;
}

export interface Counter {
  _id: string;
  seq: number;
}
