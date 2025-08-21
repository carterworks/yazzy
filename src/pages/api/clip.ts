import type { APIRoute } from "astro";

// app.get("/api/clip", (c) => {
//   const url = c.req.query("url");
//   if (!url) {
//     c.status(400);
//     return c.text(`Value '${url} is not a valid URL'`);
//   }
//   return c.redirect(`/${url}`);
// });

export const prerender = false;
export const GET: APIRoute = async ({ redirect, url }) => {
  const articleUrl = url.searchParams.get("url")?.trim();
  if (!articleUrl) {
    return new Response(`Value '${articleUrl} is not a valid URL'`, {
      status: 400,
    });
  }
  return redirect(`/${articleUrl}`);
};
