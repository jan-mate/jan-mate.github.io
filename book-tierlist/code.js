/* Finished view: no pool, no export button, no video — just tiers.
   It loads ./tierlist.txt (same format as your export) and displays covers from ./covers/.
   If not found, drop a .txt file anywhere on the page to load it. */

   const TIER_KEYS = ['S','A','B','C','D','E','F'];
   const exts = ['.png','.jpg','.jpeg','.webp','.gif','.avif','.bmp']; // for optional guessing if needed
   
   const notice = document.getElementById('notice');
   const txtFileInput = document.getElementById('txtFile');
   
   function showNotice(msg, tone='error', timeoutMs=5200){
     notice.textContent = msg;
     notice.style.background = tone==='ok' ? '#0f1720' : '#1a1010';
     notice.style.color = tone==='ok' ? '#e5e7eb' : '#fca5a5';
     notice.hidden = false;
     if (timeoutMs) setTimeout(() => notice.hidden = true, timeoutMs);
   }
   
   function getTierContainer(tier){
     return document.querySelector(`.tier-items[data-target="${tier}"]`);
   }
   
   function encPathSegments(p){
     return p.split('/').map(encodeURIComponent).join('/');
   }
   
   function norm(s){return (s||'').trim().toLowerCase()}
   function stripQuotes(s){return String(s||'').replace(/^["']|["']$/g,'')}
   
   /* Parse the text format:
      S: a.jpg, b.png
      # comments are ignored
   */
   function parseTierText(text){
     const map = {};
     text.split(/\r?\n/).forEach(lineRaw=>{
       const line = lineRaw.trim();
       if (!line || line.startsWith('#')) return;
       const m = line.match(/^([SA-Fsa-f])\s*:\s*(.+)$/);
       if (!m) return;
       const tier = m[1].toUpperCase();
       const names = m[2]
         .split(',')
         .map(s => stripQuotes(s).trim())
         .filter(Boolean);
       if (!map[tier]) map[tier] = [];
       map[tier].push(...names);
     });
     return map;
   }
   
   function createItem(src, name){
     const el = document.createElement('div');
     el.className = 'item';
     el.dataset.name = norm(name);
   
     const img = new Image();
     img.alt = name;
     img.draggable = false;
     img.loading = 'lazy';
   
     img.onerror = ()=>{ el.classList.add('missing'); };
     img.src = src;
   
     el.appendChild(img);
     return el;
   }
   
   /* If filename has no extension, optionally try common ones.
      This is conservative: if you used the Export output, names already include extensions. */
   async function resolveCoverUrl(name){
     const hasExt = /\.[a-z0-9]+$/i.test(name);
     const candidate = `./covers/${encPathSegments(name)}`;
     if (hasExt) return candidate;
   
     // Try guessing extensions (best-effort)
     for (const ext of exts){
       const url = `./covers/${encPathSegments(name+ext)}`;
       try{
         const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
         if (r.ok) return url;
       }catch(_){}
     }
     // Fallback to original (will show "missing" badge)
     return candidate;
   }
   
   async function renderFromMap(map){
     // Clear tiers
     for (const t of TIER_KEYS){
       const box = getTierContainer(t);
       box.innerHTML = '';
     }
   
     // Place items
     for (const t of TIER_KEYS){
       const names = map[t] || [];
       const box = getTierContainer(t);
       for (const rawName of names){
         const name = stripQuotes(rawName);
         const url = await resolveCoverUrl(name);
         box.appendChild(createItem(url, name));
       }
     }
   }
   
   async function loadTierlistTxt(){
     try{
       const r = await fetch('./tierlist.txt', { cache:'no-store' });
       if (!r.ok) throw new Error('missing');
       const text = await r.text();
       const map = parseTierText(text);
       if (Object.keys(map).length === 0) {
         showNotice('tierlist.txt found but has no valid lines (expected e.g. "A: file1.jpg, file2.png").');
         return;
       }
       await renderFromMap(map);
       showNotice('Loaded tierlist.txt', 'ok', 2200);
     }catch(_){
       showNotice('No tierlist.txt next to this page. Drop a .txt tier list onto the page to load it.', 'error', 7200);
     }
   }
   
   /* Allow dropping a .txt file anywhere to load */
   function wireTxtDrop(){
     document.addEventListener('dragover', e => { e.preventDefault(); });
     document.addEventListener('drop', e => {
       e.preventDefault();
       const f = [...(e.dataTransfer?.files||[])].find(x => x.type === 'text/plain' || (x.name||'').toLowerCase().endsWith('.txt'));
       if (!f) { showNotice('Drop a .txt file.', 'error', 2600); return; }
       const reader = new FileReader();
       reader.onload = async () => {
         const text = String(reader.result || '');
         const map = parseTierText(text);
         if (Object.keys(map).length === 0) {
           showNotice('That file has no valid lines (expected e.g. "B: cover1.jpg, cover2.png").');
           return;
         }
         await renderFromMap(map);
         showNotice(`Loaded ${f.name}`, 'ok', 2600);
       };
       reader.onerror = () => showNotice('Failed reading file.');
       reader.readAsText(f);
     });
   }
   
   /* Optional: press "L" to open a file picker (no visible button) */
   function wireHiddenPicker(){
     document.addEventListener('keydown', (e)=>{
       if ((e.key === 'l' || e.key === 'L') && !e.metaKey && !e.ctrlKey && !e.altKey){
         txtFileInput?.click();
       }
     });
     txtFileInput?.addEventListener('change', ()=>{
       const f = txtFileInput.files?.[0];
       if (!f) return;
       const reader = new FileReader();
       reader.onload = async () => {
         const map = parseTierText(String(reader.result||''));
         if (Object.keys(map).length === 0) { showNotice('No valid lines.'); return; }
         await renderFromMap(map);
         showNotice(`Loaded ${f.name}`, 'ok', 2600);
         txtFileInput.value = '';
       };
       reader.onerror = ()=>{ showNotice('Failed reading file.'); txtFileInput.value=''; };
       reader.readAsText(f);
     });
   }
   
   /* Boot */
   wireTxtDrop();
   wireHiddenPicker();
   loadTierlistTxt();
   