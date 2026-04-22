export type BulkEditorColumnType =
  | "text"
  | "textarea"
  | "select"
  | "boolean"
  | "readonly";

export type BulkEditorColumnOption = {
  label: string;
  value: string;
};

export type BulkEditorColumn = {
  key: string;
  label: string;
  type: BulkEditorColumnType;
  editable: boolean;
  visibleByDefault: boolean;
  width?: number;
  placeholder?: string;
  options?: BulkEditorColumnOption[];
};

export type BulkEditorEntityConfig = {
  entity: string;
  title: string;
  description: string;
  sheetName: string;
  keyField: string;
  sortField?: string;
  columns: BulkEditorColumn[];
};

const BOOLEAN_OPTIONS: BulkEditorColumnOption[] = [
  { label: "TRUE", value: "TRUE" },
  { label: "FALSE", value: "FALSE" },
];

const PUBLISH_STATUS_OPTIONS: BulkEditorColumnOption[] = [
  { label: "published", value: "published" },
  { label: "draft", value: "draft" },
  { label: "archived", value: "archived" },
];

export const BULK_EDITOR_CONFIGS: Record<string, BulkEditorEntityConfig> = {
  products: {
    entity: "products",
    title: "Products Bulk Editor",
    description:
      "Edit product records in a spreadsheet-style interface with column visibility control and inline cell editing.",
    sheetName: "products",
    keyField: "slug",
    sortField: "updated_at",
    columns: [
      {
        key: "title",
        label: "Title",
        type: "text",
        editable: true,
        visibleByDefault: true,
        width: 280,
        placeholder: "Product title",
      },
      {
        key: "slug",
        label: "Slug",
        type: "readonly",
        editable: false,
        visibleByDefault: true,
        width: 220,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        editable: true,
        visibleByDefault: true,
        width: 140,
        options: PUBLISH_STATUS_OPTIONS,
      },
      {
        key: "featured",
        label: "Featured",
        type: "boolean",
        editable: true,
        visibleByDefault: true,
        width: 120,
        options: BOOLEAN_OPTIONS,
      },
      {
        key: "collection_slug",
        label: "Collection Slug",
        type: "text",
        editable: true,
        visibleByDefault: true,
        width: 180,
        placeholder: "collection-slug",
      },
      {
        key: "vendor",
        label: "Vendor",
        type: "text",
        editable: true,
        visibleByDefault: true,
        width: 180,
        placeholder: "Vendor",
      },
      {
        key: "product_category",
        label: "Product Category",
        type: "text",
        editable: true,
        visibleByDefault: true,
        width: 180,
        placeholder: "Category",
      },
      {
        key: "type",
        label: "Type",
        type: "text",
        editable: true,
        visibleByDefault: true,
        width: 160,
        placeholder: "Type",
      },
      {
        key: "tags",
        label: "Tags",
        type: "textarea",
        editable: true,
        visibleByDefault: true,
        width: 260,
        placeholder: "tag-1, tag-2",
      },
      {
        key: "short_description",
        label: "Short Description",
        type: "textarea",
        editable: true,
        visibleByDefault: true,
        width: 340,
        placeholder: "Short description",
      },
      {
        key: "seo_title",
        label: "SEO Title",
        type: "text",
        editable: true,
        visibleByDefault: false,
        width: 260,
        placeholder: "SEO title",
      },
      {
        key: "seo_description",
        label: "SEO Description",
        type: "textarea",
        editable: true,
        visibleByDefault: false,
        width: 320,
        placeholder: "SEO description",
      },
      {
        key: "image",
        label: "Main Image",
        type: "text",
        editable: true,
        visibleByDefault: false,
        width: 280,
        placeholder: "Image URL",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        editable: true,
        visibleByDefault: false,
        width: 360,
        placeholder: "Full description",
      },
      {
        key: "created_at",
        label: "Created At",
        type: "readonly",
        editable: false,
        visibleByDefault: false,
        width: 180,
      },
      {
        key: "updated_at",
        label: "Updated At",
        type: "readonly",
        editable: false,
        visibleByDefault: true,
        width: 180,
      },
    ],
  },

  collections: {
    entity: "collections",
    title: "Collections Bulk Editor",
    description:
      "Reusable config prepared for collection bulk editing.",
    sheetName: "collections",
    keyField: "slug",
    sortField: "updated_at",
    columns: [
      {
        key: "title",
        label: "Title",
        type: "text",
        editable: true,
        visibleByDefault: true,
      },
      {
        key: "slug",
        label: "Slug",
        type: "readonly",
        editable: false,
        visibleByDefault: true,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        editable: true,
        visibleByDefault: true,
        options: PUBLISH_STATUS_OPTIONS,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        editable: true,
        visibleByDefault: true,
      },
      {
        key: "image",
        label: "Image",
        type: "text",
        editable: true,
        visibleByDefault: false,
      },
      {
        key: "seo_title",
        label: "SEO Title",
        type: "text",
        editable: true,
        visibleByDefault: false,
      },
      {
        key: "seo_description",
        label: "SEO Description",
        type: "textarea",
        editable: true,
        visibleByDefault: false,
      },
      {
        key: "updated_at",
        label: "Updated At",
        type: "readonly",
        editable: false,
        visibleByDefault: true,
      },
    ],
  },

  blog: {
    entity: "blog",
    title: "Blog Bulk Editor",
    description:
      "Reusable config prepared for blog bulk editing.",
    sheetName: "blog",
    keyField: "slug",
    sortField: "updated_at",
    columns: [
      {
        key: "title",
        label: "Title",
        type: "text",
        editable: true,
        visibleByDefault: true,
      },
      {
        key: "slug",
        label: "Slug",
        type: "readonly",
        editable: false,
        visibleByDefault: true,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        editable: true,
        visibleByDefault: true,
        options: PUBLISH_STATUS_OPTIONS,
      },
      {
        key: "featured",
        label: "Featured",
        type: "boolean",
        editable: true,
        visibleByDefault: true,
        options: BOOLEAN_OPTIONS,
      },
      {
        key: "excerpt",
        label: "Excerpt",
        type: "textarea",
        editable: true,
        visibleByDefault: true,
      },
      {
        key: "content",
        label: "Content",
        type: "textarea",
        editable: true,
        visibleByDefault: false,
      },
      {
        key: "image",
        label: "Image",
        type: "text",
        editable: true,
        visibleByDefault: false,
      },
      {
        key: "updated_at",
        label: "Updated At",
        type: "readonly",
        editable: false,
        visibleByDefault: true,
      },
    ],
  },

  customers: {
    entity: "customers",
    title: "Customers Bulk Editor",
    description:
      "Reusable config prepared for customer bulk editing.",
    sheetName: "customers",
    keyField: "id",
    sortField: "updated_at",
    columns: [
      {
        key: "id",
        label: "ID",
        type: "readonly",
        editable: false,
        visibleByDefault: true,
      },
      {
        key: "first_name",
        label: "First Name",
        type: "text",
        editable: true,
        visibleByDefault: true,
      },
      {
        key: "last_name",
        label: "Last Name",
        type: "text",
        editable: true,
        visibleByDefault: true,
      },
      {
        key: "company",
        label: "Company",
        type: "text",
        editable: true,
        visibleByDefault: true,
      },
      {
        key: "email",
        label: "Email",
        type: "text",
        editable: true,
        visibleByDefault: true,
      },
      {
        key: "phone",
        label: "Phone",
        type: "text",
        editable: true,
        visibleByDefault: true,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        editable: true,
        visibleByDefault: true,
        options: [
          { label: "active", value: "active" },
          { label: "inactive", value: "inactive" },
        ],
      },
      {
        key: "price_tier",
        label: "Price Tier",
        type: "select",
        editable: true,
        visibleByDefault: true,
        options: [
          { label: "standard", value: "standard" },
          { label: "wholesale", value: "wholesale" },
          { label: "distributor", value: "distributor" },
          { label: "vip", value: "vip" },
        ],
      },
      {
        key: "currency",
        label: "Currency",
        type: "text",
        editable: true,
        visibleByDefault: false,
      },
      {
        key: "updated_at",
        label: "Updated At",
        type: "readonly",
        editable: false,
        visibleByDefault: true,
      },
    ],
  },
};

export function getBulkEditorConfig(entity: string): BulkEditorEntityConfig {
  const config = BULK_EDITOR_CONFIGS[entity];

  if (!config) {
    throw new Error(`Bulk editor config was not found for entity: ${entity}`);
  }

  return config;
}

export function getBulkEditorVisibleDefaultKeys(entity: string): string[] {
  const config = getBulkEditorConfig(entity);

  return config.columns
    .filter((column) => column.visibleByDefault)
    .map((column) => column.key);
}

export function getBulkEditorEditableKeys(entity: string): string[] {
  const config = getBulkEditorConfig(entity);

  return config.columns
    .filter((column) => column.editable)
    .map((column) => column.key);
}