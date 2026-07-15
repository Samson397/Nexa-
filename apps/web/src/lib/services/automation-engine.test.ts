import { beforeEach, describe, expect, it } from "vitest";
import { NexaError } from "@nexa/shared";
import { demoStore } from "@/lib/demo-store";
import { createAutomation } from "@/lib/services/automations";
import {
  approveRun,
  enqueueRun,
  executeRun,
} from "@/lib/services/automation-engine";

const WORKSPACE = "00000000-0000-4000-8000-000000000001";
const USER = "00000000-0000-4000-8000-000000000002";

beforeEach(() => {
  delete process.env.DATABASE_URL;
  demoStore.automations().length = 0;
  demoStore.tasks().length = 0;
  demoStore.auditEntries().length = 0;
});

describe("automation-engine", () => {
  it("keeps sensitive runs pending until approve before execute", async () => {
    const { automation } = await createAutomation({
      workspaceId: WORKSPACE,
      createdById: USER,
      name: "Send email flow",
      approvalMode: "sensitive_only",
      trigger: { type: "manual" },
      steps: [
        {
          id: "s1",
          type: "send_email",
          config: { to: "a@b.com", subject: "Hi", body: "Hello" },
        },
      ],
    });

    const enqueued = await enqueueRun({
      automationId: automation.id,
      workspaceId: WORKSPACE,
    });
    expect(enqueued.run.status).toBe("pending_approval");

    await expect(
      executeRun({
        automationId: automation.id,
        runId: enqueued.run.id,
      }),
    ).rejects.toMatchObject({
      code: "APPROVAL_REQUIRED",
    } satisfies Partial<NexaError>);

    const approved = await approveRun({
      automationId: automation.id,
      runId: enqueued.run.id,
      approvedById: USER,
      note: "ok to send",
    });
    expect(approved.run.status).toBe("approved");

    const executed = await executeRun({
      automationId: automation.id,
      runId: enqueued.run.id,
    });
    expect(executed.run.status).toBe("succeeded");
    const steps = (executed.run.result as { steps?: Array<{ type: string; status: string }> })
      ?.steps;
    expect(steps?.[0]?.type).toBe("send_email");
    expect(steps?.[0]?.status).toBe("succeeded");
  });

  it("executes notify, create_task, and log without approval", async () => {
    const { automation } = await createAutomation({
      workspaceId: WORKSPACE,
      createdById: USER,
      name: "Safe ops",
      approvalMode: "sensitive_only",
      trigger: { type: "schedule" },
      steps: [
        { id: "log1", type: "log", config: { message: "start" } },
        {
          id: "notify1",
          type: "notify",
          config: { title: "Ping", body: "done" },
        },
        {
          id: "task1",
          type: "create_task",
          config: { title: "Follow up", priority: "high" },
        },
      ],
    });

    const enqueued = await enqueueRun({
      automationId: automation.id,
      workspaceId: WORKSPACE,
    });
    expect(enqueued.run.status).toBe("approved");

    const executed = await executeRun({
      automationId: automation.id,
      runId: enqueued.run.id,
    });
    expect(executed.run.status).toBe("succeeded");

    const steps = (
      executed.run.result as {
        steps: Array<{
          type: string;
          status: string;
          output?: Record<string, unknown>;
        }>;
      }
    ).steps;

    expect(steps.map((s) => s.type)).toEqual([
      "log",
      "notify",
      "create_task",
    ]);
    expect(steps.every((s) => s.status === "succeeded")).toBe(true);
    expect(steps[0]?.output).toMatchObject({ logged: true });
    expect(steps[1]?.output).toMatchObject({ notified: true, title: "Ping" });
    expect(steps[2]?.output?.taskId).toEqual(expect.any(String));

    const tasks = demoStore
      .tasks()
      .filter((t) => t.workspaceId === WORKSPACE);
    expect(tasks.some((t) => t.title === "Follow up")).toBe(true);
  });
});
