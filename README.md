# Yarn Hooker

A responsive independent-maker storefront with a cream, cherry-red, and pink palette, supplied brand photography, product details, category filters, persistent shopping bag, and front/back product imagery. Hover a two-image product or use its front/back button on touch devices. Product details support keyboard-accessible native dialogs.

## Develop

Run `npm run dev` for local development. The Vinext/Cloudflare server serves the storefront and a D1-backed `/api/votes` endpoint. Source lives in `public/`, `app/`, and `db/`; `dist/` is generated. Build with the Sites build helper. Apply migrations before using votes in a local preview.

## Connect Shopify

The site currently presents a clearly labeled preview collection without prices or purchasable inventory. In `public/config.js`, set the shop's `something.myshopify.com` domain and **public Storefront API access token** from the Shopify Headless sales channel. Never put an Admin API token or private Storefront token in browser code.

Publish products to that sales channel and grant public product reading access. The storefront fetches Shopify products and variants, supports sold-out options, creates a Shopify cart, and redirects to Shopify's secure checkout. Shopify manages inventory, payments, shipping, and tax. Products tagged through product type containing crochet/knit/wear appear in Crochet; others appear in Art & little things. Put front and back as the first two Shopify product images to enable the image swap. The first variant's price appears on collection cards; final chosen-variant prices appear at checkout.

Reference: https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage

Before public launch: confirm product names, descriptions, prices, sizes/materials, fulfillment and returns policies, merchant contact, and custom request details. Custom ideas currently save only on the visitor's device and do not send messages. Preview-bag items are excluded from live checkout. The live catalog currently displays up to 100 products and 100 variants per product.

## Assets

User-provided images are copied into `public/assets` as web-ready JPEGs. Original sources are not modified. Only intentionally selected imagery is displayed; extra supplied photos are retained as possible design references. Fonts load from Google Fonts with local system fallbacks.

## Slideshow and shared likes

The hero crossfades between three product photos and one Remy photo every 6.5 seconds with a gentle drift, a pause control, background-tab suspension, and reduced-motion support. Shared item counts use D1 and one vote per item per anonymous HttpOnly cookie. Votes can be removed; the unique database key makes duplicate requests idempotent. Anonymous cookies are a convenience, not a verified-person voting system. Clearing cookies or using another browser permits another vote. No login is required. Votes apply to the preview catalog; new live Shopify product IDs must be registered server-side before accepting votes.

## GitHub Pages

GitHub Actions builds a static storefront from `public/` using `node scripts/build-pages.mjs` and deploys `pages-dist/`. Pages must use GitHub Actions as its publishing source. The root CNAME preserves yarnhooker.com. Asset paths support both a custom domain and a repository subpath. Hearts are personal favorites stored on the visitor’s device; GitHub Pages does not run the historical D1 shared-vote API. The server source remains available for a future full-stack deployment. No package installation is required for the Pages build.

## Owner editor

Use the Owner login link in the footer. Username: `remy`. The editor supports colors, copy, products, photo uploads, galleries, slideshow images, and section visibility/order. Preview changes, then Publish to create a commit in `mduram/yarn-hooker`; GitHub Actions publishes it to Pages. Content lives in `content/site.json`; generated `public/site-config.js` is refreshed at build time. Shopify inventory remains managed in Shopify when connected.

Authentication runs on the separate Sites backend, not GitHub Pages. Activate once at `/admin/setup.html#key=SETUP_KEY` on that backend using the private setup key, a password of at least 14 characters, and a fine-grained GitHub token restricted to this repository with Contents read/write. Never commit credentials. The password is hashed, the token is encrypted with the runtime `OWNER_ENCRYPTION_KEY`, and sessions expire after four hours. Setup locks after first use. `OWNER_SETUP_KEY` and `OWNER_ENCRYPTION_KEY` are secret runtime values; retain the encryption key when redeploying. Migrations in `drizzle/` create the required D1 tables.

The editor may only commit the content JSON and uploaded images. It does not provide general GitHub account access. Concurrent repository changes cause a conflict instead of overwriting someone else's commit. For credential recovery, the backend administrator must reset the owner settings and sessions in D1, then issue a new setup key.

## Before Shopify: enquiries and collection management

Products in `content/site.json` support `collection` (Crochet/Prints), comma-separated `sizes`, a decimal-string `price`, `currency`, and nullable integer `inventory`. Empty price/size/stock fields display enquiry guidance; zero stock disables adding that item. Stock is an availability guide and must be updated manually by the owner; saved bags do not reserve or decrement it. Existing prices/sizes/stock entered in descriptions have been migrated into these fields.

Bags persist on each visitor's device. Download bag exports a text list. Email enquiry opens an email draft using `contactEmail`. Copy enquiry copies the list for the visitor to paste into an Instagram DM; Open Instagram opens the configured profile and does not send a message automatically. Shopify checkout remains separate when enabled.

The editor's Collection tabs page manages `catalog.categories` and the All-tab toggle. Rename/move a category there to update matching product assignments. Hide/remove affects the category tab; products remain accessible through All. The Details & FAQ page manages questions/answers. About, FAQ, custom copy, and product descriptions preserve line breaks safely as plain text.

## Live Shopify connection

The storefront is connected to `0gp0az-hy.myshopify.com` using a public Storefront token in `public/config.js`. Shopify is authoritative for live product content, variants, prices and availability. `public/shopify.js` normalizes the live data; explicit product types/tags matching editor category names take precedence, then product titles provide fallback mapping for the current untyped catalogue. Printed tees map to Prints. Exact stock counts require `unauthenticated_read_product_inventory`; without it the shop uses available/sold-out status. Shopify validates stock again at checkout.

Live bags store Shopify variant IDs separately from older preview enquiries. The bag offers a switch to retained enquiry items; these cannot enter paid checkout. Before checkout the catalogue is refreshed, unavailable variants are rejected, and Shopify cart warnings / adjusted quantities stop the redirect for review. No payment or completed order was submitted during integration testing.

Manager preview mode deliberately shows the editable reference catalogue without activating Shopify checkout. Use Shopify admin for live product changes. Homepage copy, categories, About, FAQ, slideshow, colours, and sections remain in the website editor. Review product types/tags when introducing new categories. Ordinary products and up to 100 variants per product are supported; products needing more variants cause checkout to pause rather than showing incomplete options.

The storefront fetches Shopify on each visit, refreshes every two minutes while visible, and refreshes when returning to a tab after 30 seconds or reconnecting. Open product/bag dialogs defer background refresh until closed to preserve selections. Checkout always rechecks Shopify. Catalog changes do not require a GitHub deployment.
