export type QuantityRuleInput = {
  quantity: number;
  minQuantity?: number | string | null;
  boxQuantity?: number | string | null;
  caseQuantity?: number | string | null;
  stepQuantity?: number | string | null;
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

function normalizeQuantity(quantity: unknown, fallback: number) {
  const parsed = Number(quantity);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const floored = Math.floor(parsed);

  return floored > 0 ? floored : fallback;
}

function getBoxBasedRule(input: QuantityRuleInput) {
  const boxQuantity = toPositiveInteger(input.boxQuantity, 1);

  return {
    minQuantity: boxQuantity,
    boxQuantity,
    caseQuantity: 0,
    stepQuantity: boxQuantity,
  };
}

function adjustQuantityToBoxMultiple(
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

function buildRuleMessage(rule: { boxQuantity: number }) {
  if (rule.boxQuantity > 1) {
    return `Quantity must be ordered in box multiples of ${rule.boxQuantity}.`;
  }

  return "";
}

export function resolveQuantityRule(
  input: QuantityRuleInput
): QuantityRuleResult {
  const rule = getBoxBasedRule(input);
  const requestedQuantity = normalizeQuantity(input.quantity, rule.minQuantity);
  const resolvedQuantity = adjustQuantityToBoxMultiple(
    requestedQuantity,
    rule
  );

  const adjusted = resolvedQuantity !== requestedQuantity;

  return {
    quantity: resolvedQuantity,
    minQuantity: rule.minQuantity,
    boxQuantity: rule.boxQuantity,
    caseQuantity: rule.caseQuantity,
    stepQuantity: rule.stepQuantity,
    adjusted,
    message: adjusted ? buildRuleMessage(rule) : "",
  };
}

export function assertValidQuantityRule(
  input: QuantityRuleInput
): QuantityRuleResult {
  const rule = getBoxBasedRule(input);
  const requestedQuantity = normalizeQuantity(input.quantity, rule.minQuantity);
  const resolvedQuantity = adjustQuantityToBoxMultiple(
    requestedQuantity,
    rule
  );

  if (requestedQuantity < rule.minQuantity) {
    throw new Error(`Minimum quantity for this item is ${rule.minQuantity}.`);
  }

  if (requestedQuantity !== resolvedQuantity) {
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