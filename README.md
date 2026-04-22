# Global CMS

A custom content management and commerce platform built with Next.js, TypeScript, Google Sheets, and Google Drive.

This project is designed for product-based businesses that need a lightweight but flexible system to manage:

- products
- variants
- product images
- collections
- blog content
- customer applications
- customers
- carts
- orders

It is especially suitable for B2B, wholesale, hospitality, and textile-focused businesses that need more control than traditional website builders but want a simpler setup than a full enterprise commerce stack.

---

## Overview

Global CMS is not a generic drag-and-drop website builder.

It is a structured, headless-style management system with:

- a custom admin panel
- Google Sheets as the primary data layer
- Google Drive as the media layer
- Next.js frontend and API routes
- support for both catalog and commerce workflows

The system is optimized for teams that want to manage content and commerce data internally while keeping the frontend fully customizable.

---

## Core Architecture

The project is organized around three main layers:

### 1. Catalog Layer
Handles all content shown on the website.

Includes:
- products
- product variants
- product images
- collections
- blog posts

### 2. Commerce Layer
Handles transactional and customer-related data.

Includes:
- customer applications
- customers
- carts
- cart items
- orders
- order items

### 3. System Layer
Handles authentication, admin access, configuration, and data integrations.

Includes:
- admin auth
- API protection
- Google Sheets access
- Google Drive upload logic
- cache / utility helpers

---

## Tech Stack

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Google Sheets API**
- **Google Drive API**
- **bcryptjs**
- Custom cookie-based admin authentication

---

## Current Data Model

The project uses Google Sheets as the source of truth.

### Required Sheets

#### Catalog
- `products`
- `product_variants`
- `product_images`
- `collections`
- `blog`

#### Commerce
- `customer_applications`
- `customers`
- `carts`
- `cart_items`
- `orders`
- `order_items`

---

## Data Modeling Principles

### Products
The `products` sheet stores only product-level data.

It should contain fields such as:
- id
- title
- slug
- description
- short_description
- collection_slug
- status
- featured
- seo_title
- seo_description
- created_at
- updated_at

It should **not** contain legacy `variant_*` columns.

### Product Variants
All variant-specific data lives in `product_variants`.

This includes:
- sku
- barcode
- option values
- price
- compare_at_price
- inventory / stock
- shipping-related fields
- variant image reference

`product_variants` is the **single source of truth** for variants.

### Product Images
All product media records are managed in `product_images`.

### Orders and Carts
Orders and carts use parent-child structures:

- `orders` → `order_items`
- `carts` → `cart_items`

This keeps the system scalable and easier to maintain.

---

## Admin Panel

The admin panel is intended to manage two main sections:

### Catalog
- Products
- Variants
- Product Images
- Collections
- Blog

### Commerce
- Customer Applications
- Customers
- Carts
- Orders

Only authenticated admin users should be able to access admin screens and protected management APIs.

---

## Authentication

The project uses cookie-based admin authentication.

Protected areas include:
- `/admin`
- internal management APIs
- admin-only CRUD endpoints

Public storefront pages remain accessible without authentication.

Allowed public auth entry points:
- `/portal-ptx-admin`
- `/api/admin-auth`

---

## Environment Variables

Create a `.env.local` file and define the required variables.

Example:

```env
GOOGLE_SHEET_ID=your_google_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password
ADMIN_COOKIE_NAME=admin_session
ADMIN_PORTAL_PASSWORD=your_portal_password