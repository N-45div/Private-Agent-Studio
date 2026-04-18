import { isAddress, isHexString } from "ethers";
import { AppError } from "./errors.js";

function assert(condition, message, details) {
  if (!condition) {
    throw new AppError(message, {
      code: "validation_error",
      statusCode: 400,
      details,
    });
  }
}

function normalizeOptionalString(value, fieldName) {
  if (value === undefined || value === null) {
    return "";
  }

  assert(typeof value === "string", `${fieldName} must be a string`, { fieldName });
  return value.trim();
}

function optionalString(value, fieldName) {
  if (value === undefined || value === null) {
    return "";
  }

  assert(typeof value === "string", `${fieldName} must be a string`, { fieldName });
  return value.trim();
}

export function requireString(value, fieldName) {
  assert(typeof value === "string" && value.trim().length > 0, `${fieldName} is required`, {
    fieldName,
  });
  return value.trim();
}

export function requireAddress(value, fieldName) {
  const address = requireString(value, fieldName);
  assert(isAddress(address), `${fieldName} must be a valid EVM address`, { fieldName });
  return address;
}

export function requireBytes32Hex(value, fieldName) {
  const hex = requireString(value, fieldName);
  assert(isHexString(hex, 32), `${fieldName} must be a 32-byte hex string`, { fieldName });
  return hex;
}

export function uniqueAddressList(values, fieldName) {
  if (values === undefined) {
    return [];
  }

  assert(Array.isArray(values), `${fieldName} must be an array`, { fieldName });
  return [...new Set(values.map((value) => requireAddress(value, fieldName)))];
}

export function stringList(values, fieldName) {
  if (values === undefined) {
    return [];
  }

  assert(Array.isArray(values), `${fieldName} must be an array`, { fieldName });
  return [...new Set(values.map((value) => requireString(value, fieldName)))];
}

export function validateCreateAgentInput(input, templateIds) {
  assert(input && typeof input === "object", "Request body must be an object");

  const templateId = requireString(input.templateId, "templateId");
  assert(templateIds.includes(templateId), "templateId is not supported", {
    templateId,
    supportedTemplates: templateIds,
  });

  const visibility = input.privacy?.visibility || "private";
  const dataSensitivity = input.privacy?.dataSensitivity || "restricted";
  const exportability = input.privacy?.exportability || "owner_authorized";
  const approvalMode = input.policy?.approvalMode || "human_for_external_actions";
  const maxStepsPerRun = Number(input.policy?.maxStepsPerRun ?? 5);

  assert(["private", "team_private"].includes(visibility), "privacy.visibility is not supported", {
    visibility,
  });
  assert(
    ["restricted", "confidential", "regulated"].includes(dataSensitivity),
    "privacy.dataSensitivity is not supported",
    { dataSensitivity },
  );
  assert(
    ["non_exportable", "owner_authorized", "licensable"].includes(exportability),
    "privacy.exportability is not supported",
    { exportability },
  );
  assert(
    ["manual", "human_for_external_actions", "policy_gated"].includes(approvalMode),
    "policy.approvalMode is not supported",
    { approvalMode },
  );
  assert(Number.isFinite(maxStepsPerRun) && maxStepsPerRun > 0 && maxStepsPerRun <= 12, "policy.maxStepsPerRun must be between 1 and 12", {
    maxStepsPerRun,
  });

  return {
    name: requireString(input.name, "name"),
    owner: requireAddress(input.owner, "owner"),
    templateId,
    description: normalizeOptionalString(input.description, "description"),
    collaborators: uniqueAddressList(input.collaborators, "collaborators"),
    privacy: {
      visibility,
      dataSensitivity,
      exportability,
    },
    knowledge: {
      sources: stringList(input.knowledge?.sources, "knowledge.sources"),
    },
    policy: {
      approvalMode,
      allowDelegation: input.policy?.allowDelegation !== false,
      maxStepsPerRun,
    },
  };
}

export function validateRunInput(input) {
  assert(input && typeof input === "object", "Request body must be an object");

  const objective = requireString(input.objective, "objective");
  assert(objective.length <= 500, "objective must be 500 characters or fewer", { objective });
  assert(input.input === undefined || typeof input.input === "object", "input must be an object");
  assert(input.runtime === undefined || typeof input.runtime === "object", "runtime must be an object");

  const credentialSource =
    optionalString(input.runtime?.credentialSource, "runtime.credentialSource") || "user_runtime";
  const executionMode =
    optionalString(input.runtime?.executionMode, "runtime.executionMode") || "auto";
  const providedSecretKeys = stringList(
    input.runtime?.providedSecretKeys,
    "runtime.providedSecretKeys",
  );

  assert(
    ["user_runtime", "workspace_secret", "platform_managed"].includes(credentialSource),
    "runtime.credentialSource is not supported",
    { credentialSource },
  );
  assert(
    ["auto", "zerog_broker", "zerog_direct_api"].includes(executionMode),
    "runtime.executionMode is not supported",
    { executionMode },
  );

  return {
    objective,
    input: input.input || {},
    runtime: {
      credentialSource,
      executionMode,
      providedSecretKeys,
    },
  };
}

export function validateConfirmPublishInput(input, expectedOwner, expectedPackageHash) {
  assert(input && typeof input === "object", "Request body must be an object");

  const publisher = requireAddress(input.publisher, "publisher");
  assert(
    publisher.toLowerCase() === expectedOwner.toLowerCase(),
    "publisher must match the agent owner",
    { publisher, expectedOwner },
  );

  const packageHash = requireString(input.packageHash, "packageHash");
  assert(packageHash === expectedPackageHash, "packageHash does not match the current draft", {
    packageHash,
    expectedPackageHash,
  });

  const publishMode = requireString(input.publishMode, "publishMode");
  assert(
    ["user_wallet_storage", "user_wallet_storage_and_chain"].includes(publishMode),
    "publishMode is not supported",
    { publishMode },
  );

  return {
    publisher,
    packageHash,
    publishMode,
    storageRoot: requireString(input.storageRoot, "storageRoot"),
    storageTxHash: optionalString(input.storageTxHash, "storageTxHash"),
    chainTxHash: optionalString(input.chainTxHash, "chainTxHash"),
    encryptionScheme: optionalString(input.encryptionScheme, "encryptionScheme") || "user_managed",
    signature: optionalString(input.signature, "signature"),
  };
}

export function validateConfirmOnchainRegistrationInput(
  input,
  expectedOwner,
  expectedPackageHash,
  expectedStorageRoot,
) {
  assert(input && typeof input === "object", "Request body must be an object");

  const registrant = requireAddress(input.registrant, "registrant");
  assert(
    registrant.toLowerCase() === expectedOwner.toLowerCase(),
    "registrant must match the agent owner",
    { registrant, expectedOwner },
  );

  const packageHash = requireBytes32Hex(input.packageHash, "packageHash");
  assert(packageHash === expectedPackageHash, "packageHash does not match the current agent package", {
    packageHash,
    expectedPackageHash,
  });

  const storageRoot = requireBytes32Hex(input.storageRoot, "storageRoot");
  assert(storageRoot === expectedStorageRoot, "storageRoot does not match the published package", {
    storageRoot,
    expectedStorageRoot,
  });

  return {
    registrant,
    packageHash,
    storageRoot,
    chainTxHash: requireString(input.chainTxHash, "chainTxHash"),
    registryAddress: requireAddress(input.registryAddress, "registryAddress"),
    registrationMode:
      optionalString(input.registrationMode, "registrationMode") || "user_wallet_registry",
  };
}

function normalizeUnixTimestamp(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const numeric = Number(value);
  assert(Number.isInteger(numeric) && numeric >= 0, `${fieldName} must be a unix timestamp`, {
    fieldName,
    value,
  });
  return numeric;
}

export function validateAuthorizationIntentInput(input) {
  assert(input && typeof input === "object", "Request body must be an object");

  const accessMode = optionalString(input.accessMode, "accessMode") || "authorized_use";
  assert(
    ["authorized_use", "licensed_api", "licensed_mcp"].includes(accessMode),
    "accessMode is not supported",
    { accessMode },
  );

  const capabilities = stringList(input.capabilities, "capabilities");
  assert(capabilities.length > 0, "capabilities must contain at least one capability");

  return {
    grantee: requireAddress(input.grantee, "grantee"),
    label: optionalString(input.label, "label"),
    accessMode,
    capabilities,
    expiresAt: normalizeUnixTimestamp(input.expiresAt, "expiresAt"),
  };
}

export function validateConfirmAuthorizationInput(input, expectedOwner, expectedScopeHash) {
  assert(input && typeof input === "object", "Request body must be an object");

  const authorizer = requireAddress(input.authorizer, "authorizer");
  assert(
    authorizer.toLowerCase() === expectedOwner.toLowerCase(),
    "authorizer must match the agent owner",
    { authorizer, expectedOwner },
  );

  const scopeHash = requireBytes32Hex(input.scopeHash, "scopeHash");
  assert(scopeHash === expectedScopeHash, "scopeHash does not match the prepared authorization", {
    scopeHash,
    expectedScopeHash,
  });

  return {
    authorizer,
    scopeHash,
    chainTxHash: requireString(input.chainTxHash, "chainTxHash"),
    registryAddress: requireAddress(input.registryAddress, "registryAddress"),
  };
}

export function validateVaultPolicy(policy) {
  assert(policy && typeof policy === "object", "policy must be an object");

  const reserveRatio = Number(policy.reserveRatio);
  const maxTradeUsd = Number(policy.maxTradeUsd);
  const autoExecuteThresholdUsd = Number(policy.autoExecuteThresholdUsd);
  const dailySpendLimitUsd = Number(policy.dailySpendLimitUsd);
  const allowedTokens = stringList(policy.allowedTokens, "allowedTokens");
  const allowedProtocols = stringList(policy.allowedProtocols, "allowedProtocols");

  assert(Number.isFinite(reserveRatio) && reserveRatio >= 0 && reserveRatio <= 1, "reserveRatio must be between 0 and 1", {
    reserveRatio,
  });
  assert(Number.isFinite(maxTradeUsd) && maxTradeUsd >= 0, "maxTradeUsd must be a non-negative number", {
    maxTradeUsd,
  });
  assert(
    Number.isFinite(autoExecuteThresholdUsd) && autoExecuteThresholdUsd >= 0,
    "autoExecuteThresholdUsd must be a non-negative number",
    { autoExecuteThresholdUsd },
  );
  assert(
    Number.isFinite(dailySpendLimitUsd) && dailySpendLimitUsd >= 0,
    "dailySpendLimitUsd must be a non-negative number",
    { dailySpendLimitUsd },
  );
  assert(allowedTokens.length > 0, "allowedTokens must contain at least one token");
  assert(allowedProtocols.length > 0, "allowedProtocols must contain at least one protocol");

  return {
    reserveRatio,
    maxTradeUsd,
    autoExecuteThresholdUsd,
    dailySpendLimitUsd,
    allowedTokens,
    allowedProtocols,
  };
}

export function validateVaultPolicyPatch(policyPatch, currentPolicy) {
  assert(policyPatch && typeof policyPatch === "object", "policy patch must be an object");
  return validateVaultPolicy({
    ...currentPolicy,
    ...policyPatch,
  });
}
