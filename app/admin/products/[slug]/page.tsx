"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeImageUrl } from "../../../../lib/image-url";

type ProductItem = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  short_description?: string;
  image?: string;
  gallery?: string;
  collection_slug?: string;
  status?: string;
  featured?: string;
  seo_title?: string;
  seo_description?: string;
  vendor?: string;
  product_category?: string;
  type?: string;
  tags?: string;
  created_at?: string;
  updated_at?: string;
};

type VariantItem = {
  id?: string;
  product_slug?: string;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  option3_name?: string;
  option3_value?: string;
  sku?: string;
  barcode?: string;
  price?: string;
  compare_at_price?: string;
  inventory_tracker?: string;
  inventory_policy?: string;
  fulfillment_service?: string;
  requires_shipping?: string;
  taxable?: string;
  image_id?: string;
  variant_image?: string;
  weight?: string;
  weight_unit?: string;
  box_quantity?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type ProductImageItem = {
  id?: string;
  product_slug?: string;
  image_url?: string;
  sort_order?: string;
  alt_text?: string;
  is_main?: string;
  created_at?: string;
  updated_at?: string;
};

function parsePrice(value?: string) {
  const num = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

function buildVariantLabel(item: VariantItem) {
  const values = [item.option1_value, item.option2_value, item.option3_value]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return values.length ? values.join(" / ") : "Default";
}

function isTrue(value?: string) {
  return String(value || "").trim().toLowerCase() === "true";
}

function toSafeOrder(value?: string) {
  const num = Number(String(value || "").trim());
  return Number.isFinite(num) ? num : 999999;
}

function sortImages(images: ProductImageItem[]) {
  return [...images].sort((a, b) => {
    const aMain = isTrue(a.is_main);
    const bMain = isTrue(b.is_main);

    if (aMain !== bMain) {
      return aMain ? -1 : 1;
    }

    return toSafeOrder(a.sort_order) - toSafeOrder(b.sort_order);
  });
}

export default function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = use(params);
  const slug = decodeURIComponent(rawSlug);

  const [product, setProduct] = useState<ProductItem | null>(null);
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [productImages, setProductImages] = useState<ProductImageItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [image, setImage] = useState("");
  const [gallery, setGallery] = useState("");
  const [collectionSlug, setCollectionSlug] = useState("");
  const [statusValue, setStatusValue] = useState("draft");
  const [featured, setFeatured] = useState("false");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [vendor, setVendor] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [typeValue, setTypeValue] = useState("");
  const [tags, setTags] = useState("");

  const [productSaving, setProductSaving] = useState(false);
  const [productSaveMessage, setProductSaveMessage] = useState("");
  const [productSaveError, setProductSaveError] = useState("");
  const [productDeleteLoading, setProductDeleteLoading] = useState(false);

  const [option1Name, setOption1Name] = useState("Size");
  const [option1Value, setOption1Value] = useState("");
  const [option2Name, setOption2Name] = useState("");
  const [option2Value, setOption2Value] = useState("");
  const [option3Name, setOption3Name] = useState("");
  const [option3Value, setOption3Value] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [boxQuantity, setBoxQuantity] = useState("");
  const [inventoryTracker, setInventoryTracker] = useState("none");
  const [inventoryPolicy, setInventoryPolicy] = useState("deny");
  const [fulfillmentService, setFulfillmentService] = useState("manual");
  const [requiresShipping, setRequiresShipping] = useState("true");
  const [taxable, setTaxable] = useState("true");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [variantStatus, setVariantStatus] = useState("published");

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState("");

  const productLoadedSlugRef = useRef("");
  const variantsLoadedSlugRef = useRef("");
  const imagesLoadedSlugRef = useRef("");

  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const productResponse = await fetch(
        `/api/products/get?slug=${encodeURIComponent(slug)}`,
        {
          cache: "no-store",
        }
      );

      const productData = await productResponse.json();

      if (!productResponse.ok || !productData.ok) {
        throw new Error(productData?.error || "Failed to load product.");
      }

      const foundProduct = productData.item || null;

      if (!foundProduct) {
        throw new Error("Product not found.");
      }

      setProduct(foundProduct);
      setTitle(foundProduct.title || "");
      setDescription(foundProduct.description || "");
      setShortDescription(foundProduct.short_description || "");
      setImage(foundProduct.image || "");
      setGallery(foundProduct.gallery || "");
      setCollectionSlug(foundProduct.collection_slug || "");
      setStatusValue(foundProduct.status || "draft");
      setFeatured(foundProduct.featured || "false");
      setSeoTitle(foundProduct.seo_title || "");
      setSeoDescription(foundProduct.seo_description || "");
      setVendor(foundProduct.vendor || "");
      setProductCategory(foundProduct.product_category || "");
      setTypeValue(foundProduct.type || "");
      setTags(foundProduct.tags || "");
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadVariants = useCallback(async () => {
    try {
      setVariantsLoading(true);

      const response = await fetch(
        `/api/variants/list?product_slug=${encodeURIComponent(slug)}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to load variants.");
      }

      setVariants(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error("Failed to load variants:", error);
      setVariants([]);
    } finally {
      setVariantsLoading(false);
    }
  }, [slug]);

  const loadImages = useCallback(async () => {
    try {
      setImagesLoading(true);

      const response = await fetch(
        `/api/product-images/list?product_slug=${encodeURIComponent(slug)}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to load product images.");
      }

      setProductImages(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error("Failed to load product images:", error);
      setProductImages([]);
    } finally {
      setImagesLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    if (productLoadedSlugRef.current === slug) return;

    productLoadedSlugRef.current = slug;
    loadProduct();
  }, [slug, loadProduct]);

  useEffect(() => {
    if (!slug) return;
    if (variantsLoadedSlugRef.current === slug) return;

    variantsLoadedSlugRef.current = slug;
    loadVariants();
  }, [slug, loadVariants]);

  useEffect(() => {
    if (!slug) return;
    if (imagesLoadedSlugRef.current === slug) return;

    imagesLoadedSlugRef.current = slug;
    loadImages();
  }, [slug, loadImages]);

  const optionPreview = useMemo(() => {
    const values = [option1Value, option2Value, option3Value]
      .map((value) => value.trim())
      .filter(Boolean);

    return values.length ? values.join(" / ") : "Default";
  }, [option1Value, option2Value, option3Value]);

  const sortedImages = useMemo(() => sortImages(productImages), [productImages]);

  const mainImage = useMemo(() => {
    return (
      sortedImages.find((item) => isTrue(item.is_main)) ||
      sortedImages[0] ||
      null
    );
  }, [sortedImages]);

  const currentPrimaryImageUrl = useMemo(() => {
    return normalizeImageUrl(mainImage?.image_url || image || "");
  }, [mainImage, image]);

  const galleryStats = useMemo(() => {
    const imageCount = sortedImages.length;
    const mainImageExists = Boolean(
      sortedImages.find((item) => isTrue(item.is_main))
    );
    const altTextCount = sortedImages.filter((item) =>
      String(item.alt_text || "").trim()
    ).length;

    let score = 0;
    if (imageCount > 0) score += 35;
    if (mainImageExists) score += 35;
    if (imageCount >= 3) score += 15;
    if (imageCount > 0 && altTextCount === imageCount) score += 15;

    return {
      imageCount,
      mainImageExists,
      altTextCount,
      score,
    };
  }, [sortedImages]);

  async function handleProductSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setProductSaving(true);
    setProductSaveMessage("");
    setProductSaveError("");

    try {
      const response = await fetch("/api/products/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug,
          title,
          description,
          short_description: shortDescription,
          image,
          gallery,
          collection_slug: collectionSlug,
          status: statusValue,
          featured,
          seo_title: seoTitle,
          seo_description: seoDescription,
          vendor,
          product_category: productCategory,
          type: typeValue,
          tags,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to update product.");
      }

      setProductSaveMessage("Product updated successfully.");
      await loadProduct();
      await loadImages();
    } catch (error) {
      setProductSaveError(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setProductSaving(false);
    }
  }

  async function handleDeleteProduct() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product and all related records?"
    );

    if (!confirmed) return;

    try {
      setProductDeleteLoading(true);

      const response = await fetch("/api/products/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to delete product.");
      }

      window.location.href = "/admin/products";
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setProductDeleteLoading(false);
    }
  }

  async function handleCreateVariant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const response = await fetch("/api/variants/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_slug: slug,
          option1_name: option1Name,
          option1_value: option1Value,
          option2_name: option2Name,
          option2_value: option2Value,
          option3_name: option3Name,
          option3_value: option3Value,
          sku,
          barcode,
          price,
          compare_at_price: compareAtPrice,
          inventory_tracker: inventoryTracker,
          inventory_policy: inventoryPolicy,
          fulfillment_service: fulfillmentService,
          requires_shipping: requiresShipping,
          taxable,
          image_id: "",
          variant_image: "",
          weight,
          weight_unit: weightUnit,
          box_quantity: boxQuantity,
          status: variantStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to create variant.");
      }

      setSaveMessage("Variant created successfully.");

      setOption1Value("");
      setOption2Name("");
      setOption2Value("");
      setOption3Name("");
      setOption3Value("");
      setSku("");
      setBarcode("");
      setPrice("");
      setCompareAtPrice("");
      setBoxQuantity("");
      setInventoryTracker("none");
      setInventoryPolicy("deny");
      setFulfillmentService("manual");
      setRequiresShipping("true");
      setTaxable("true");
      setWeight("");
      setWeightUnit("kg");
      setVariantStatus("published");

      await loadVariants();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVariant(id?: string) {
    if (!id) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this variant?"
    );

    if (!confirmed) return;

    try {
      setDeleteLoadingId(id);

      const response = await fetch("/api/variants/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Failed to delete variant.");
      }

      setVariants((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setDeleteLoadingId("");
    }
  }

  if (loading) {
    return <div style={cardStyle}>Loading...</div>;
  }

  if (pageError || !product) {
    return (
      <div style={errorBoxStyle}>
        <strong>Error:</strong>
        <div style={{ marginTop: 8 }}>{pageError || "Product not found."}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={pageHeaderStyle}>
        <div>
          <Link href="/admin/products" style={backLinkStyle}>
            ← Back to Products
          </Link>
          <h1 style={titleStyle}>{product.title || "Product"}</h1>
          <p style={subtitleStyle}>
            Edit core product details here. Manage all product gallery images
            from the dedicated Image Manager to keep the media structure clean
            and consistent.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <Link href={`/products/${product.slug}`} style={secondaryButtonStyle}>
            View Product
          </Link>
          <Link
            href={`/admin/products/${slug}/images`}
            style={primaryButtonStyle}
          >
            Open Image Manager
          </Link>
          <Link
            href={`/admin/products/${slug}/variant-images`}
            style={secondaryButtonStyle}
          >
            Variant Images
          </Link>
          <Link href="/admin/products/new" style={secondaryButtonStyle}>
            + New Product
          </Link>
          <button
            type="button"
            onClick={handleDeleteProduct}
            style={dangerButtonStyle}
            disabled={productDeleteLoading}
          >
            {productDeleteLoading ? "Deleting..." : "Delete Product"}
          </button>
        </div>
      </div>

      <div style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Product Slug</div>
          <div style={summaryValueStyle}>{product.slug || "-"}</div>
        </div>

        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Collection</div>
          <div style={summaryValueStyle}>{product.collection_slug || "-"}</div>
        </div>

        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Status</div>
          <div style={summaryValueStyle}>{product.status || "-"}</div>
        </div>

        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Variants</div>
          <div style={summaryValueStyle}>
            {variantsLoading ? "..." : variants.length}
          </div>
        </div>
      </div>

      <div style={galleryOverviewGridStyle}>
        <div style={cardStyle}>
          <div style={sectionTitleWrapStyle}>
            <h2 style={sectionTitleStyle}>Gallery Progress</h2>
            <p style={sectionTextStyle}>
              Image Manager is now the primary source for product gallery
              control. This section shows the current media readiness for the
              product.
            </p>
          </div>

          <div style={galleryProgressTopStyle}>
            <div style={progressRingWrapStyle}>
              <div style={progressRingStyle}>
                <span style={progressValueStyle}>{galleryStats.score}%</span>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12, flex: 1 }}>
              <ProgressRow
                label="Images Added"
                value={`${galleryStats.imageCount}`}
                ok={galleryStats.imageCount > 0}
              />
              <ProgressRow
                label="Main Image Selected"
                value={galleryStats.mainImageExists ? "Yes" : "No"}
                ok={galleryStats.mainImageExists}
              />
              <ProgressRow
                label="Alt Text Coverage"
                value={`${galleryStats.altTextCount}/${galleryStats.imageCount || 0}`}
                ok={
                  galleryStats.imageCount > 0 &&
                  galleryStats.altTextCount === galleryStats.imageCount
                }
              />
              <ProgressRow
                label="Recommended Gallery Size"
                value={galleryStats.imageCount >= 3 ? "Reached" : "Need 3+"}
                ok={galleryStats.imageCount >= 3}
              />
            </div>
          </div>

          <div style={noticeBoxStyle}>
            Manual gallery editing from this page has been intentionally reduced.
            Use the dedicated Image Manager so the storefront, listing pages, and
            detail pages all use the same media source.
          </div>

          <div style={buttonRowStyle}>
            <Link
              href={`/admin/products/${slug}/images`}
              style={primaryButtonStyle}
            >
              Manage Gallery Images
            </Link>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleWrapStyle}>
            <h2 style={sectionTitleStyle}>Current Main Image</h2>
            <p style={sectionTextStyle}>
              This preview reflects the image that should represent the product
              across product cards and detail pages.
            </p>
          </div>

          {imagesLoading ? (
            <div style={emptyStateStyle}>Loading gallery preview...</div>
          ) : currentPrimaryImageUrl ? (
            <div style={mainPreviewWrapStyle}>
              <img
                src={currentPrimaryImageUrl}
                alt={product.title || "Product image"}
                style={mainPreviewImageStyle}
              />
              <div style={mainPreviewMetaStyle}>
                <div style={summaryLabelStyle}>Source</div>
                <div style={mainPreviewValueStyle}>
                  {mainImage?.image_url ? "Image Manager" : "Product image field"}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Link
                    href={`/admin/products/${slug}/images`}
                    style={secondaryButtonStyle}
                  >
                    Edit Gallery
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div style={emptyStateStyle}>
              No image selected yet. Add images from Image Manager to complete the
              gallery.
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleProductSave} style={cardStyle}>
        <div style={sectionTitleWrapStyle}>
          <h2 style={sectionTitleStyle}>Product Details</h2>
          <p style={sectionTextStyle}>
            Update the product information stored in the products sheet. Media is
            controlled separately through Image Manager.
          </p>
        </div>

        <div style={formGridStyle}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Slug</label>
            <input value={slug} style={inputStyle} disabled />
          </div>

          <div>
            <label style={labelStyle}>Collection Slug</label>
            <input
              value={collectionSlug}
              onChange={(e) => setCollectionSlug(e.target.value)}
              placeholder="towels"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
              style={inputStyle}
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Featured</label>
            <select
              value={featured}
              onChange={(e) => setFeatured(e.target.value)}
              style={inputStyle}
            >
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Vendor</label>
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Patak Textile"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Product Category</label>
            <input
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              placeholder="Bath"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Type</label>
            <input
              value={typeValue}
              onChange={(e) => setTypeValue(e.target.value)}
              placeholder="Towel"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Tags</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="hotel, luxury, bath"
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Primary Image Field</label>
            <input
              value={image}
              readOnly
              placeholder="This is synced by Image Manager when a main image is selected"
              style={{
                ...inputStyle,
                background: "#f5f1ea",
                color: "#7a7267",
                cursor: "not-allowed",
              }}
            />
            <div style={helperTextStyle}>
              This field is synced automatically from Image Manager and is kept
              only for compatibility.
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Legacy Gallery Field</label>
            <textarea
              value={gallery}
              readOnly
              placeholder="Legacy comma-separated image URLs"
              style={{
                ...inputStyle,
                minHeight: 110,
                resize: "vertical",
                background: "#f5f1ea",
                color: "#7a7267",
                cursor: "not-allowed",
              }}
            />
            <div style={helperTextStyle}>
              Legacy field only. Gallery should be managed from Image Manager.
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Short Description</label>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Short summary"
              style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full product description"
              style={{ ...inputStyle, minHeight: 220, resize: "vertical" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>SEO Title</label>
            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="SEO title"
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>SEO Description</label>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="SEO description"
              style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
            />
          </div>
        </div>

        <div style={buttonRowStyle}>
          <button
            type="submit"
            style={primaryButtonStyle}
            disabled={productSaving}
          >
            {productSaving ? "Saving..." : "Save Product"}
          </button>
        </div>

        {productSaveMessage ? (
          <div style={successBoxStyle}>{productSaveMessage}</div>
        ) : null}
        {productSaveError ? (
          <div style={errorBoxStyle}>{productSaveError}</div>
        ) : null}
      </form>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.05fr 1.15fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        <form onSubmit={handleCreateVariant} style={cardStyle}>
          <div style={sectionTitleWrapStyle}>
            <h2 style={sectionTitleStyle}>Add New Variant</h2>
            <p style={sectionTextStyle}>
              Add size, color, pack, or other option combinations for this
              product.
            </p>
          </div>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Option 1 Name</label>
              <input
                value={option1Name}
                onChange={(e) => setOption1Name(e.target.value)}
                placeholder="Size"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Option 1 Value</label>
              <input
                value={option1Value}
                onChange={(e) => setOption1Value(e.target.value)}
                placeholder="Queen"
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Option 2 Name</label>
              <input
                value={option2Name}
                onChange={(e) => setOption2Name(e.target.value)}
                placeholder="Color"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Option 2 Value</label>
              <input
                value={option2Value}
                onChange={(e) => setOption2Value(e.target.value)}
                placeholder="White"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Option 3 Name</label>
              <input
                value={option3Name}
                onChange={(e) => setOption3Name(e.target.value)}
                placeholder="Pack"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Option 3 Value</label>
              <input
                value={option3Value}
                onChange={(e) => setOption3Value(e.target.value)}
                placeholder="Set of 12"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Price</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="120"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Compare At Price</label>
              <input
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                placeholder="150"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>SKU</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="GTX-TWL-QUEEN-WHT"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Barcode</label>
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="1234567890123"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Box Quantity</label>
              <input
                value={boxQuantity}
                onChange={(e) => setBoxQuantity(e.target.value)}
                placeholder="12"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Weight</label>
              <input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="1.2"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Weight Unit</label>
              <select
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value)}
                style={inputStyle}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="lb">lb</option>
                <option value="oz">oz</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Inventory Tracker</label>
              <select
                value={inventoryTracker}
                onChange={(e) => setInventoryTracker(e.target.value)}
                style={inputStyle}
              >
                <option value="none">none</option>
                <option value="shopify">shopify</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Inventory Policy</label>
              <select
                value={inventoryPolicy}
                onChange={(e) => setInventoryPolicy(e.target.value)}
                style={inputStyle}
              >
                <option value="deny">deny</option>
                <option value="continue">continue</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Fulfillment Service</label>
              <select
                value={fulfillmentService}
                onChange={(e) => setFulfillmentService(e.target.value)}
                style={inputStyle}
              >
                <option value="manual">manual</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Requires Shipping</label>
              <select
                value={requiresShipping}
                onChange={(e) => setRequiresShipping(e.target.value)}
                style={inputStyle}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Taxable</label>
              <select
                value={taxable}
                onChange={(e) => setTaxable(e.target.value)}
                style={inputStyle}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={variantStatus}
                onChange={(e) => setVariantStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="published">published</option>
                <option value="draft">draft</option>
                <option value="archived">archived</option>
              </select>
            </div>
          </div>

          <div style={previewBoxStyle}>
            <div style={previewLabelStyle}>Preview</div>
            <div style={previewValueStyle}>{optionPreview}</div>
          </div>

          <div style={buttonRowStyle}>
            <button type="submit" style={primaryButtonStyle} disabled={saving}>
              {saving ? "Saving..." : "Create Variant"}
            </button>
          </div>

          {saveMessage ? <div style={successBoxStyle}>{saveMessage}</div> : null}
          {saveError ? <div style={errorBoxStyle}>{saveError}</div> : null}
        </form>

        <div style={cardStyle}>
          <div style={sectionTitleWrapStyle}>
            <h2 style={sectionTitleStyle}>Existing Variants</h2>
            <p style={sectionTextStyle}>
              Review each option combination created for this product.
            </p>
          </div>

          {variantsLoading ? (
            <div style={emptyStateStyle}>Loading variants...</div>
          ) : variants.length === 0 ? (
            <div style={emptyStateStyle}>
              No variants have been created for this product yet.
            </div>
          ) : (
            <div style={variantListStyle}>
              {variants.map((item) => {
                const priceValue = parsePrice(item.price);
                const compareAtValue = parsePrice(item.compare_at_price);
                const hasDiscount =
                  compareAtValue > priceValue && priceValue > 0;

                return (
                  <div
                    key={item.id || buildVariantLabel(item)}
                    style={variantCardStyle}
                  >
                    <div style={variantHeaderStyle}>
                      <div>
                        <div style={variantTitleStyle}>
                          {buildVariantLabel(item)}
                        </div>
                        <div style={variantMetaStyle}>
                          {item.option1_name || ""}
                          {item.option1_name && item.option1_value
                            ? `: ${item.option1_value}`
                            : ""}
                          {item.option2_name && item.option2_value
                            ? ` • ${item.option2_name}: ${item.option2_value}`
                            : ""}
                          {item.option3_name && item.option3_value
                            ? ` • ${item.option3_name}: ${item.option3_value}`
                            : ""}
                        </div>
                      </div>

                      <StatusBadge value={item.status || "-"} />
                    </div>

                    <div style={variantInfoGridStyle}>
                      <InfoBox
                        label="Price"
                        value={priceValue > 0 ? formatMoney(priceValue) : "-"}
                      />
                      <InfoBox
                        label="Compare At"
                        value={
                          compareAtValue > 0 ? formatMoney(compareAtValue) : "-"
                        }
                      />
                      <InfoBox label="SKU" value={item.sku || "-"} />
                      <InfoBox label="Barcode" value={item.barcode || "-"} />
                      <InfoBox
                        label="Box Quantity"
                        value={item.box_quantity || "-"}
                      />
                      <InfoBox label="Weight" value={item.weight || "-"} />
                    </div>

                    {hasDiscount ? (
                      <div style={discountBadgeStyle}>Discount active</div>
                    ) : null}

                    <div style={actionRowStyle}>
                      <button
                        type="button"
                        onClick={() => handleDeleteVariant(item.id)}
                        style={dangerSmallButtonStyle}
                        disabled={deleteLoadingId === item.id}
                      >
                        {deleteLoadingId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();

  const style: React.CSSProperties =
    normalized === "published"
      ? {
          ...badgeStyle,
          background: "#edf8f1",
          color: "#1d6a43",
          border: "1px solid #cfe7d8",
        }
      : normalized === "draft"
        ? {
            ...badgeStyle,
            background: "#fff7e8",
            color: "#8a6418",
            border: "1px solid #ecd8ad",
          }
        : {
            ...badgeStyle,
            background: "#f3f3f3",
            color: "#5e5e5e",
            border: "1px solid #dddddd",
          };

  return <span style={style}>{value}</span>;
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoBoxStyle}>
      <div style={infoBoxLabelStyle}>{label}</div>
      <div style={infoBoxValueStyle}>{value}</div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div style={progressRowStyle}>
      <div>
        <div style={progressRowLabelStyle}>{label}</div>
        <div style={progressRowValueStyle}>{value}</div>
      </div>
      <span style={ok ? progressOkBadgeStyle : progressPendingBadgeStyle}>
        {ok ? "Done" : "Pending"}
      </span>
    </div>
  );
}

const pageHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap",
};

const titleStyle: React.CSSProperties = {
  fontSize: 40,
  lineHeight: 1.1,
  margin: "10px 0 10px",
  fontWeight: 800,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#6f6559",
  fontSize: 16,
  maxWidth: 760,
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  color: "#5e5448",
  fontWeight: 700,
  marginBottom: 4,
};

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
};

const summaryCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 20,
  padding: 18,
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7c7267",
  marginBottom: 8,
  fontWeight: 700,
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  wordBreak: "break-word",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 30px rgba(23,23,23,0.04)",
};

const galleryOverviewGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.05fr 0.95fr",
  gap: 24,
  alignItems: "start",
};

const sectionTitleWrapStyle: React.CSSProperties = {
  marginBottom: 18,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 800,
};

const sectionTextStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#6f6559",
  fontSize: 15,
  lineHeight: 1.7,
};

const galleryProgressTopStyle: React.CSSProperties = {
  display: "flex",
  gap: 18,
  alignItems: "stretch",
  marginBottom: 20,
};

const progressRingWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const progressRingStyle: React.CSSProperties = {
  width: 120,
  height: 120,
  borderRadius: "50%",
  border: "10px solid #e7decf",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#faf8f4",
};

const progressValueStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  color: "#171717",
};

const progressRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  padding: "12px 14px",
  borderRadius: 16,
  background: "#faf8f4",
  border: "1px solid #e8dfd2",
};

const progressRowLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7c7267",
  fontWeight: 700,
  marginBottom: 4,
};

const progressRowValueStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: "#171717",
};

const progressOkBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 30,
  padding: "0 12px",
  borderRadius: 999,
  background: "#edf8f1",
  color: "#1d6a43",
  border: "1px solid #cfe7d8",
  fontWeight: 800,
  fontSize: 12,
};

const progressPendingBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 30,
  padding: "0 12px",
  borderRadius: 999,
  background: "#fff7e8",
  color: "#8a6418",
  border: "1px solid #ecd8ad",
  fontWeight: 800,
  fontSize: 12,
};

const noticeBoxStyle: React.CSSProperties = {
  marginTop: 4,
  padding: 16,
  borderRadius: 18,
  background: "#f8f5ef",
  border: "1px solid #e3dbcf",
  color: "#6f6559",
  lineHeight: 1.7,
  fontSize: 14,
};

const mainPreviewWrapStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "220px 1fr",
  gap: 18,
  alignItems: "start",
};

const mainPreviewImageStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  borderRadius: 18,
  background: "#f5f5f5",
  border: "1px solid #e8dfd2",
};

const mainPreviewMetaStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const mainPreviewValueStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "#171717",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 800,
  fontSize: 15,
};

const helperTextStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  color: "#7d7266",
  lineHeight: 1.6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 52,
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid #d9cfbf",
  background: "#fcfbf8",
  outline: "none",
  fontSize: 15,
};

const previewBoxStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 16,
  borderRadius: 18,
  background: "#f8f5ef",
  border: "1px solid #e3dbcf",
};

const previewLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7c7267",
  marginBottom: 8,
  fontWeight: 700,
};

const previewValueStyle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 18,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  marginTop: 24,
  flexWrap: "wrap",
};

const variantListStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
};

const variantCardStyle: React.CSSProperties = {
  border: "1px solid #e8dfd2",
  borderRadius: 20,
  padding: 18,
  background: "#fcfbf8",
};

const variantHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: 16,
};

const variantTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
};

const variantMetaStyle: React.CSSProperties = {
  marginTop: 6,
  color: "#6f6559",
  fontSize: 14,
  lineHeight: 1.6,
};

const variantInfoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const infoBoxStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e8dfd2",
  borderRadius: 16,
  padding: 14,
};

const infoBoxLabelStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#7b7367",
  fontWeight: 700,
  marginBottom: 8,
};

const infoBoxValueStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  wordBreak: "break-word",
};

const discountBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  marginTop: 14,
  padding: "7px 12px",
  borderRadius: 999,
  background: "#eef8f0",
  color: "#2f7d62",
  fontWeight: 800,
  fontSize: 13,
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 32,
  padding: "0 12px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 13,
};

const actionRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 16,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #2f7d62",
  background: "#2f7d62",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #d9cfbf",
  background: "#fff",
  color: "#171717",
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
};

const dangerButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #e5c9c9",
  background: "#fff5f5",
  color: "#8f2d2d",
  fontWeight: 800,
  cursor: "pointer",
};

const dangerSmallButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #e5c9c9",
  background: "#fff5f5",
  color: "#8f2d2d",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
  fontSize: 14,
};

const emptyStateStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd3c5",
  borderRadius: 20,
  padding: 20,
  color: "#6f6559",
  fontWeight: 700,
};

const successBoxStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: 16,
  background: "#eef8f0",
  border: "1px solid #cfe5d4",
  color: "#245843",
  fontWeight: 700,
};

const errorBoxStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: "#fff1f1",
  border: "1px solid #f0c9c9",
  color: "#8d2f2f",
};