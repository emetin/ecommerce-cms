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

function getResolvedRule(input: QuantityRuleInput) {
  const boxQuantity = toPositiveInteger(input.boxQuantity, 0);
  const caseQuantity = toPositiveInteger(input.caseQuantity, 0);

  const explicitMinQuantity = toPositiveInteger(input.minQuantity, 0);
  const packageQuantity = caseQuantity || boxQuantity || 1;

  const minQuantity = Math.max(
    explicitMinQuantity || packageQuantity,
    packageQuantity,
    1
  );

  const stepQuantity =
    toPositiveInteger(input.stepQuantity, 0) ||
    caseQuantity ||
    boxQuantity ||
    1;

  return {
    minQuantity,
    boxQuantity,
    caseQuantity,
    stepQuantity,
  };
}

function adjustQuantityToRule(
  quantity: number,
  rule: {
    minQuantity: number;
    stepQuantity: number;
  }
) {
  const minimum = Math.max(rule.minQuantity, 1);
  const step = Math.max(rule.stepQuantity, 1);

  const baseQuantity = Math.max(quantity, minimum);
  const remainder = (baseQuantity - minimum) % step;

  if (remainder === 0) {
    return baseQuantity;
  }

  return baseQuantity + (step - remainder);
}

function buildRuleMessage(rule: {
  minQuantity: number;
  boxQuantity: number;
  caseQuantity: number;
  stepQuantity: number;
}) {
  const parts: string[] = [];

  if (rule.minQuantity > 1) {
    parts.push(`Minimum quantity is ${rule.minQuantity}.`);
  }

  if (rule.caseQuantity > 1) {
    parts.push(`Orders must follow case increments of ${rule.caseQuantity}.`);
  } else if (rule.boxQuantity > 1) {
    parts.push(`Orders must follow box increments of ${rule.boxQuantity}.`);
  } else if (rule.stepQuantity > 1) {
    parts.push(`Orders must increase by ${rule.stepQuantity}.`);
  }

  return parts.join(" ");
}

export function resolveQuantityRule(
  input: QuantityRuleInput
): QuantityRuleResult {
  const rule = getResolvedRule(input);
  const requestedQuantity = normalizeQuantity(input.quantity, rule.minQuantity);

  const resolvedQuantity = adjustQuantityToRule(requestedQuantity, rule);
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
  const rule = getResolvedRule(input);
  const requestedQuantity = normalizeQuantity(input.quantity, rule.minQuantity);
  const resolvedQuantity = adjustQuantityToRule(requestedQuantity, rule);

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