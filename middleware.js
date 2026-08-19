// Password-gates the whole site with a standard browser login prompt
// (HTTP Basic Auth) — but only the password matters. Customers can leave
// the "username" field blank (or type anything) and just enter the
// password. Free to run on Vercel's Hobby plan.
//
// Set this Environment Variable in the Vercel project (Settings ->
// Environments -> Production) before/after adding this file:
//   CATALOG_PASSWORD  e.g. a password of your choice
//
// If it isn't set yet, the site stays locked (fails closed) rather than
// accidentally staying open.

export default function middleware(request) {
  const expectedPass = process.env.CATALOG_PASSWORD;

  if (!expectedPass) {
    return unauthorized();
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Basic ")) {
    try {
      const decoded = atob(authHeader.slice(6));
      const sep = decoded.indexOf(":");
      const pass = decoded.slice(sep + 1);
      if (pass === expectedPass) {
        return; // password OK — continue to the site
      }
    } catch (e) {
      // fall through to unauthorized
    }
  }

  return unauthorized();
}

function unauthorized() {
  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="SMB Foods Wholesale Catalog"' },
  });
}
