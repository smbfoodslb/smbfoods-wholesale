# SMB Foods / Organicopia — Wholesale Order Catalog (web)

A plain HTML/CSS/JavaScript site — no build step, no npm packages required.
Customers browse the catalog, add items to a cart (kept in their browser),
and tap **Checkout via WhatsApp**, which opens WhatsApp with their order
pre-filled to **+961 78 879 350**. They just tap Send to confirm.

## What's in here

- `index.html`, `style.css`, `app.js` — the whole site.
- `data/products.json` — all 108 products, generated from the same
  `master_data.py` that builds the PDF catalog (see "Updating the catalog" below).
- `images/` — product photos, plus `placeholder.svg` for items without a photo yet.

## Deploying it (GitHub + Vercel), step by step

**1. Put this folder on GitHub**

- Go to [github.com](https://github.com) and log in.
- Click the **+** in the top right → **New repository**. Name it something
  like `smb-foods-store`. Leave it Public or Private (either works for
  Vercel). Click **Create repository**.
- On the new repo's page, click **uploading an existing file**.
- Drag this entire `smb-foods-store` folder's contents into the upload box
  (select all files and folders — `index.html`, `style.css`, `app.js`,
  `data/`, `images/`, this `README.md`) and click **Commit changes**.

  *(If you're comfortable with a terminal, the equivalent is:
  `git init && git add . && git commit -m "Initial site" && git branch -M main && git remote add origin <your-repo-url> && git push -u origin main`.)*

**2. Deploy it on Vercel**

- Go to [vercel.com](https://vercel.com) and sign up — choose **Continue
  with GitHub** so the two are connected automatically.
- Click **Add New… → Project**.
- Find `smb-foods-store` in the list and click **Import**.
- Vercel will detect it as a plain static site (**Framework Preset: Other**).
  You don't need to set a build command or output directory — leave those
  blank/default.
- Click **Deploy**. In about 30 seconds you'll get a live link like
  `https://smb-foods-store.vercel.app`.

That's it — that link is what you'd share with customers, put in a QR code,
or link to from WhatsApp/Instagram.

**Custom domain (optional):** in the Vercel project → **Settings → Domains**,
you can attach something like `order.smbfoods-lb.com` if you own that domain
— Vercel will show you a DNS record to add at your domain registrar.

## Updating the catalog later

Whenever the PDF catalog's product data changes (new items, price changes,
photos, badges), the web catalog can be regenerated from the exact same
source:

```
cd catalog/build
python3 export_web_data.py
```

This rewrites `smb-foods-store/data/products.json`. Commit and push that one
file to GitHub, and Vercel redeploys automatically within a minute — no other
changes needed. (Ask me to do this any time you update the PDF and I'll keep
both in sync and push the update for you.)

## How checkout works

There's no backend, database, or payment processing — by design, to keep
this free to run and simple to maintain. The cart lives in the customer's
browser (so it survives a page refresh but is private to their device).
Checkout builds a plain-text order summary and opens:

```
https://wa.me/96178879350?text=<order summary>
```

WhatsApp opens (app or web) with that message pre-filled in a chat to your
number; the customer taps **Send**. This is the standard "click-to-chat"
mechanism WhatsApp provides for exactly this use case — no WhatsApp Business
API account, verification, or per-message cost required.
