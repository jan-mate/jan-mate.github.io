// build.js (CommonJS)
const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

const inDir = path.resolve("blogs");
const outDir = path.resolve("blogs");
fs.mkdirSync(outDir, { recursive: true });

const layout = (title, bodyHtml) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<link rel="icon" href="/favicon.svg" />
<style>
:root{--bg:#0b0c0f;--text:#e9e9ef;--muted:#b7b7c5;--ring-soft:rgba(255,255,255,.12);--max:780px;--pad:20px;--lh:1.6}
*{box-sizing:border-box} html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--text);font:16px/var(--lh) ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Arial;color-scheme:dark}
.home {
  position:fixed;
  top:14px;
  left:14px;
  z-index:10;
  color:var(--text);
  text-decoration:none;
  font-size:.95rem;
}
.home:hover,
.home:focus-visible {
  text-decoration:underline; /* optional, classic link behavior */
}
main{min-height:100svh;display:grid;place-items:start center;padding:calc(var(--pad) + 24px) var(--pad)}
article{width:min(92vw,var(--max))}
article h1{font-size:clamp(26px,4.2vw,36px);line-height:1.2;margin:.2em 0 .6em}
article h2{font-size:clamp(20px,3.2vw,26px);margin:1.6em 0 .6em}
article h3{font-size:clamp(18px,2.6vw,22px);margin:1.2em 0 .5em}
article p,article ul,article ol,article blockquote{margin:0 0 1em}
article a{color:#c9d4ff}
article hr{border:none;border-top:1px solid var(--ring-soft);margin:2em 0}
article code{background:rgba(255,255,255,.06);padding:.2em .4em;border-radius:6px}
pre{background:rgba(255,255,255,.06);padding:14px;border-radius:12px;overflow:auto}
pre code{background:none;padding:0}
img,video{max-width:100%;height:auto;display:block;margin:1em auto}
blockquote{border-left:3px solid var(--ring-soft);padding-left:12px;color:var(--muted)}
</style>
</head><body>
<a class="home" href="/">Home</a>
<main><article>
${bodyHtml}
</article></main>
</body></html>`;

const slugify = s => s.toLowerCase().replace(/[^\w\s-]/g,"").trim().replace(/\s+/g,"-");

if (!fs.existsSync(inDir)) {
  console.error(`Missing folder: ${inDir}. Create it and put .md files inside.`);
  process.exit(1);
}

for (const file of fs.readdirSync(inDir)) {
  if (!file.endsWith(".md")) continue;
  const src = fs.readFileSync(path.join(inDir, file), "utf8");
  const m = src.match(/^#\s+(.+)$/m);                // first H1 becomes title + slug
  const title = m ? m[1].trim() : file.replace(/\.md$/,'');
  const html = md.render(src);
  const outName = slugify(title) + ".html";
  fs.writeFileSync(path.join(outDir, outName), layout(title, html));
  console.log("Wrote", `public/blog/${outName}`);
}
