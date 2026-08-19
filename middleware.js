// Password-gates the whole site with a custom login page that asks for
// ONLY a password (no username field at all). Free to run on Vercel's
// Hobby plan.
//
// Set this Environment Variable in the Vercel project (Settings ->
// Environments -> Production) before/after adding this file:
//   CATALOG_PASSWORD  e.g. a password of your choice
//
// If it isn't set yet, visitors see a "not configured" message rather
// than the site accidentally staying open.

const COOKIE_NAME = "smb_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export default async function middleware(request) {
  const expectedPass = process.env.CATALOG_PASSWORD;
  const url = new URL(request.url);

  if (!expectedPass) {
    return new Response(
      "This site isn't set up yet — an administrator needs to set CATALOG_PASSWORD.",
      { status: 503, headers: { "Content-Type": "text/plain" } }
    );
  }

  const expectedToken = await hashPassword(expectedPass);

  // Handle the login form being submitted.
  if (url.pathname === "/login" && request.method === "POST") {
    let entered = "";
    try {
      const form = await request.formData();
      entered = form.get("password") || "";
    } catch (e) {
      entered = "";
    }

    if (entered === expectedPass) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: "/",
          "Set-Cookie": `${COOKIE_NAME}=${expectedToken}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return new Response(loginPage(true), {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Serve the login page itself.
  if (url.pathname === "/login") {
    return new Response(loginPage(false), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Any other page: check for a valid login cookie.
  const cookie = getCookie(request, COOKIE_NAME);
  if (cookie === expectedToken) {
    return; // already logged in — continue to the site
  }

  return Response.redirect(new URL("/login", url), 303);
}

function getCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

async function hashPassword(pw) {
  const data = new TextEncoder().encode(pw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loginPage(showError) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SMB Foods — Enter Password</title>
<style>
  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #fafaf8;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    margin: 0;
  }
  .box {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 32px;
    width: 320px;
    max-width: 88vw;
    text-align: center;
  }
  h1 {
    font-family: Georgia, 'Liberation Serif', serif;
    font-size: 20px;
    margin: 0 0 6px;
  }
  p {
    font-size: 13px;
    color: #555;
    margin: 0 0 20px;
  }
  input[type=password] {
    width: 100%;
    padding: 11px 12px;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 15px;
    box-sizing: border-box;
    margin-bottom: 12px;
  }
  button {
    width: 100%;
    background: #163a5c;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 12px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
  }
  .error {
    color: #8a1f1f;
    font-size: 12.5px;
    margin: -8px 0 14px;
  }
</style>
</head>
<body>
  <div class="box">
    <h1>SMB Foods</h1>
    <p>Enter the password to view the wholesale catalog.</p>
    ${showError ? '<div class="error">Incorrect password — please try again.</div>' : ""}
    <form method="POST" action="/login">
      <input type="password" name="password" placeholder="Password" autofocus required>
      <button type="submit">Enter</button>
    </form>
  </div>
</body>
</html>`;
}
