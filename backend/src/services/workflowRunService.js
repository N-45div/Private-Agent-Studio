import { AppError } from "../lib/errors.js";
import { validateRunInput } from "../lib/validation.js";

const TRACE_STORAGE_RETRY_DELAYS_MS = [2500, 7500, 15000];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPlannerPrompt(agent, runRequest) {
  return {
    systemPrompt:
      "You are the planner in a private multi-agent workflow. Return only JSON with keys summary, tasks, risks. tasks must be an array of {id, ownerRole, objective}. Respect privacy, approval, and max step limits.",
    payload: {
      agent: {
        id: agent.id,
        name: agent.name,
        templateId: agent.templateId,
        privacy: agent.privacy,
        policy: agent.policy,
      },
      objective: runRequest.objective,
      input: runRequest.input,
    },
  };
}

function buildSpecialistPrompt(agent, runRequest, plan) {
  return {
    systemPrompt:
      "You are a specialist agent in a private workflow. Return only JSON with keys summary, findings, nextAction. findings must be an array of concise strings.",
    payload: {
      agent: {
        id: agent.id,
        name: agent.name,
        templateId: agent.templateId,
        knowledge: agent.knowledge,
        privacy: agent.privacy,
      },
      objective: runRequest.objective,
      delegatedTasks: plan.tasks || [],
      input: runRequest.input,
    },
  };
}

function buildExecutorPrompt(agent, runRequest, plan, specialistOutput) {
  return {
    systemPrompt:
      "You are the executor in a private workflow. Return only JSON with keys finalOutput, suggestedActions, approvalRequired. suggestedActions must be an array of strings.",
    payload: {
      agent: {
        id: agent.id,
        name: agent.name,
        templateId: agent.templateId,
        policy: agent.policy,
      },
      objective: runRequest.objective,
      plan,
      specialistOutput,
      input: runRequest.input,
    },
  };
}

function normalizeRuntimeText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
}

function normalizeDelegatedTasks(tasks, maxSteps) {
  if (!Array.isArray(tasks)) {
    return [];
  }

  return tasks.slice(0, maxSteps).map((task, index) => {
    if (!task || typeof task !== "object" || Array.isArray(task)) {
      return {
        id: `task_${index + 1}`,
        ownerRole: "task",
        objective: normalizeRuntimeText(task),
      };
    }

    return {
      id: normalizeRuntimeText(task.id) || `task_${index + 1}`,
      ownerRole: normalizeRuntimeText(task.ownerRole) || "task",
      objective: normalizeRuntimeText(task.objective || task.summary || task),
    };
  });
}

export class WorkflowRunService {
  constructor(store, computeAdapter, storageAdapter, auditService, templateService) {
    this.store = store;
    this.computeAdapter = computeAdapter;
    this.storageAdapter = storageAdapter;
    this.auditService = auditService;
    this.templateService = templateService;
    this.traceSyncLock = Promise.resolve();
  }

  async getRun(runId) {
    const state = await this.store.readState();
    return state.runs.find((run) => run.id === runId) || null;
  }

  async startRun(agent, input) {
    const runRequest = validateRunInput(input);
    const template = this.templateService.getTemplate(agent.templateId);
    const runId = this.store.createId("run");
    const runSource = agent.status === "published" ? "published_package" : "draft_package";
    const executionOptions = {
      executionMode: runRequest.runtime.executionMode,
    };

    await this.store.transaction((state) => {
      state.runs.push({
        id: runId,
        agentId: agent.id,
        owner: agent.owner,
        templateId: agent.templateId,
        objective: runRequest.objective,
        runSource,
        credentialSource: runRequest.runtime.credentialSource,
        executionMode: runRequest.runtime.executionMode,
        providedSecretKeys: runRequest.runtime.providedSecretKeys,
        status: "running",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return null;
    });

    try {
      const plan = await this.computeAdapter.runStructuredJsonPrompt({
        ...buildPlannerPrompt(agent, runRequest),
        ...executionOptions,
      });
      const delegatedTasks = normalizeDelegatedTasks(plan.tasks, agent.policy.maxStepsPerRun);
      const specialistOutput = await this.computeAdapter.runStructuredJsonPrompt(
        {
          ...buildSpecialistPrompt(agent, runRequest, { ...plan, tasks: delegatedTasks }),
          ...executionOptions,
        },
      );
      const executorOutput = await this.computeAdapter.runStructuredJsonPrompt(
        {
          ...buildExecutorPrompt(agent, runRequest, { ...plan, tasks: delegatedTasks }, specialistOutput),
          ...executionOptions,
        },
      );

      const tracePayload = {
        runId,
        agentId: agent.id,
        runSource,
        template: {
          id: template.id,
          name: template.name,
        },
        objective: runRequest.objective,
        runtime: runRequest.runtime,
        planner: plan,
        delegatedTasks,
        specialist: specialistOutput,
        executor: executorOutput,
      };
      const computeSummary = {
        requestedExecutionMode: runRequest.runtime.executionMode,
        planner: plan.inference || null,
        specialist: specialistOutput.inference || null,
        executor: executorOutput.inference || null,
      };

      const completedRun = await this.store.transaction((state) => {
        const existing = state.runs.find((item) => item.id === runId);
        if (!existing) {
          throw new AppError("Run not found during completion", {
            code: "run_not_found",
            statusCode: 404,
          });
        }

        existing.status = "completed";
        existing.output = normalizeRuntimeText(executorOutput.finalOutput);
        existing.approvalRequired = Boolean(executorOutput.approvalRequired);
        existing.planSummary = normalizeRuntimeText(plan.summary);
        existing.delegatedTasks = delegatedTasks;
        existing.runtime = runRequest.runtime;
        existing.compute = computeSummary;
        existing.storageRoot = null;
        existing.storageTxHash = null;
        existing.tracePersistence = this.storageAdapter.canWriteDocuments()
          ? "zerog_storage_queued"
          : "local_only";
        existing.updatedAt = new Date().toISOString();
        return existing;
      });

      if (this.storageAdapter.canWriteDocuments()) {
        this.queueTraceStorage(runId, tracePayload);
      }

      await this.auditService.record("run.completed", agent.id, {
        runId,
        templateId: agent.templateId,
        storageRoot: completedRun.storageRoot,
        runSource,
        credentialSource: runRequest.runtime.credentialSource,
        executionMode: runRequest.runtime.executionMode,
        tracePersistence: completedRun.tracePersistence,
      });

      return completedRun;
    } catch (error) {
      await this.store.transaction((state) => {
        const existing = state.runs.find((item) => item.id === runId);
        if (existing) {
          existing.status = "failed";
          existing.error = error.message;
          existing.updatedAt = new Date().toISOString();
        }
        return existing || null;
      });

      throw error;
    }
  }

  queueTraceStorage(runId, tracePayload) {
    this.traceSyncLock = this.traceSyncLock
      .then(async () => {
        let storageReceipt = null;
        let lastError = null;

        for (let attempt = 0; attempt <= TRACE_STORAGE_RETRY_DELAYS_MS.length; attempt += 1) {
          try {
            storageReceipt = await this.storageAdapter.writeDocument(
              "workflow-run-trace",
              tracePayload,
              {
                finalityRequired: false,
              },
            );
            break;
          } catch (error) {
            lastError = error;
            const retryDelay = TRACE_STORAGE_RETRY_DELAYS_MS[attempt];
            if (retryDelay === undefined) {
              break;
            }
            console.warn(
              `Workflow trace storage retry ${attempt + 1}/${TRACE_STORAGE_RETRY_DELAYS_MS.length} scheduled`,
              error,
            );
            await delay(retryDelay);
          }
        }

        if (!storageReceipt) {
          throw lastError || new Error("Workflow trace storage failed");
        }

        await this.store.transaction((state) => {
          const existing = state.runs.find((item) => item.id === runId);
          if (!existing) {
            return null;
          }

          existing.storageRoot = storageReceipt.rootHash;
          existing.storageTxHash = storageReceipt.txHash;
          existing.tracePersistence = "zerog_storage";
          existing.updatedAt = new Date().toISOString();
          return existing;
        });
      })
      .catch((error) => {
        console.error("Workflow trace background storage failed", error);
        return this.store.transaction((state) => {
          const existing = state.runs.find((item) => item.id === runId);
          if (!existing) {
            return null;
          }

          existing.tracePersistence = "zerog_storage_failed";
          existing.traceStorageError = error.message;
          existing.updatedAt = new Date().toISOString();
          return existing;
        });
      });
  }
}
