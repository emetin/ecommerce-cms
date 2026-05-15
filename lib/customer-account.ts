import bcrypt from "bcryptjs";
import { createSupabaseAdminClient } from "./supabase/admin";

type CustomerRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  address_line_1: string;
  address_line_2: string;
  postal_code: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_login_at: string;
  tax_exempt: string;
  approved_at: string;
  company_id: string;
  customer_user_id: string;
  role: string;
  website: string;
  customer_type: string;
  payment_terms: string;
  currency: string;
};

type CustomerCompanyRow = {
  id: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  postal_code: string | null;
  status: string | null;
  notes: string | null;
  tax_id?: string | null;
  customer_type?: string | null;
  payment_terms?: string | null;
  currency?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CustomerUserWithCompany = {
  id: string;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string | null;
  status: string | null;
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  customer_companies?: CustomerCompanyRow | CustomerCompanyRow[] | null;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function buildFullName(firstName?: string | null, lastName?: string | null) {
  return [normalizeText(firstName), normalizeText(lastName)]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeCompanyRelation(
  value: CustomerCompanyRow | CustomerCompanyRow[] | null | undefined
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function mapCustomerUser(row: CustomerUserWithCompany): CustomerRow {
  const company = normalizeCompanyRelation(row.customer_companies);

  return {
    id: normalizeText(row.id),
    customer_user_id: normalizeText(row.id),
    company_id: normalizeText(row.company_id),
    email: normalizeLower(row.email),
    first_name: normalizeText(row.first_name),
    last_name: normalizeText(row.last_name),
    company: normalizeText(company?.company_name),
    phone: normalizeText(row.phone || company?.phone),
    country: normalizeText(company?.country),
    state: normalizeText(company?.state),
    city: normalizeText(company?.city),
    address_line_1: normalizeText(company?.address_line_1),
    address_line_2: normalizeText(company?.address_line_2),
    postal_code: normalizeText(company?.postal_code),
    status: normalizeText(row.status),
    created_at: normalizeText(row.created_at),
    updated_at: normalizeText(row.updated_at),
    last_login_at: normalizeText(row.last_login_at),
    tax_exempt: "false",
    approved_at: normalizeText(row.created_at),
    role: normalizeText(row.role),
    website: normalizeText(company?.website),
    customer_type: normalizeText(company?.customer_type),
    payment_terms: normalizeText(company?.payment_terms),
    currency: normalizeText(company?.currency || "USD") || "USD",
  };
}

export function sanitizeCustomer(customer: CustomerRow) {
  return {
    id: normalizeText(customer.id),
    customer_user_id: normalizeText(customer.customer_user_id),
    company_id: normalizeText(customer.company_id),
    email: normalizeLower(customer.email),
    first_name: normalizeText(customer.first_name),
    last_name: normalizeText(customer.last_name),
    company: normalizeText(customer.company),
    phone: normalizeText(customer.phone),
    country: normalizeText(customer.country),
    state: normalizeText(customer.state),
    city: normalizeText(customer.city),
    address_line_1: normalizeText(customer.address_line_1),
    address_line_2: normalizeText(customer.address_line_2),
    postal_code: normalizeText(customer.postal_code),
    status: normalizeText(customer.status),
    created_at: normalizeText(customer.created_at),
    updated_at: normalizeText(customer.updated_at),
    last_login_at: normalizeText(customer.last_login_at),
    tax_exempt: normalizeText(customer.tax_exempt),
    approved_at: normalizeText(customer.approved_at),
    role: normalizeText(customer.role),
    website: normalizeText(customer.website),
    customer_type: normalizeText(customer.customer_type),
    payment_terms: normalizeText(customer.payment_terms),
    currency: normalizeText(customer.currency || "USD") || "USD",
  };
}

export async function findCustomerByEmail(email: string) {
  const normalizedEmail = normalizeLower(email);

  if (!normalizedEmail) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("customer_users")
    .select(
      `
      id,
      company_id,
      first_name,
      last_name,
      email,
      phone,
      role,
      status,
      last_login_at,
      created_at,
      updated_at,
      customer_companies (
        id,
        company_name,
        email,
        phone,
        website,
        country,
        state,
        city,
        address_line_1,
        address_line_2,
        postal_code,
        status,
        notes,
        tax_id,
        customer_type,
        payment_terms,
        currency,
        created_at,
        updated_at
      )
    `
    )
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const customer = data as unknown as CustomerUserWithCompany;

  return mapCustomerUser(customer);
}

export async function findCustomerById(id: string) {
  const normalizedId = normalizeText(id);

  if (!normalizedId) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("customer_users")
    .select(
      `
      id,
      company_id,
      first_name,
      last_name,
      email,
      phone,
      role,
      status,
      last_login_at,
      created_at,
      updated_at,
      customer_companies (
        id,
        company_name,
        email,
        phone,
        website,
        country,
        state,
        city,
        address_line_1,
        address_line_2,
        postal_code,
        status,
        notes,
        tax_id,
        customer_type,
        payment_terms,
        currency,
        created_at,
        updated_at
      )
    `
    )
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const customer = data as unknown as CustomerUserWithCompany;

  return mapCustomerUser(customer);
}

export async function createCustomerAccount(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  company?: string;
  phone?: string;
  country?: string;
  city?: string;
  address_line_1?: string;
  address_line_2?: string;
  postal_code?: string;
}) {
  const email = normalizeLower(input.email);
  const firstName = normalizeText(input.first_name);
  const lastName = normalizeText(input.last_name);
  const company = normalizeText(input.company);
  const phone = normalizeText(input.phone);
  const country = normalizeText(input.country);
  const city = normalizeText(input.city);
  const addressLine1 = normalizeText(input.address_line_1);
  const addressLine2 = normalizeText(input.address_line_2);
  const postalCode = normalizeText(input.postal_code);
  const password = normalizeText(input.password);

  if (!email || !password || !firstName || !lastName) {
    throw new Error("Ad, soyad, e-posta ve şifre zorunludur.");
  }

  if (password.length < 8) {
    throw new Error("Şifre en az 8 karakter olmalıdır.");
  }

  const existing = await findCustomerByEmail(email);

  if (existing) {
    throw new Error("Bu e-posta adresi ile kayıtlı bir hesap zaten var.");
  }

  const supabase = createSupabaseAdminClient();
  const timestamp = nowIso();
  const passwordHash = await bcrypt.hash(password, 10);
  const fullName = buildFullName(firstName, lastName);

  const { data: companyRecord, error: companyError } = await supabase
    .from("customer_companies")
    .insert({
      company_name: company || fullName,
      email,
      phone,
      country,
      city,
      address_line_1: addressLine1,
      address_line_2: addressLine2,
      postal_code: postalCode,
      status: "active",
      source: "member_portal",
      currency: "USD",
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select("*")
    .single();

  if (companyError) {
    throw new Error(companyError.message);
  }

  const { data: userRecord, error: userError } = await supabase
    .from("customer_users")
    .insert({
      company_id: companyRecord.id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      role: "Customer",
      password_hash: passwordHash,
      status: "active",
      last_login_at: timestamp,
      is_primary: true,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select(
      `
      id,
      company_id,
      first_name,
      last_name,
      email,
      phone,
      role,
      status,
      last_login_at,
      created_at,
      updated_at,
      customer_companies (
        id,
        company_name,
        email,
        phone,
        website,
        country,
        state,
        city,
        address_line_1,
        address_line_2,
        postal_code,
        status,
        notes,
        tax_id,
        customer_type,
        payment_terms,
        currency,
        created_at,
        updated_at
      )
    `
    )
    .single();

  if (userError) {
    throw new Error(userError.message);
  }

  if (addressLine1) {
    await supabase.from("customer_addresses").insert({
      company_id: companyRecord.id,
      user_id: userRecord.id,
      address_type: "shipping",
      company_name: company || fullName,
      contact_name: fullName,
      phone,
      address_line_1: addressLine1,
      address_line_2: addressLine2,
      city,
      postal_code: postalCode,
      country,
      is_default: true,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }

  const customer = userRecord as unknown as CustomerUserWithCompany;

  return mapCustomerUser(customer);
}

export async function touchCustomerLogin(customerId: string) {
  const normalizedId = normalizeText(customerId);

  if (!normalizedId) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("customer_users")
    .update({
      last_login_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", normalizedId);

  if (error) {
    throw new Error(error.message);
  }

  return findCustomerById(normalizedId);
}

export async function updateCustomerProfile(
  customerId: string,
  updates: {
    first_name?: string;
    last_name?: string;
    company?: string;
    phone?: string;
    country?: string;
    city?: string;
    address_line_1?: string;
    address_line_2?: string;
    postal_code?: string;
  }
) {
  const customer = await findCustomerById(customerId);

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const supabase = createSupabaseAdminClient();
  const timestamp = nowIso();

  const firstName =
    updates.first_name !== undefined
      ? normalizeText(updates.first_name)
      : customer.first_name;

  const lastName =
    updates.last_name !== undefined
      ? normalizeText(updates.last_name)
      : customer.last_name;

  const phone =
    updates.phone !== undefined ? normalizeText(updates.phone) : customer.phone;

  const company =
    updates.company !== undefined
      ? normalizeText(updates.company)
      : customer.company;

  const country =
    updates.country !== undefined
      ? normalizeText(updates.country)
      : customer.country;

  const city =
    updates.city !== undefined ? normalizeText(updates.city) : customer.city;

  const addressLine1 =
    updates.address_line_1 !== undefined
      ? normalizeText(updates.address_line_1)
      : customer.address_line_1;

  const addressLine2 =
    updates.address_line_2 !== undefined
      ? normalizeText(updates.address_line_2)
      : customer.address_line_2;

  const postalCode =
    updates.postal_code !== undefined
      ? normalizeText(updates.postal_code)
      : customer.postal_code;

  const { error: userError } = await supabase
    .from("customer_users")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone,
      updated_at: timestamp,
    })
    .eq("id", customer.id);

  if (userError) {
    throw new Error(userError.message);
  }

  if (customer.company_id) {
    const fullName = buildFullName(firstName, lastName);

    const { error: companyError } = await supabase
      .from("customer_companies")
      .update({
        company_name: company || fullName,
        phone,
        country,
        city,
        address_line_1: addressLine1,
        address_line_2: addressLine2,
        postal_code: postalCode,
        updated_at: timestamp,
      })
      .eq("id", customer.company_id);

    if (companyError) {
      throw new Error(companyError.message);
    }

    const { data: existingAddress } = await supabase
      .from("customer_addresses")
      .select("id")
      .eq("company_id", customer.company_id)
      .eq("is_default", true)
      .maybeSingle();

    if (addressLine1) {
      if (existingAddress?.id) {
        await supabase
          .from("customer_addresses")
          .update({
            company_name: company || fullName,
            contact_name: fullName,
            phone,
            address_line_1: addressLine1,
            address_line_2: addressLine2,
            city,
            postal_code: postalCode,
            country,
            updated_at: timestamp,
          })
          .eq("id", existingAddress.id);
      } else {
        await supabase.from("customer_addresses").insert({
          company_id: customer.company_id,
          user_id: customer.id,
          address_type: "shipping",
          company_name: company || fullName,
          contact_name: fullName,
          phone,
          address_line_1: addressLine1,
          address_line_2: addressLine2,
          city,
          postal_code: postalCode,
          country,
          is_default: true,
          created_at: timestamp,
          updated_at: timestamp,
        });
      }
    }
  }

  return findCustomerById(customer.id);
}