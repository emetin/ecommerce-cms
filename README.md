# Global CMS

Global CMS is a lightweight and scalable content management system built with Next.js.  
It uses Google Sheets as the primary data source and Google Drive for media storage.

This project is designed for structured catalog-based websites and internal content management workflows without relying on traditional e-commerce platforms.

---

## Features

- Next.js App Router architecture
- TypeScript support
- Google Sheets as the primary database
- Google Drive integration for media storage
- Internal admin panel
- CSV / JSON / XML import and export
- Modular and scalable structure

---

## Purpose

Global CMS is designed for:

- Product catalog websites
- Collection-based content structures
- Blog systems
- B2B showcase platforms

This project is not a full e-commerce system.  
It does not include cart, checkout, or payment infrastructure.

---

## Data Architecture

The system reads core content from Google Sheets.

### Required Sheets

The following sheets must exist:

- `products`
- `collections`
- `blog`
- `product_variants`
- `product_images`
- `collection_products`

### Products Sheet Header Order

The `products` sheet must follow this exact header order:

```txt
id
title
slug
description
short_description
image
gallery
collection_slug
status
featured
seo_title
seo_description
created_at
updated_at
vendor
product_category
type
tags