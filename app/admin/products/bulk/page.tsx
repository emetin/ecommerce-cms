import BulkSpreadsheetEditor from "../../../../components/admin/BulkSpreadsheetEditor";

export default function AdminProductsBulkPage() {
  return (
    <BulkSpreadsheetEditor
      entity="products"
      backHref="/admin/products"
      newHref="/admin/products/new"
    />
  );
}