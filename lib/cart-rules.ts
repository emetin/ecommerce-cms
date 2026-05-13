export type QuantityRuleInput = {
  quantity: number;
  minQuantity?: number;
  boxQuantity?: number;
  caseQuantity?: number;
  stepQuantity?: number;
};

export type QuantityRuleResult = {
  quantity: number;
  minQuantity: number;
  boxQuantity: number;
  caseQuantity: number;
  stepQuantity: number;
  adjusted: boolean;
  message: string;
};

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const floored = Math.floor(parsed);

  return floored > 0 ? floored : fallback;
}

function getQuantityRule(input: QuantityRuleInput) {
  const rawMinQuantity = toPositiveInteger(input.minQuantity, 1);
  const boxQuantity = toPositiveInteger(input.boxQuantity, 0);
  const caseQuantity = toPositiveInteger(input.caseQuantity, 0);

  const stepQuantity =
    toPositiveInteger(input.stepQuantity, 0) ||
    caseQuantity ||
    boxQuantity ||
    rawMinQuantity ||
    1;

  const minQuantity =
    caseQuantity > 0
      ? Math.max(rawMinQuantity, caseQuantity)
      : boxQuantity > 0
        ? Math.max(rawMinQuantity, boxQuantity)
        : rawMinQuantity;

  return {
    minQuantity,
    boxQuantity,
    caseQuantity,
    stepQuantity,
  };
}

function normalizeQuantity(quantity: unknown, fallback: number) {
  const parsed = Number(quantity);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const floored = Math.floor(parsed);

  return floored > 0 ? floored : fallback;
}

function isValidStepQuantity(
  quantity: number,
  rule: {
    minQuantity: number;
    stepQuantity: number;
  }
) {
  if (quantity < rule.minQuantity) {
    return false;
  }

  return quantity % rule.stepQuantity === 0;
}

function adjustQuantityToRule(
  quantity: number,
  rule: {
    minQuantity: number;
    stepQuantity: number;
  }
) {
  const baseQuantity = Math.max(quantity, rule.minQuantity);
  const remainder = baseQuantity % rule.stepQuantity;

  if (remainder === 0) {
    return baseQuantity;
  }

  return baseQuantity + (rule.stepQuantity - remainder);
}

function buildRuleMessage(rule: {
  minQuantity: number;
  boxQuantity: number;
  caseQuantity: number;
  stepQuantity: number;
}) {
  if (rule.caseQuantity > 0) {
    return `Quantity must be ordered in case multiples of ${rule.caseQuantity}.`;
  }

  if (rule.boxQuantity > 0) {
    return `Quantity must be ordered in box multiples of ${rule.boxQuantity}.`;
  }

  if (rule.stepQuantity > 1) {
    return `Quantity must be ordered in increments of ${rule.stepQuantity}.`;
  }

  if (rule.minQuantity > 1) {
    return `Minimum quantity is ${rule.minQuantity}.`;
  }

  return "";
}

export function resolveQuantityRule(
  input: QuantityRuleInput
): QuantityRuleResult {
  const rule = getQuantityRule(input);

  const requestedQuantity = normalizeQuantity(input.quantity, rule.minQuantity);
  const resolvedQuantity = adjustQuantityToRule(requestedQuantity, rule);

  return {
    quantity: resolvedQuantity,
    minQuantity: rule.minQuantity,
    boxQuantity: rule.boxQuantity,
    caseQuantity: rule.caseQuantity,
    stepQuantity: rule.stepQuantity,
    adjusted: resolvedQuantity !== requestedQuantity,
    message:
      resolvedQuantity !== requestedQuantity ? buildRuleMessage(rule) : "",
  };
}

export function assertValidQuantityRule(
  input: QuantityRuleInput
): QuantityRuleResult {
  const rule = getQuantityRule(input);
  const requestedQuantity = normalizeQuantity(input.quantity, rule.minQuantity);

  if (requestedQuantity < rule.minQuantity) {
    throw new Error(`Minimum quantity for this item is ${rule.minQuantity}.`);
  }

  if (!isValidStepQuantity(requestedQuantity, rule)) {
    throw new Error(buildRuleMessage(rule));
  }

  return {
    quantity: requestedQuantity,
    minQuantity: rule.minQuantity,
    boxQuantity: rule.boxQuantity,
    caseQuantity: rule.caseQuantity,
    stepQuantity: rule.stepQuantity,
    adjusted: false,
    message: "",
  };
}