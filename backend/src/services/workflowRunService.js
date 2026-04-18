import { AppError } from "../lib/errors.js";
import { validateRunInput } from "../lib/validation.js";

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

export class WorkflowRunService {
  constructor(store, computeAdapter, storageAdapter, auditService, templateService) {
    this.store = store;
    this.computeAdapter = computeAdapter;
    this.storageAdapter = storageAdapter;
    this.auditService = auditService;
    this.templateService = templateService;
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
      const delegatedTasks = Array.isArray(plan.tasks) ? plan.tasks.slice(0, agent.policy.maxStepsPerRun) : [];
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

      let storageReceipt = {
        rootHash: null,
        txHash: null,
      };
      if (this.storageAdapter.canWriteDocuments()) {
        storageReceipt = await this.storageAdapter.writeDocument("workflow-run-trace", tracePayload);
      }

      const completedRun = await this.store.transaction((state) => {
        const existing = state.runs.find((item) => item.id === runId);
        if (!existing) {
          throw new AppError("Run not found during completion", {
            code: "run_not_found",
            statusCode: 404,
          });
        }

        existing.status = "completed";
        existing.output = executorOutput.finalOutput || "";
        existing.approvalRequired = Boolean(executorOutput.approvalRequired);
        existing.planSummary = plan.summary || "";
        existing.delegatedTasks = delegatedTasks;
        existing.runtime = runRequest.runtime;
        existing.compute = computeSummary;
        existing.storageRoot = storageReceipt.rootHash;
        existing.storageTxHash = storageReceipt.txHash;
        existing.tracePersistence =
          storageReceipt.rootHash || storageReceipt.txHash ? "zerog_storage" : "local_only";
        existing.updatedAt = new Date().toISOString();
        return existing;
      });

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
}
