export function createId(prefix = "id") {
  const random = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);

  return `${prefix}_${timestamp}_${random}`;
}

export function createToken(prefix = "token") {
  const a = Math.random().toString(36).slice(2, 10);
  const b = Math.random().toString(36).slice(2, 10);
  const c = Date.now().toString(36);

  return `${prefix}_${c}_${a}${b}`;
}

export function createOrderNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `GT-${yyyy}${mm}${dd}-${random}`;
}

export function nowIso() {
  return new Date().toISOString();
}