"use client";

import { useEffect, useMemo, useState } from "react";

type ProductItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  image: string;
  image_file_id: string;
  image_alt: string;
  image_uploaded_at: string;
  gallery: string;
  collection_slug: string;
  status: string;
  featured: string;
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
  vendor: string;
  product_category: string;
  type: string;
  tags: string;
  collection: string;
};

type ProductsResponse = {
  ok: boolean;
  items: ProductItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats: {
    total: number;
    onThisPage: number;
    published: number;
    draft: number;
    noGallery: number;
    noMainImage: number;
    missingAltText: number;
    lowImageCount: number;
  };
  error?: string;
};

type BulkResponse = {
  ok: boolean;
  summary?: {
    total: number;
    successCount: number;
    failedCount: number;
  };
  results?: Array<{
    slug: string;
    ok: boolean;
    error?: string;
  }>;
  error?: string;
};

function toText(value: unknown) {
  return String(value ?? "").trim();
}

export default function AdminProductsBulkEditor() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");

  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkFeatured, setBulkFeatured] = useState("");
  const [bulkCollectionSlug, setBulkCollectionSlug] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [stats, setStats] = useState<ProductsResponse["stats"] | null>(null);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const params = new URLSearchParams();

      if (query.trim()) params.set("q", query.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (collectionFilter !== "all") params.set("collection", collectionFilter);
      if (featuredFilter !== "all") params.set("featured", featuredFilter);

      const response = await fetch(`/api/admin/products?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as ProductsResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load products.");
      }

      setItems(Array.isArray(data.items) ? data.items : []);
      setStats(data.stats || null);
      setSelectedSlugs([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const allSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((item) => selectedSlugs.includes(item.slug));
  }, [items, selectedSlugs]);

  const availableCollections = useMemo(() => {
    const unique = new Set<string>();

    items.forEach((item) => {
      const value = toText(item.collection_slug);
      if (value) unique.add(value);
    });

    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [items]);

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedSlugs([]);
      return;
    }

    setSelectedSlugs(items.map((item) => item.slug));
  }

  function toggleSelectOne(slug: string) {
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((item) => item !== slug);
      }

      return [...prev, slug];
    });
  }

  async function handleApplyBulkUpdate() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (selectedSlugs.length === 0) {
        throw new Error("Please select at least one product.");
      }

      const changes: Record<string, string> = {};

      if (bulkStatus) changes.status = bulkStatus;
      if (bulkFeatured) changes.featured = bulkFeatured;
      if (bulkCollectionSlug.trim()) {
        changes.collection_slug = bulkCollectionSlug.trim();
      }

      if (Object.keys(changes).length === 0) {
        throw new Error("Please choose at least one field to update.");
      }

      const response = await fetch("/api/admin/products/bulk", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: selectedSlugs.map((slug) => ({
            slug,
            changes,
          })),
        }),
      });

      const data = (await response.json()) as BulkResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Bulk update failed.");
      }

      setMessage(
        `Updated ${data.summary?.successCount || 0} of ${data.summary?.total || 0} selected product(s).`
      );

      setBulkStatus("");
      setBulkFeatured("");
      setBulkCollectionSlug("");

      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-neutral-200 p-4">
            <div className="text-sm text-neutral-500">Total</div>
            <div className="mt-2 text-3xl font-semibold">{stats?.total ?? 0}</div>
          </div>

          <div className="rounded-2xl border border-neutral-200 p-4">
            <div className="text-sm text-neutral-500">Published</div>
            <div className="mt-2 text-3xl font-semibold">
              {stats?.published ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 p-4">
            <div className="text-sm text-neutral-500">Draft</div>
            <div className="mt-2 text-3xl font-semibold">{stats?.draft ?? 0}</div>
          </div>

          <div className="rounded-2xl border border-neutral-200 p-4">
            <div className="text-sm text-neutral-500">Missing Main Image</div>
            <div className="mt-2 text-3xl font-semibold">
              {stats?.noMainImage ?? 0}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Search
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, slug, description..."
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
            >
              <option value="all">all</option>
              <option value="published">published</option>
              <option value="draft">draft</option>
              <option value="archived">archived</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Collection
            </label>
            <select
              value={collectionFilter}
              onChange={(e) => setCollectionFilter(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
            >
              <option value="all">all</option>
              {availableCollections.map((collection) => (
                <option key={collection} value={collection}>
                  {collection}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Featured
            </label>
            <select
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
            >
              <option value="all">all</option>
              <option value="TRUE">TRUE</option>
              <option value="FALSE">FALSE</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-60"
          >
            {loading ? "Loading..." : "Apply Filters"}
          </button>

          <button
            onClick={() => {
              setQuery("");
              setStatusFilter("all");
              setCollectionFilter("all");
              setFeaturedFilter("all");
            }}
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="grid gap-4 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Bulk Status
            </label>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
            >
              <option value="">No change</option>
              <option value="published">published</option>
              <option value="draft">draft</option>
              <option value="archived">archived</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Bulk Featured
            </label>
            <select
              value={bulkFeatured}
              onChange={(e) => setBulkFeatured(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
            >
              <option value="">No change</option>
              <option value="TRUE">TRUE</option>
              <option value="FALSE">FALSE</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Bulk Collection Slug
            </label>
            <input
              value={bulkCollectionSlug}
              onChange={(e) => setBulkCollectionSlug(e.target.value)}
              placeholder="e.g. bathrobes"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-black"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleApplyBulkUpdate}
              disabled={saving}
              className="w-full rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Apply Bulk Update"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">
            Selected: {selectedSlugs.length}
          </span>

          {message ? <span className="text-green-600">{message}</span> : null}
          {error ? <span className="text-red-600">{error}</span> : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-700">
                  Title
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-700">
                  Slug
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-700">
                  Collection
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-700">
                  Featured
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-700">
                  Main Image
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const checked = selectedSlugs.includes(item.slug);

                return (
                  <tr
                    key={item.slug}
                    className="border-b border-neutral-100 last:border-b-0"
                  >
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelectOne(item.slug)}
                      />
                    </td>

                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-neutral-900">
                        {item.title}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top text-neutral-600">
                      {item.slug}
                    </td>

                    <td className="px-4 py-3 align-top text-neutral-600">
                      {item.collection_slug || "-"}
                    </td>

                    <td className="px-4 py-3 align-top text-neutral-600">
                      {item.status || "-"}
                    </td>

                    <td className="px-4 py-3 align-top text-neutral-600">
                      {item.featured || "-"}
                    </td>

                    <td className="px-4 py-3 align-top text-neutral-600">
                      {item.image ? "Yes" : "No"}
                    </td>
                  </tr>
                );
              })}

              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-neutral-500"
                  >
                    No products found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}