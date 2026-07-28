import { describe, expect, test } from "bun:test";
import {
  getProjectProgress,
  synchronizeProjectWithTasks,
  type Project,
} from "@/domain/projects";

const project: Project = {
  id: "11111111-1111-4111-8111-111111111111",
  code: "TEST",
  name: "Proyecto de prueba",
  summary: "Proyecto para verificar las reglas de progreso.",
  status: "active",
  health: "on_track",
  ownerPersonId: null,
  ownerName: null,
  startDate: "2026-01-01",
  targetDate: "2026-06-30",
  color: "#2563eb",
  memberIds: [],
  createdAt: "2026-01-01T09:00:00.000Z",
  updatedAt: "2026-01-01T09:00:00.000Z",
};

describe("project progress invariants", () => {
  test("marks a project as completed when every task is completed", () => {
    const tasks = [
      { projectId: project.id, status: "completed" },
      { projectId: project.id, status: "completed" },
    ];

    expect(getProjectProgress(project.id, tasks)).toBe(100);
    expect(synchronizeProjectWithTasks(project, tasks).status).toBe("completed");
  });

  test("reopens a completed project when it has unfinished work", () => {
    const tasks = [
      { projectId: project.id, status: "completed" },
      { projectId: project.id, status: "in_progress" },
    ];

    expect(
      synchronizeProjectWithTasks(
        { ...project, status: "completed" },
        tasks,
      ).status,
    ).toBe("active");
    expect(getProjectProgress(project.id, tasks)).toBeLessThanOrEqual(99);
  });

  test("never rounds unfinished work up to one hundred percent", () => {
    const tasks = Array.from({ length: 200 }, (_, index) => ({
      projectId: project.id,
      status: index === 199 ? "pending" : "completed",
    }));

    expect(getProjectProgress(project.id, tasks)).toBe(99);
  });
});
