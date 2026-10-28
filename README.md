# Yarn Hooker

A responsive independent-maker storefront with a cream, cherry-red, and pink palette, supplied brand photography, product details, category filters, persistent shopping bag, and front/back product imagery. Hover a two-image product or use its front/back button on touch devices. Product details support keyboard-accessible native dialogs.

## Develop

Run `npm run dev` and open http://localhost:4173. No dependency installation or build is required. Run `npm run check` for JavaScript syntax checks. Deploy `dist/` to any static host.

## Connect Shopify

The site currently presents a clearly labeled preview collection without prices or purchasable inventory. In `dist/config.js`, set the shop's `something.myshopify.com` domain and **public Storefront API access token** from the Shopify Headless sales channel. Never put an Admin API token or private Storefront token in browser code.

Publish products to that sales channel and grant public product reading access. The storefront fetches Shopify products and variants, supports sold-out options, creates a Shopify cart, and redirects to Shopify's secure checkout. Shopify manages inventory, payments, shipping, and tax. Products tagged through product type containing crochet/knit/wear appear in Crochet; others appear in Art & little things. Put front and back as the first two Shopify product images to enable the image swap. The first variant's price appears on collection cards; final chosen-variant prices appear at checkout.

Reference: https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage

Before public launch: confirm product names, descriptions, prices, sizes/materials, fulfillment and returns policies, merchant contact, and custom request details. Custom ideas currently save only on the visitor's device and do not send messages. Preview-bag items are excluded from live checkout. The live catalog currently displays up to 100 products and 100 variants per product.

## Assets

User-provided images are copied into `dist/assets` as web-ready JPEGs. Original sources are not modified. Only intentionally selected imagery is displayed; extra supplied photos are retained as possible design references. Fonts load from Google Fonts with local system fallbacks.
