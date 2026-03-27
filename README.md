# Patak Textile CMS

Patak Textile CMS is a lightweight Next.js-based catalog website with an internal admin panel.  
It is designed for a listing and catalog structure, not a full ecommerce checkout system.

The project uses:

- Next.js App Router
- TypeScript
- Google Sheets as the main content source
- Internal admin panel for products, collections, and blog
- CSV / JSON / XML import-export support

## Project Purpose

This project is intended as a clean and manageable starting point for:

- product listing pages
- collection pages
- blog pages
- product detail pages
- admin-based content management

The current structure is focused on a premium catalog presentation.  
It is not intended to behave like a full Shopify-style store at this stage.

## Main Data Sources

The project reads data from Google Sheets.

Required sheet names:

- `products`
- `collections`
- `blog`
- `product_variants`
- `product_images`

## Products Sheet Header Order

The `products` sheet must use this exact header order:

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