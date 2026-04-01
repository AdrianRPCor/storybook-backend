/* ==========================================================
   STORYBOOK KDP EDITOR — JS CORE  (versión corregida)
   Fixes aplicados:
   1. Spread KDP: lomo dinámico en px proporcional a páginas reales
   2. backCoverText: triple fallback garantizado
   3. Personajes: campo promptDescription para consistencia visual
   4. buildPrompt: incluye promptDescription en los prompts de imagen
   5. Preview texto: párrafos con salto de línea visual
   6. Índice: fondo blankPageColor en el preview
   ========================================================== */

/* ===================== CONSTANTES PDF ===================== */
const PDF = {
  W: 432, H: 648, MARGIN: 36,
  IMG_PCT: 0.58,
  STORY_COVER_IMG: 0.70,
  PAPER_FACTOR: 0.002252,
  TRIM_W: 6, TRIM_H: 9,
  BLEED: 0.125,
  STORY_COVER_COLORS: ['#1e3a5f','#3b1f5e','#1a4731','#5e1f1f','#1f3d5e','#4a2c1a'],
};

const API_BASE = "https://storybook-backend-production-fc3b.up.railway.app/api/v1";

/* ===================== MODELO ===================== */
const bookData = {
  meta: { id: null, bookTitle: "", bookSubtitle: "", backCoverText: "", spineText: "", createdAt: null, updatedAt: null },
  settings: {
    numStories: 5, pagesPerStory: 10, ageTarget: "5–6",
    storyThemes: [], storyTitles: [],
    trim: "6×9", visualStyle: "Ilustración infantil (cartoon suave)",
    palette: "Pastel calmada", blankPageColor: "#ffffff",
    textBoxColor: "#f9fafb", spineColor: "#1e3a5f"
  },
  stories: [], pages: [],
  characters: { mode: "global", global: [], perStory: {} }
};

const editorState = { currentPageId: null };
const STORAGE_KEY = "sbk-project";
const HISTORY_KEY = "sbk-history";

/* ===================== CEREBRO IA ===================== */
const DEFAULT_BRAIN = `Eres un autor profesional de cuentos infantiles con formación en psicología infantil y pedagogía emocional.

Tu objetivo es crear cuentos para niños de entre {EDAD_OBJETIVO}, pensados para libros físicos vendidos en Amazon KDP.

REGLAS GENERALES:
- Usa un lenguaje claro, cálido y fácil de entender para niños.
- Las frases deben ser cortas o medias, nunca complejas.
- El tono debe ser siempre positivo, calmado y seguro.
- No uses palabras técnicas, violentas ni negativas.
- No moralices directamente, muestra el aprendizaje a través de la historia.
- Siempre debe haber cierre emocional positivo.

ESTRUCTURA DE LOS CUENTOS:
- Cada cuento tiene un protagonista infantil identificable.
- El protagonista enfrenta una situación emocional cotidiana.
- El conflicto se resuelve de forma gradual y respetuosa.

PÁGINAS DE HISTORIA:
- Escribe CADA FRASE en su propia línea.
- Máximo 2-3 frases por párrafo.
- Separa párrafos con una línea en blanco.
- El texto debe caber cómodamente en una página 6x9 con ilustración.
- No repitas información entre páginas.

PÁGINA PARA PADRES:
- Explica qué emoción se trabaja.
- Da orientación clara y práctica para acompañar al niño.

PORTADA:
- Título corto, emocional y atractivo.
- Subtítulo enfocado al beneficio emocional.

Nunca menciones que eres una IA. Escribe siempre como un autor humano experto.`;

/* ===================== UTILS ===================== */
function uid() { return "p_" + Math.random().toString(36).slice(2,9); }
function esc(s) { return String(s||"").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function ensureCharacters() {
  if (!bookData.characters) bookData.characters = { mode:"global", global:[], perStory:{} };
  if (!Array.isArray(bookData.characters.global)) bookData.characters.global = [];
  if (!bookData.characters.perStory) bookData.characters.perStory = {};
}

/* ===================== PERSISTENCIA ===================== */
function bookDataForStorage() {
  const clone = JSON.parse(JSON.stringify(bookData));
  (clone.pages||[]).forEach(p => {
    if (p.imageUrl?.startsWith("data:"))     p.imageUrl     = null;
    if (p.backImageUrl?.startsWith("data:")) p.backImageUrl = null;
  });
  (clone.characters?.global||[]).forEach(c => {
    if (c.imageUrl?.startsWith("data:")) c.imageUrl = null;
  });
  return clone;
}

function saveProject() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bookData: bookDataForStorage(), editorState }));
  } catch(e) {
    try {
      const slim = bookDataForStorage();
      slim.pages = (slim.pages||[]).map(p => ({ ...p, imageUrl: null, backImageUrl: null }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ bookData: slim, editorState }));
    } catch(e2) { console.error("❌ No se pudo guardar:", e2); }
  }
}

function loadProject() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const p = JSON.parse(raw);
    if (p.bookData) {
      Object.assign(bookData, p.bookData);
      if (!Array.isArray(bookData.settings.storyThemes)) bookData.settings.storyThemes = [];
      if (!Array.isArray(bookData.settings.storyTitles)) bookData.settings.storyTitles = [];
      ensureCharacters();
      // Migración: añadir promptDescription si no existe en personajes guardados
      bookData.characters.global.forEach(c => {
        if (!c.promptDescription) c.promptDescription = "";
      });
      syncSettingsUI();
      renderStoryThemes();
      renderStoryTitles();
      renderCharacters();
    }
    if (p.editorState) Object.assign(editorState, p.editorState);
    renderPageList();
    renderStoryList();
    if (bookData.meta?.logoUrl) {
      const fn = document.getElementById("sbk-logo-filename");
      const clr = document.getElementById("sbk-logo-clear");
      if(fn) fn.textContent = "Logo guardado";
      if(clr) clr.style.display = "inline-block";
    }
    if (editorState.currentPageId) selectPage(editorState.currentPageId);
  } catch(e) { console.error("Error cargando proyecto", e); }
}

function resetProject() {
  if (!confirm("¿Borrar el proyecto actual?")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

/* ===================== SINCRONIZAR UI ↔ bookData ===================== */
function syncSettingsUI() {
  const set = (id, val) => { const el=document.getElementById(id); if(el) el.value=val||""; };
  set("sbk-num-stories",     bookData.settings.numStories);
  set("sbk-pages-per-story", bookData.settings.pagesPerStory);
  set("sbk-age",             bookData.settings.ageTarget);
  set("sbk-blank-page-color",bookData.settings.blankPageColor);
  set("sbk-textbox-color",   bookData.settings.textBoxColor);
  set("sbk-trim",            bookData.settings.trim);
  set("sbk-visual-style",    bookData.settings.visualStyle);
  set("sbk-palette",         bookData.settings.palette);
  set("sbk-book-title",      bookData.meta.bookTitle);
  set("sbk-book-subtitle",   bookData.meta.bookSubtitle);
  set("sbk-back-cover-text", bookData.meta.backCoverText);
  const spineEl=document.getElementById("sbk-spine-text");
  if(spineEl){ spineEl.value=bookData.meta.spineText||""; spineEl.placeholder=bookData.meta.bookTitle||"Igual al título del libro"; }
  set("sbk-spine-color", bookData.settings.spineColor||"#1e3a5f");
  set("sbk-character-mode",  bookData.characters.mode);
  set("sbk-character-count", bookData.characters.global.length);
  document.documentElement.style.setProperty("--textBoxColor", bookData.settings.textBoxColor||"#f9fafb");
  requestAnimationFrame(()=>{
    const t=document.getElementById("sbk-book-title");
    const s=document.getElementById("sbk-book-subtitle");
    const b=document.getElementById("sbk-back-cover-text");
    if(t && t.value!==bookData.meta.bookTitle) t.value=bookData.meta.bookTitle||"";
    if(s && s.value!==bookData.meta.bookSubtitle) s.value=bookData.meta.bookSubtitle||"";
    if(b && b.value!==bookData.meta.backCoverText) b.value=bookData.meta.backCoverText||"";
  });
}

function bindGlobalInputs() {
  const bind = (id, fn) => { const el=document.getElementById(id); if(el) el.addEventListener("input", fn); };
  const bindChange = (id, fn) => { const el=document.getElementById(id); if(el) el.addEventListener("change", fn); };

  bind("sbk-num-stories",     e => { bookData.settings.numStories=+e.target.value; renderStoryThemes(); renderStoryTitles(); });
  bind("sbk-pages-per-story", e => { bookData.settings.pagesPerStory=+e.target.value; });
  bindChange("sbk-age",       e => { bookData.settings.ageTarget=e.target.value; });
  bind("sbk-blank-page-color",e => { bookData.settings.blankPageColor=e.target.value; });
  bind("sbk-textbox-color",   e => {
    bookData.settings.textBoxColor=e.target.value;
    document.documentElement.style.setProperty("--textBoxColor", e.target.value);
    saveProject();
  });
  bind("sbk-book-title",      e => { bookData.meta.bookTitle=e.target.value; updateCoverPreview(); });
  bind("sbk-book-subtitle",   e => { bookData.meta.bookSubtitle=e.target.value; updateCoverPreview(); });
  bind("sbk-back-cover-text", e => { bookData.meta.backCoverText=e.target.value; updateCoverPreview(); });
  bind("sbk-spine-text",      e => { bookData.meta.spineText=e.target.value; updateCoverPreview(); });
  bind("sbk-spine-color",     e => { bookData.settings.spineColor=e.target.value; updateCoverPreview(); });
  bindChange("sbk-trim",         e => { bookData.settings.trim=e.target.value; });
  bindChange("sbk-visual-style", e => { bookData.settings.visualStyle=e.target.value; });
  bindChange("sbk-palette",      e => { bookData.settings.palette=e.target.value; });
}

/* ===================== TEMÁTICAS Y TÍTULOS ===================== */
function renderStoryThemes() {
  const c = document.getElementById("sbk-story-themes"); if(!c) return;
  c.innerHTML="";
  const n = +bookData.settings.numStories||0;
  while(bookData.settings.storyThemes.length<n) bookData.settings.storyThemes.push("");
  while(bookData.settings.storyThemes.length>n) bookData.settings.storyThemes.pop();
  for(let i=0;i<n;i++){
    const lbl=document.createElement("label"); lbl.className="sbk__label";
    lbl.innerHTML=`<span>Cuento ${i+1}</span>`;
    const inp=document.createElement("input"); inp.className="sbk__input";
    inp.placeholder="Ej: aprender a compartir"; inp.value=bookData.settings.storyThemes[i]||"";
    inp.addEventListener("input",()=>{ bookData.settings.storyThemes[i]=inp.value; saveProject(); });
    lbl.appendChild(inp); c.appendChild(lbl);
  }
}

function renderStoryTitles() {
  const c = document.getElementById("sbk-story-titles"); if(!c) return;
  c.innerHTML="";
  const n = +bookData.settings.numStories||0;
  while(bookData.settings.storyTitles.length<n) bookData.settings.storyTitles.push("");
  while(bookData.settings.storyTitles.length>n) bookData.settings.storyTitles.pop();
  for(let i=0;i<n;i++){
    const lbl=document.createElement("label"); lbl.className="sbk__label";
    lbl.innerHTML=`<span>Cuento ${i+1} · Título</span>`;
    const inp=document.createElement("input"); inp.className="sbk__input";
    inp.placeholder="Ej: El dragón que aprendió a compartir";
    const story=bookData.stories[i];
    inp.value=story?.title||bookData.settings.storyTitles[i]||"";
    inp.addEventListener("input",()=>{
      bookData.settings.storyTitles[i]=inp.value;
      if(bookData.stories[i]) bookData.stories[i].title=inp.value;
      renderPageList(); saveProject();
    });
    lbl.appendChild(inp); c.appendChild(lbl);
  }
}

/* ===================== PERSONAJES =====================
   FIX: se añade campo "Descripción para prompt de imagen"
   (promptDescription) separado del campo de presentación.
   Esto permite dar instrucciones técnicas precisas a la IA
   de imágenes sin mezclarlas con el texto narrativo.
   ========================================================= */
function renderCharacters() {
  const c = document.getElementById("sbk-characters-container"); if(!c) return;
  c.innerHTML="";
  ensureCharacters();
  bookData.characters.global.forEach(char=>{
    const card=document.createElement("div"); card.className="sbk__characterCard";

    // Imagen del personaje
    const imgDiv=document.createElement("div"); imgDiv.className="sbk__characterImage";
    if(char.imageUrl){ imgDiv.style.backgroundImage=`url("${char.imageUrl}")`; imgDiv.style.backgroundSize="cover"; }
    else { imgDiv.textContent="Imagen personaje"; }

    // Botón subir imagen de referencia
    const uploadWrap=document.createElement("div");
    uploadWrap.style.cssText="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;";
    const fileInput=document.createElement("input"); fileInput.type="file"; fileInput.accept="image/*"; fileInput.style.display="none";
    const uploadBtn=document.createElement("button"); uploadBtn.className="sbk__btn sbk__btn--small";
    uploadBtn.textContent="📎 Subir imagen ref.";
    uploadBtn.title="Sube una imagen de referencia del personaje (no se envía a la IA de imágenes, es solo para que tú lo veas)";
    uploadBtn.addEventListener("click",()=>fileInput.click());
    fileInput.addEventListener("change", e=>{
      const file=e.target.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=ev=>{
        char.imageUrl=ev.target.result;
        imgDiv.style.backgroundImage=`url("${char.imageUrl}")`;
        imgDiv.style.backgroundSize="cover";
        imgDiv.textContent="";
        saveProject();
      };
      reader.readAsDataURL(file);
    });

    // Botón generar imagen con IA
    const regenBtn=document.createElement("button"); regenBtn.className="sbk__btn sbk__btn--small sbk__btn--primary";
    regenBtn.textContent="✨ Generar IA";
    regenBtn.addEventListener("click",async()=>{
      const promptDesc = char.promptDescription || char.description || "";
      const prompt=`Ilustración infantil. Personaje: ${char.name||"personaje"}. ${promptDesc}. Estilo: ${bookData.settings.visualStyle}. Paleta: ${bookData.settings.palette}. Fondo blanco. Cuerpo completo. Sin texto ni letras en la imagen.`;
      try {
        regenBtn.textContent="...";
        const url=await callImageAPI(prompt);
        char.imageUrl=url;
        imgDiv.style.backgroundImage=`url("${char.imageUrl}")`;
        imgDiv.style.backgroundSize="cover";
        imgDiv.textContent="";
        saveProject();
        regenBtn.textContent="✨ Generar IA";
      } catch(e){ alert("Error generando imagen del personaje"); regenBtn.textContent="✨ Generar IA"; }
    });

    uploadWrap.appendChild(fileInput);
    uploadWrap.appendChild(uploadBtn);
    uploadWrap.appendChild(regenBtn);

    // Nombre
    const nameInp=document.createElement("input"); nameInp.className="sbk__input";
    nameInp.placeholder="Nombre del personaje"; nameInp.value=char.name||"";
    nameInp.style.marginBottom="6px";
    nameInp.addEventListener("input",()=>{ char.name=nameInp.value; saveProject(); });

    // Descripción narrativa (para el texto del cuento)
    const descLabel=document.createElement("div");
    descLabel.className="sbk__muted sbk__muted--tiny";
    descLabel.textContent="Descripción (para el texto del cuento)";
    descLabel.style.marginBottom="3px";
    const descArea=document.createElement("textarea"); descArea.className="sbk__textarea";
    descArea.rows=2; descArea.style.marginBottom="6px";
    descArea.placeholder="Ej: unicornio rosa tímido que aprende a hacer amigos";
    descArea.value=char.description||"";
    descArea.addEventListener("input",()=>{ char.description=descArea.value; saveProject(); });

    // FIX: Descripción técnica para prompt de imagen (para la IA de imágenes)
    const promptLabel=document.createElement("div");
    promptLabel.className="sbk__muted sbk__muted--tiny";
    promptLabel.textContent="Descripción para prompt de imagen (rasgos exactos para IA)";
    promptLabel.style.marginBottom="3px";
    const promptDescArea=document.createElement("textarea"); promptDescArea.className="sbk__textarea";
    promptDescArea.rows=3;
    promptDescArea.placeholder="Ej: unicorn foal, pink coat, golden horn, orange wavy mane, big dark eyes, chubby cheeks, watercolor soft style, no background text";
    promptDescArea.value=char.promptDescription||"";
    promptDescArea.addEventListener("input",()=>{ char.promptDescription=promptDescArea.value; saveProject(); });

    card.appendChild(imgDiv);
    card.appendChild(uploadWrap);
    card.appendChild(nameInp);
    card.appendChild(descLabel);
    card.appendChild(descArea);
    card.appendChild(promptLabel);
    card.appendChild(promptDescArea);
    c.appendChild(card);
  });
}

/* ===================== GENERAR ESTRUCTURA ===================== */
function generateBookStructure() {
  bookData.pages=[]; bookData.stories=[];
  const { numStories, pagesPerStory, blankPageColor } = bookData.settings;
  let order=0;
  const blank=()=>({ id:uid(), type:"blank", color:blankPageColor, order:order++ });

  bookData.pages.push({ id:uid(), type:"cover", title:"", subtitle:"", backText:"", imagePrompt:"", imageUrl:null, backImagePrompt:"", backImageUrl:null, order:order++ });
  bookData.pages.push(blank());
  bookData.pages.push({ id:uid(), type:"index", text:"", imagePrompt:"", imageUrl:null, order:order++ });

  for(let i=0;i<numStories;i++){
    const storyId=uid();
    const story={ id:storyId, index:i, title:bookData.settings.storyTitles[i]||`Cuento ${i+1}`, theme:bookData.settings.storyThemes[i]||"", pages:[] };
    bookData.pages.push({ id:uid(), type:"story-cover", storyId, title:story.title, imagePrompt:"", imageUrl:null, order:order++ });
    for(let p=0;p<pagesPerStory;p++){
      const pg={ id:uid(), type:"story", storyId, pageNumber:p+1, text:"", imagePrompt:"", imageUrl:null, order:order++ };
      story.pages.push(pg.id); bookData.pages.push(pg);
    }
    bookData.stories.push(story);
  }

  bookData.pages.push({ id:uid(), type:"closing", text:"", imagePrompt:"", imageUrl:null, order:order++ });
  bookData.pages.push({ id:uid(), type:"adult-guide", text:"", order:order++ });
  bookData.pages.push({ id:uid(), type:"ngo", text:"", order:order++ });
  bookData.pages.push(blank());

  renderPageList(); renderStoryList();
  if(bookData.pages[0]) selectPage(bookData.pages[0].id);
}

async function generateFullBookText() {
  for(const page of bookData.pages){
    if(page.type==="index") continue;
    const needs=["cover","story-cover","story","closing","adult-guide","ngo"].includes(page.type);
    if(!needs) continue;
    try {
      const text=await callTextAPI(page);
      if(page.type==="cover"){
        const lines=text.split("\n").map(l=>l.trim()).filter(Boolean);
        // FIX: parsear por prefijos TÍTULO: / SUBTÍTULO: / CONTRAPORTADA:
        const titleLine   = lines.find(l => /^T[IÍ]TULO\s*:/i.test(l));
        const subtitleLine= lines.find(l => /^SUBT[IÍ]TULO\s*:/i.test(l));
        const backIdx     = lines.findIndex(l => /^CONTRAPORTADA\s*:/i.test(l));

        page.title    = (titleLine    || lines[0] || "").replace(/^T[IÍ]TULO\s*:/i,"").trim();
        page.subtitle = (subtitleLine || lines[1] || "").replace(/^SUBT[IÍ]TULO\s*:/i,"").trim();
        page.backText = backIdx >= 0
          ? lines.slice(backIdx+1).join("\n").trim()
          : lines.slice(2).join("\n").trim();
        page.text=text;

        bookData.meta.bookTitle    = page.title;
        bookData.meta.bookSubtitle = page.subtitle;
        bookData.meta.backCoverText= page.backText;

        console.log("✅ Portada:", { title:page.title, subtitle:page.subtitle, backText:page.backText?.slice(0,60) });
      } else if(page.type==="story-cover"){
        page.title=text.trim(); page.text=text.trim();
        const idx=bookData.stories.findIndex(s=>s.id===page.storyId);
        if(idx!==-1){ bookData.stories[idx].title=text.trim(); bookData.settings.storyTitles[idx]=text.trim(); }
      } else { page.text=text; }
    } catch(e){ console.error("Error texto:", page.type, e); }
  }

  // Índice
  const indexPage=bookData.pages.find(p=>p.type==="index");
  if(indexPage){
    const lines=[];
    bookData.stories.forEach((story,i)=>{
      const cp=bookData.pages.find(p=>p.type==="story-cover"&&p.storyId===story.id);
      if(cp) lines.push(fmtIndexLine(`${i+1}. ${story.title||`Cuento ${i+1}`}`, cp.order+1));
    });
    lines.push("");
    const cl=bookData.pages.find(p=>p.type==="closing");
    const al=bookData.pages.find(p=>p.type==="adult-guide");
    const nl=bookData.pages.find(p=>p.type==="ngo");
    if(cl) lines.push(fmtIndexLine("Página final emocional", cl.order+1));
    if(al) lines.push(fmtIndexLine("Guía para adultos", al.order+1));
    if(nl) lines.push(fmtIndexLine("Sobre la ONG", nl.order+1));
    indexPage.text=lines.join("\n");
  }

  syncSettingsUI();
  const _setVal=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v||""; };
  _setVal("sbk-book-title",      bookData.meta.bookTitle);
  _setVal("sbk-book-subtitle",   bookData.meta.bookSubtitle);
  _setVal("sbk-back-cover-text", bookData.meta.backCoverText);
  _setVal("sbk-spine-text",      bookData.meta.spineText||bookData.meta.bookTitle);

  renderStoryTitles(); renderPageList(); renderStoryList();
  saveProject();

  const coverPage=bookData.pages.find(p=>p.type==="cover");
  if(coverPage) selectPage(coverPage.id);
  alert("Textos generados correctamente ✍️");
}

function fmtIndexLine(title, num) {
  const total=58, ps=String(num);
  const dots=".".repeat(Math.max(4, total-title.length-ps.length-2));
  return `${title} ${dots} ${ps}`;
}

async function generateImagesForBook() {
  if(!confirm("Esto generará TODAS las imágenes. ¿Continuar?")) return;
  for(const page of bookData.pages){
    const needs=["cover","story-cover","story"].includes(page.type);
    if(!needs) continue;
    if(page.type!=="cover" && !page.text?.trim()) continue;
    if(!page.imagePrompt?.trim()) page.imagePrompt=buildPrompt(page);
    try {
      page.imageUrl=await callImageAPI(page.imagePrompt);
      if(page.type==="cover"){
        page.backImagePrompt=buildBackPrompt(page);
        page.backImageUrl=await callImageAPI(page.backImagePrompt);
      }
    } catch(e){ console.error("Error imagen:", page.type, e); }
  }
  saveProject();
  if(editorState.currentPageId) selectPage(editorState.currentPageId);
  alert("Imágenes generadas ✅");
}

/* ===================== PROMPT BUILDERS =====================
   FIX: usa promptDescription (si existe) para máxima consistencia visual.
   El campo promptDescription contiene rasgos técnicos precisos para la IA
   de imágenes: color exacto del pelaje, forma del cuerno, ropa, etc.
   ========================================================= */
function buildCharPromptBlock() {
  return (bookData.characters?.global||[])
    .map(c => {
      const desc = c.promptDescription || c.description || "";
      return `${c.name||"character"}: ${desc}`;
    })
    .join(". ");
}

function buildPrompt(page) {
  const story=page.storyId ? bookData.stories.find(s=>s.id===page.storyId) : null;
  const theme=story?.theme||"emoción infantil";
  const chars=buildCharPromptBlock();
  const sty=bookData.settings.visualStyle, pal=bookData.settings.palette;

  // Instrucción de consistencia para IA de imágenes
  const consistencyNote = chars
    ? `IMPORTANT: keep EXACT same character design in every image: ${chars}.`
    : "";

  if(page.type==="cover")
    return `Children's book FRONT COVER illustration. Vertical 6x9. Style: ${sty}. Palette: ${pal}. ${consistencyNote} Theme: ${bookData.meta.bookTitle}. NO TEXT in image.`;
  if(page.type==="story-cover")
    return `Children's book chapter cover illustration. Vertical 6x9. Style: ${sty}. Palette: ${pal}. ${consistencyNote} Theme: ${theme}. Chapter title: ${page.title||""}. NO TEXT in image.`;
  return `Children's book interior illustration. Vertical 6x9. Style: ${sty}. Palette: ${pal}. ${consistencyNote} Scene: "${page.text||""}". NO TEXT in image.`;
}

function buildBackPrompt(page) {
  const chars=buildCharPromptBlock();
  const consistencyNote = chars
    ? `IMPORTANT: keep EXACT same character design: ${chars}.`
    : "";
  return `Children's book BACK COVER illustration. Vertical 6x9. Style: ${bookData.settings.visualStyle}. Palette: ${bookData.settings.palette}. ${consistencyNote} Top 40% clear for text overlay. Characters smiling at bottom. Theme: ${bookData.meta.bookTitle}. NO TEXT in image.`;
}

/* ===================== APIs ===================== */
async function callTextAPI(page) {
  const story=page.storyId ? bookData.stories.find(s=>s.id===page.storyId) : null;
  const brain=document.getElementById("sbk-brain-text")?.value||DEFAULT_BRAIN;
  const res=await fetch(`${API_BASE}/generation/chapter-content`,{
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ page, story, settings:{...bookData.settings, bookTitle:bookData.meta.bookTitle, bookSubtitle:bookData.meta.bookSubtitle, storyTitles:bookData.settings.storyTitles}, brain, pages:bookData.pages, characters:bookData.characters.global })
  });
  if(!res.ok) throw new Error(await res.text());
  return (await res.json()).text;
}

async function callImageAPI(prompt) {
  const res=await fetch(`${API_BASE}/generation/scene`,{
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ prompt, coloring:false })
  });
  if(!res.ok) throw new Error(await res.text());
  const data=await res.json();
  if(data.imageUrl) return data.imageUrl;
  if(data.url) return data.url;
  const fid=data.file_id||data.fileId||data.id;
  if(fid) return `${API_BASE}/generation/scene/${fid}`;
  throw new Error("Respuesta inesperada de imagen");
}

/* ===================== RENDER PAGE LIST ===================== */
function getPageLabel(page) {
  const icons={ cover:"📘", blank:"⬜", index:"📑", "story-cover":"📖", story:"📄", closing:"🌈", "adult-guide":"📘", ngo:"🤝" };
  const icon=icons[page.type]||"📄";
  if(page.type==="cover")       return `${icon} Portada del libro`;
  if(page.type==="blank")       return `${icon} Página en blanco`;
  if(page.type==="index")       return `${icon} Índice`;
  if(page.type==="story-cover") return `${icon} Portada · ${getStoryTitle(page.storyId)}`;
  if(page.type==="story")       return `${icon} ${getStoryTitle(page.storyId)} · p.${page.pageNumber}`;
  if(page.type==="closing")     return `${icon} Página final emocional`;
  if(page.type==="adult-guide") return `${icon} Guía para quien acompaña`;
  if(page.type==="ngo")         return `${icon} Página ONG`;
  return page.type;
}
function getStoryTitle(storyId) {
  return bookData.stories.find(s=>s.id===storyId)?.title||"Cuento";
}

function renderPageList() {
  const list=document.getElementById("sbk-page-list"); if(!list) return;
  list.innerHTML="";
  bookData.pages.forEach(page=>{
    const btn=document.createElement("button"); btn.className="sbk__item";
    btn.dataset.pageId=page.id;
    btn.innerHTML=`<span class="sbk__itemTitle">${getPageLabel(page)}</span>`;
    if(page.type==="blank") btn.style.opacity="0.5";
    btn.addEventListener("click",()=>selectPage(page.id));
    if(editorState.currentPageId===page.id) btn.classList.add("sbk__item--active");
    list.appendChild(btn);
  });
}

function renderStoryList() {
  const list=document.getElementById("sbk-story-list"); if(!list) return;
  list.innerHTML="";
  if(!bookData.stories.length){ list.innerHTML=`<div class="sbk__muted sbk__muted--tiny">Genera el libro para ver los cuentos</div>`; return; }
  bookData.stories.forEach((story,i)=>{
    const btn=document.createElement("button"); btn.className="sbk__item";
    const pgs=story.pages?.length||bookData.settings.pagesPerStory;
    btn.innerHTML=`<div class="sbk__itemLeft"><div class="sbk__itemTitle">${story.title||`Cuento ${i+1}`}</div><div class="sbk__itemMeta">${pgs} páginas · ${story.theme||"sin temática"}</div></div><span class="sbk__tag">C${i+1}</span>`;
    const cp=bookData.pages.find(p=>p.type==="story-cover"&&p.storyId===story.id);
    if(cp) btn.addEventListener("click",()=>selectPage(cp.id));
    list.appendChild(btn);
  });
}

/* ===================== EDITOR DE PÁGINA ===================== */
function selectPage(pageId) {
  const page=bookData.pages.find(p=>p.id===pageId); if(!page) return;
  editorState.currentPageId=pageId;
  document.querySelectorAll(".sbk__item[data-page-id]").forEach(el=>{
    el.classList.toggle("sbk__item--active", el.dataset.pageId===pageId);
  });
  const titleEl=document.getElementById("sbk-editor-title");
  const subtEl=document.getElementById("sbk-editor-subtitle");
  if(titleEl) titleEl.textContent=getPageLabel(page);
  if(subtEl) subtEl.textContent=page.type==="blank"?"Página en blanco (sin contenido editable)":"Preview fiel al PDF · 6×9\"";
  renderPagePreview(page);
  loadPageControls(page);
  saveProject();
}

function getCurrentPage() {
  return bookData.pages.find(p=>p.id===editorState.currentPageId)||null;
}

/* ===================== PREVIEW ===================== */
function renderPagePreview(page) {
  const mock=document.getElementById("sbk-page-mock");
  const spread=document.getElementById("sbk-cover-spread");
  const dimsBar=document.getElementById("sbk-dims-bar");
  if(!mock||!spread) return;

  const isCover=page.type==="cover";
  mock.style.display   = isCover ? "none" : "block";
  spread.style.display = isCover ? "flex"  : "none";
  dimsBar.style.display= isCover ? "flex"  : "none";

  if(isCover){ renderCoverSpread(page); return; }

  mock.className="sbk__pageMock";
  const imgArea=document.getElementById("sbk-img-area");
  const imgPlaceholder=document.getElementById("sbk-img-placeholder");
  const imgReal=document.getElementById("sbk-img-real");
  const textArea=document.getElementById("sbk-text-area");
  const textPreview=document.getElementById("sbk-text-preview");
  const pageNumEl=document.getElementById("sbk-page-num");

  if(!imgArea||!textArea||!textPreview) return;

  if(page.imageUrl){
    imgReal.src=page.imageUrl; imgReal.style.display="block";
    imgPlaceholder.style.display="none";
  } else {
    imgReal.style.display="none"; imgPlaceholder.style.display="flex";
    imgPlaceholder.textContent=page.imagePrompt ? "Imagen IA pendiente" : "Imagen IA";
  }

  if(page.type==="story"){
    imgArea.style.display="flex"; imgArea.style.height="62.9%";
    textArea.style.background=bookData.settings.textBoxColor||"#f9fafb";
    if(pageNumEl) pageNumEl.textContent=page.pageNumber||"";
    // FIX: renderizar párrafos con saltos de línea visibles
    renderStoryTextPreview(page.text||"", textPreview);

  } else if(page.type==="story-cover"){
    mock.classList.add("sbk__pageMock--storyCover");
    const idx=bookData.stories.findIndex(s=>s.id===page.storyId);
    const color=PDF.STORY_COVER_COLORS[Math.max(0,idx)%PDF.STORY_COVER_COLORS.length];
    mock.style.setProperty("--storyCoverColor", color);
    imgArea.style.display="flex"; imgArea.style.height="70%";
    if(pageNumEl) pageNumEl.textContent="";
    textPreview.textContent=page.title||"";

  } else if(page.type==="index"){
    mock.classList.add("sbk__pageMock--index");
    // FIX: fondo del índice usa blankPageColor
    mock.style.background=bookData.settings.blankPageColor||"#ffffff";
    imgArea.style.display="none";
    if(pageNumEl) pageNumEl.textContent="";
    renderIndexPreview(page.text||"", textPreview);

  } else if(page.type==="adult-guide"||page.type==="ngo"||page.type==="closing"){
    mock.classList.add("sbk__pageMock--textOnly");
    imgArea.style.display="none";
    if(pageNumEl) pageNumEl.textContent="";
    mock.style.background=bookData.settings.blankPageColor||"#ffffff";
    const sectionTitles={"closing":"Moraleja","adult-guide":"Para quien lee este cuento","ngo":"Sobre Proyecto Arena"};
    const accentColors ={"closing":"#7c3aed","adult-guide":"#0e7490","ngo":"#15803d"};
    const sTitle=sectionTitles[page.type]||"";
    const aColor=accentColors[page.type]||"#1e3a5f";
    const cleanText=(page.text||"").replace(/\*\*(.*?)\*\*/g,"$1").replace(/\*(.*?)\*/g,"$1").replace(/#+\s/g,"");
    // FIX: banda de color en el preview igual que en el PDF
    textPreview.innerHTML=`<div style="background:${aColor};color:#fff;font-size:9px;font-weight:900;padding:4px 6px;margin:-6px -8px 6px;text-align:center;letter-spacing:0.5px;">${sTitle}</div>${esc(cleanText).replace(/\n/g,"<br>")}`;

  } else if(page.type==="blank"){
    imgArea.style.display="none";
    textArea.style.background=page.color||bookData.settings.blankPageColor||"#ffffff";
    if(pageNumEl) pageNumEl.textContent="";
    textPreview.textContent="";

  } else {
    imgArea.style.display="flex"; imgArea.style.height="62.9%";
    textPreview.textContent=page.text||"";
  }
}

// FIX: párrafos cortos en el preview de story
function renderStoryTextPreview(text, container) {
  if(!text.trim()){ container.textContent=""; return; }
  // Dividir por saltos de línea, o por punto + mayúscula si viene en bloque
  let paragraphs = text.split(/\n+/).map(p=>p.trim()).filter(p=>p.length>0);
  if(paragraphs.length<=1 && text.length>80){
    paragraphs = text.split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÜÑ¿¡"])/).map(p=>p.trim()).filter(p=>p.length>0);
  }
  container.innerHTML = paragraphs.map(p=>`<div style="margin-bottom:4px;">${esc(p)}</div>`).join("");
}

function renderIndexPreview(text, container) {
  const lines=(text||"").split("\n").filter(l=>l.trim());
  const rows=lines.map(line=>{
    const m=line.match(/^(.*?)\.{2,}\s*(\d+)\s*$/);
    if(!m) return "";
    const t=m[1].trim(), n=m[2];
    return `<div class="sbk__indexRow"><span class="sbk__indexRowTitle">${esc(t)}</span><span class="sbk__indexDots"></span><span class="sbk__indexRowPage">${n}</span></div>`;
  }).join("");
  container.innerHTML=`<div class="sbk__indexWrapper"><div class="sbk__indexHeading">ÍNDICE</div><div class="sbk__indexList">${rows}</div></div>`;
}

/* ===================== COVER SPREAD =====================
   FIX: lomo dinámico — el ancho en px se calcula como en generateCoverPdf
   para que el preview coincida exactamente con el PDF exportado.
   ========================================================= */
function renderCoverSpread(page) {
  const title     = bookData.meta.bookTitle    || "Título del libro";
  const subtitle  = bookData.meta.bookSubtitle || "";
  const backText  = bookData.meta.backCoverText || page?.backText || "Texto de contraportada…";
  const spineText = bookData.meta.spineText    || title;
  const spineColor= bookData.settings.spineColor || "#1e3a5f";

  const setTxt=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  setTxt("sbk-cover-front-title",       title);
  setTxt("sbk-cover-front-subtitle",    subtitle);
  setTxt("sbk-cover-back-text-preview", backText);
  setTxt("sbk-spine-text-preview",      spineText);

  // FIX: calcular ancho del lomo en px proporcional a las páginas reales
  // El preview usa 300px por cada 6" de portada/contraportada (escala 50px/inch)
  // Lomo en pulgadas = pageCount * PAPER_FACTOR
  // Lomo en px = spineIn * 50 (= 300/6)
  const realPageCount = bookData.pages.length || 68;
  const spineIn = realPageCount * PDF.PAPER_FACTOR;
  const spinePx = Math.max(10, Math.round(spineIn * 50)); // 50px por pulgada en el preview

  const spineEl=document.getElementById("sbk-cover-spine");
  if(spineEl){
    spineEl.style.background=spineColor;
    spineEl.style.width=`${spinePx}px`;
  }

  // Actualizar también las zonas back/front para que sean exactamente 300px
  const backEl =document.getElementById("sbk-cover-back");
  const frontEl=document.getElementById("sbk-cover-front");
  if(backEl)  { backEl.style.width="300px";  backEl.style.height="450px"; }
  if(frontEl) { frontEl.style.width="300px"; frontEl.style.height="450px"; }

  // Dimensiones informativas
  const totalIn = PDF.TRIM_W * 2 + spineIn;
  const bleedW  = totalIn + PDF.BLEED * 2;
  const bleedH  = PDF.TRIM_H + PDF.BLEED * 2;
  const setDim=(id,v)=>{ const el=document.getElementById(id); if(el) el.innerHTML=v; };
  setDim("sbk-dim-spread", `${totalIn.toFixed(3)}" × 9"`);
  setDim("sbk-dim-spine",  `${spineIn.toFixed(3)}"`);
  setDim("sbk-dim-bleed",  `${bleedW.toFixed(2)}" × ${bleedH.toFixed(2)}"`);

  // Imágenes
  const frontImg=document.getElementById("sbk-front-img");
  const backImg=document.getElementById("sbk-back-img");
  if(frontImg){ if(page.imageUrl){ frontImg.src=page.imageUrl; frontImg.style.display="block"; } else { frontImg.style.display="none"; } }
  if(backImg) { if(page.backImageUrl){ backImg.src=page.backImageUrl; backImg.style.display="block"; } else { backImg.style.display="none"; } }

  const backFill=document.getElementById("sbk-cover-back-fill");
  if(backFill) backFill.style.background=page.backImageUrl?"transparent":"rgba(30,58,95,0.85)";

  // Logo
  const logoUrl=bookData.meta.logoUrl||null;
  const logoWrap=document.getElementById("sbk-cover-logo-wrap");
  const logoImg=document.getElementById("sbk-cover-logo-preview");
  const logoFrontWrap=document.getElementById("sbk-cover-logo-front");
  const logoFrontImg=document.getElementById("sbk-cover-logo-front-preview");
  if(logoUrl){
    if(logoWrap){ logoWrap.style.display="block"; }
    if(logoImg){ logoImg.src=logoUrl; }
    if(logoFrontWrap){ logoFrontWrap.style.display="block"; }
    if(logoFrontImg){ logoFrontImg.src=logoUrl; }
  } else {
    if(logoWrap) logoWrap.style.display="none";
    if(logoFrontWrap) logoFrontWrap.style.display="none";
  }

  const logoFilename=document.getElementById("sbk-logo-filename");
  const logoClearBtn=document.getElementById("sbk-logo-clear");
  if(logoUrl){
    if(logoFilename) logoFilename.textContent="Logo cargado";
    if(logoClearBtn) logoClearBtn.style.display="inline-block";
  } else {
    if(logoFilename) logoFilename.textContent="Sin logo";
    if(logoClearBtn) logoClearBtn.style.display="none";
  }
}

function updateCoverPreview() {
  const page=getCurrentPage();
  if(page?.type==="cover") renderCoverSpread(page);
}

/* ===================== CONTROLES EDITOR ===================== */
function loadPageControls(page) {
  const normalPanel = document.getElementById("sbk-controls-normal");
  const coverPanel  = document.getElementById("sbk-controls-cover");

  if(page.type==="cover"){
    if(normalPanel) normalPanel.style.display="none";
    if(coverPanel)  coverPanel.style.display="block";
    const grid=document.getElementById("sbk-editor-grid");
    if(grid) grid.classList.add("sbk__editorGrid--cover");

    const sv=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v||""; };
    sv("sbk-cover-title-edit",    bookData.meta.bookTitle);
    sv("sbk-cover-subtitle-edit", bookData.meta.bookSubtitle);
    // FIX: cargar backCoverText con fallback a page.backText
    sv("sbk-cover-back-edit",     bookData.meta.backCoverText || page.backText || "");
    sv("sbk-cover-spine-edit",    bookData.meta.spineText||bookData.meta.bookTitle);
    const scEl=document.getElementById("sbk-cover-spine-color-edit");
    if(scEl) scEl.value=bookData.settings.spineColor||"#1e3a5f";
    sv("sbk-cover-front-prompt",  page.imagePrompt||"");
    sv("sbk-cover-back-prompt",   page.backImagePrompt||"");

    const regenImgBtn=document.getElementById("sbk-regen-image");
    if(regenImgBtn){ regenImgBtn.disabled=true; regenImgBtn.style.opacity="0.4"; }
    return;
  }

  if(normalPanel) normalPanel.style.display="block";
  if(coverPanel)  coverPanel.style.display="none";
  const grid=document.getElementById("sbk-editor-grid");
  if(grid) grid.classList.remove("sbk__editorGrid--cover");

  const textEditor=document.getElementById("sbk-text-editor");
  const promptEditor=document.getElementById("sbk-prompt-editor");
  const promptLabel=document.getElementById("sbk-prompt-label");
  const regenImgBtn=document.getElementById("sbk-regen-image");
  const regenImgCtrl=document.getElementById("sbk-regen-image-ctrl");

  if(!textEditor||!promptEditor) return;
  const noImage=["index","adult-guide","ngo","blank"].includes(page.type);
  textEditor.value=page.text||"";
  promptEditor.value=page.imagePrompt||"";
  promptEditor.disabled=noImage;
  if(promptLabel) promptLabel.style.opacity=noImage?"0.45":"1";
  if(regenImgBtn){ regenImgBtn.disabled=noImage; regenImgBtn.style.opacity=noImage?"0.4":"1"; }
  if(regenImgCtrl){ regenImgCtrl.disabled=noImage; regenImgCtrl.style.opacity=noImage?"0.4":"1"; }
}

function bindEditorControls() {
  const textEditor=document.getElementById("sbk-text-editor");
  const promptEditor=document.getElementById("sbk-prompt-editor");

  if(textEditor){
    textEditor.addEventListener("input",()=>{
      const page=getCurrentPage(); if(!page) return;
      if(page.type==="cover"){
        const lines=textEditor.value.split("\n").map(l=>l.trim()).filter(Boolean);
        const titleLine   = lines.find(l=>/^T[IÍ]TULO\s*:/i.test(l));
        const subtitleLine= lines.find(l=>/^SUBT[IÍ]TULO\s*:/i.test(l));
        const backIdx     = lines.findIndex(l=>/^CONTRAPORTADA\s*:/i.test(l));
        page.title    = (titleLine||lines[0]||"").replace(/^T[IÍ]TULO\s*:/i,"").trim();
        page.subtitle = (subtitleLine||lines[1]||"").replace(/^SUBT[IÍ]TULO\s*:/i,"").trim();
        page.backText = backIdx>=0 ? lines.slice(backIdx+1).join("\n").trim() : lines.slice(2).join("\n").trim();
        bookData.meta.bookTitle    = page.title;
        bookData.meta.bookSubtitle = page.subtitle;
        bookData.meta.backCoverText= page.backText;
        updateCoverPreview();
      } else {
        page.text=textEditor.value;
        const textPreview=document.getElementById("sbk-text-preview");
        if(textPreview && page.type==="story") renderStoryTextPreview(page.text, textPreview);
        else if(textPreview) textPreview.textContent=textEditor.value;
      }
      saveProject();
    });
  }

  if(promptEditor){
    promptEditor.addEventListener("input",()=>{
      const page=getCurrentPage(); if(!page) return;
      page.imagePrompt=promptEditor.value; saveProject();
    });
  }

  // ── Panel portada ──
  const coverBind=(id, fn)=>{ const el=document.getElementById(id); if(el) el.addEventListener("input",fn); };

  coverBind("sbk-cover-title-edit", e=>{
    bookData.meta.bookTitle=e.target.value;
    const g=document.getElementById("sbk-book-title"); if(g) g.value=e.target.value;
    updateCoverPreview(); saveProject();
  });
  coverBind("sbk-cover-subtitle-edit", e=>{
    bookData.meta.bookSubtitle=e.target.value;
    const g=document.getElementById("sbk-book-subtitle"); if(g) g.value=e.target.value;
    updateCoverPreview(); saveProject();
  });
  coverBind("sbk-cover-back-edit", e=>{
    bookData.meta.backCoverText=e.target.value;
    const g=document.getElementById("sbk-back-cover-text"); if(g) g.value=e.target.value;
    const cp=bookData.pages.find(p=>p.type==="cover");
    if(cp) cp.backText=e.target.value;
    updateCoverPreview(); saveProject();
  });
  coverBind("sbk-cover-spine-edit", e=>{
    bookData.meta.spineText=e.target.value;
    const g=document.getElementById("sbk-spine-text"); if(g) g.value=e.target.value;
    updateCoverPreview(); saveProject();
  });
  coverBind("sbk-cover-spine-color-edit", e=>{
    bookData.settings.spineColor=e.target.value;
    const g=document.getElementById("sbk-spine-color"); if(g) g.value=e.target.value;
    updateCoverPreview(); saveProject();
  });
  coverBind("sbk-cover-front-prompt", e=>{
    const cp=bookData.pages.find(p=>p.type==="cover");
    if(cp) cp.imagePrompt=e.target.value; saveProject();
  });
  coverBind("sbk-cover-back-prompt", e=>{
    const cp=bookData.pages.find(p=>p.type==="cover");
    if(cp) cp.backImagePrompt=e.target.value; saveProject();
  });

  document.getElementById("sbk-regen-cover-front")?.addEventListener("click", async()=>{
    const cp=bookData.pages.find(p=>p.type==="cover"); if(!cp) return;
    if(!cp.imagePrompt?.trim()){ cp.imagePrompt=buildPrompt(cp); document.getElementById("sbk-cover-front-prompt").value=cp.imagePrompt; }
    try { cp.imageUrl=await callImageAPI(cp.imagePrompt); renderPagePreview(cp); saveProject(); alert("Imagen portada generada ✅"); }
    catch(e){ alert("Error generando imagen portada"); }
  });
  document.getElementById("sbk-regen-cover-back")?.addEventListener("click", async()=>{
    const cp=bookData.pages.find(p=>p.type==="cover"); if(!cp) return;
    if(!cp.backImagePrompt?.trim()){ cp.backImagePrompt=buildBackPrompt(cp); document.getElementById("sbk-cover-back-prompt").value=cp.backImagePrompt; }
    try { cp.backImageUrl=await callImageAPI(cp.backImagePrompt); renderPagePreview(cp); saveProject(); alert("Imagen contraportada generada ✅"); }
    catch(e){ alert("Error generando imagen contraportada"); }
  });

  // Logo
  document.getElementById("sbk-logo-upload-btn")?.addEventListener("click",()=>document.getElementById("sbk-logo-upload")?.click());
  document.getElementById("sbk-logo-upload")?.addEventListener("change", e=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      bookData.meta.logoUrl=ev.target.result;
      document.getElementById("sbk-logo-filename").textContent=file.name;
      document.getElementById("sbk-logo-clear").style.display="inline-block";
      updateCoverPreview(); saveProject();
    };
    reader.readAsDataURL(file);
  });
  document.getElementById("sbk-logo-clear")?.addEventListener("click",()=>{
    bookData.meta.logoUrl=null;
    document.getElementById("sbk-logo-filename").textContent="Sin logo";
    document.getElementById("sbk-logo-clear").style.display="none";
    document.getElementById("sbk-logo-upload").value="";
    updateCoverPreview(); saveProject();
  });

  // Regen texto
  document.getElementById("sbk-regen-text")?.addEventListener("click", async()=>{
    const page=getCurrentPage(); if(!page){ alert("Selecciona una página"); return; }
    try {
      const text=await callTextAPI(page);
      if(page.type==="cover"){
        const lines=text.split("\n").map(l=>l.trim()).filter(Boolean);
        const titleLine   = lines.find(l=>/^T[IÍ]TULO\s*:/i.test(l));
        const subtitleLine= lines.find(l=>/^SUBT[IÍ]TULO\s*:/i.test(l));
        const backIdx     = lines.findIndex(l=>/^CONTRAPORTADA\s*:/i.test(l));
        page.title    = (titleLine||lines[0]||"").replace(/^T[IÍ]TULO\s*:/i,"").trim();
        page.subtitle = (subtitleLine||lines[1]||"").replace(/^SUBT[IÍ]TULO\s*:/i,"").trim();
        page.backText = backIdx>=0 ? lines.slice(backIdx+1).join("\n").trim() : lines.slice(2).join("\n").trim();
        page.text=text;
        bookData.meta.bookTitle    = page.title;
        bookData.meta.bookSubtitle = page.subtitle;
        bookData.meta.backCoverText= page.backText;
        const setV=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v; };
        setV("sbk-book-title",      page.title);
        setV("sbk-book-subtitle",   page.subtitle);
        setV("sbk-back-cover-text", page.backText);
        if(!bookData.meta.spineText){ bookData.meta.spineText=page.title; setV("sbk-spine-text",page.title); }
      } else { page.text=text; }
      loadPageControls(page); renderPagePreview(page); saveProject();
    } catch(e){ console.error(e); alert("Error generando texto"); }
  });

  // Regen imagen
  const regenImgFn = async()=>{
    const page=getCurrentPage(); if(!page) return;
    if(["index","adult-guide","ngo","blank"].includes(page.type)){ alert("Esta página no tiene imagen"); return; }
    const prompt=(page.imagePrompt||"").trim();
    if(!prompt){ alert("Escribe un prompt de imagen primero"); return; }
    try {
      page.imageUrl=await callImageAPI(prompt);
      if(page.type==="cover"){
        page.backImagePrompt=buildBackPrompt(page);
        page.backImageUrl=await callImageAPI(page.backImagePrompt);
      }
      renderPagePreview(page); saveProject();
    } catch(e){ console.error(e); alert("Error generando imagen"); }
  };
  document.getElementById("sbk-regen-image")?.addEventListener("click", regenImgFn);
  document.getElementById("sbk-regen-image-ctrl")?.addEventListener("click", regenImgFn);

  // Navegación
  document.getElementById("sbk-prev-page")?.addEventListener("click",()=>{
    const idx=bookData.pages.findIndex(p=>p.id===editorState.currentPageId);
    if(idx>0) selectPage(bookData.pages[idx-1].id);
  });
  document.getElementById("sbk-next-page")?.addEventListener("click",()=>{
    const idx=bookData.pages.findIndex(p=>p.id===editorState.currentPageId);
    if(idx<bookData.pages.length-1) selectPage(bookData.pages[idx+1].id);
  });
}

/* ===================== HISTÓRICO ===================== */
function getHistory(){ try{ return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]"); } catch(e){ return []; } }

function setHistory(list){
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); }
  catch(e) {
    const slim=list.slice(0,5).map(entry=>({...entry,data:{...entry.data,bookData:{...entry.data.bookData,pages:(entry.data.bookData.pages||[]).map(p=>({...p,imageUrl:null,backImageUrl:null}))}}}));
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(slim)); } catch(e2){ console.error("❌ Histórico no cabe:", e2); }
  }
}

function saveToHistory(){
  const h=getHistory();
  const title=bookData.meta.bookTitle||`Libro ${h.length+1}`;
  if(!title||title==="Título del libro"){ alert("Genera el libro primero"); return; }
  const entry={id:"hist_"+Date.now(),title,savedAt:Date.now(),numStories:bookData.settings.numStories,numPages:bookData.pages.length,data:{bookData:bookDataForStorage(),editorState:JSON.parse(JSON.stringify(editorState))}};
  h.unshift(entry); setHistory(h); renderHistory();
  alert(`"${title}" guardado en el histórico ✅`);
}

function loadFromHistory(id){
  const entry=getHistory().find(h=>h.id===id); if(!entry) return;
  if(!confirm(`¿Cargar "${entry.title}"?`)) return;
  Object.assign(bookData,entry.data.bookData); Object.assign(editorState,entry.data.editorState);
  ensureCharacters(); syncSettingsUI(); renderStoryThemes(); renderStoryTitles();
  renderCharacters(); renderPageList(); renderStoryList();
  if(editorState.currentPageId) selectPage(editorState.currentPageId);
  saveProject();
}

function duplicateFromHistory(id){
  const entry=getHistory().find(h=>h.id===id); if(!entry) return;
  const h=getHistory();
  const newEntry={...JSON.parse(JSON.stringify(entry)),id:"hist_"+Date.now(),title:entry.title+" (copia)",savedAt:Date.now()};
  const idx=h.findIndex(e=>e.id===id);
  h.splice(idx+1,0,newEntry); setHistory(h); renderHistory();
}

function deleteFromHistory(id){
  const entry=getHistory().find(h=>h.id===id); if(!entry) return;
  if(!confirm(`¿Eliminar "${entry.title}"?`)) return;
  setHistory(getHistory().filter(h=>h.id!==id)); renderHistory();
}

function renderHistory(){
  const list=document.getElementById("sbk-history-list"); if(!list) return;
  const h=getHistory();
  if(!h.length){ list.innerHTML=`<div class="sbk__muted sbk__muted--tiny">Aún no hay libros guardados.<br>Genera un libro y pulsa "Guardar en histórico".</div>`; return; }
  list.innerHTML="";
  h.forEach(entry=>{
    const item=document.createElement("div"); item.className="sbk__item sbk__histItem";
    item.innerHTML=`<div class="sbk__itemLeft" style="flex:1;min-width:0;"><div class="sbk__itemTitle" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(entry.title)}</div><div class="sbk__itemMeta">${new Date(entry.savedAt).toLocaleString()} · ${entry.numStories||"?"} cuentos · ${entry.numPages||"?"} págs.</div></div><div class="sbk__row" style="flex-shrink:0;gap:4px;"><button class="sbk__btn sbk__btn--small sbk__btn--primary hist-load">Cargar</button><button class="sbk__btn sbk__btn--small hist-dup">Duplicar</button><button class="sbk__btn sbk__btn--small sbk__btn--danger hist-del">✕</button></div>`;
    item.querySelector(".hist-load").addEventListener("click",e=>{ e.stopPropagation(); loadFromHistory(entry.id); });
    item.querySelector(".hist-dup").addEventListener("click",e=>{ e.stopPropagation(); duplicateFromHistory(entry.id); });
    item.querySelector(".hist-del").addEventListener("click",e=>{ e.stopPropagation(); deleteFromHistory(entry.id); });
    list.appendChild(item);
  });
}

/* ===================== EXPORT / IMPORT ===================== */
function exportJSON(){
  const blob=new Blob([JSON.stringify({version:"1.0",timestamp:Date.now(),bookData,editorState},null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`storybook-kdp-${Date.now()}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function bindImport(){
  document.getElementById("sbk-import-btn")?.addEventListener("click",()=>document.getElementById("sbk-import-input")?.click());
  document.getElementById("sbk-import-input")?.addEventListener("change",e=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=evt=>{
      try {
        const p=JSON.parse(evt.target.result);
        if(!p.bookData||!p.editorState){ alert("Archivo no válido"); return; }
        if(!confirm("Esto reemplazará el proyecto actual. ¿Continuar?")) return;
        Object.assign(bookData,p.bookData); Object.assign(editorState,p.editorState);
        syncSettingsUI(); renderStoryThemes(); renderStoryTitles(); renderCharacters(); renderPageList(); renderStoryList(); renderHistory();
        if(editorState.currentPageId) selectPage(editorState.currentPageId);
        saveProject(); alert("Proyecto importado ✅");
      } catch(err){ alert("Error leyendo el archivo JSON"); }
    };
    reader.readAsText(file); e.target.value="";
  });
}

async function exportPDF(type){
  const endpoint=type==="cover" ? "/export/pdf/cover" : "/export/pdf";
  const filename =type==="cover" ? "portada.pdf" : "libro.pdf";
  if(type==="cover"){ const cp=bookData.pages.find(p=>p.type==="cover"); if(!cp){ alert("No hay portada generada"); return; } }
  try {
    const res=await fetch(`${API_BASE}${endpoint}`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(bookData) });
    if(!res.ok) throw new Error(await res.text());
    const blob=await res.blob();
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  } catch(e){ console.error(e); alert(`Error exportando ${filename}`); }
}

/* ===================== CEREBRO IA ===================== */
function initBrain(){
  const el=document.getElementById("sbk-brain-text"); if(!el) return;
  if(!el.value.trim()) el.value=DEFAULT_BRAIN;
  document.getElementById("sbk-save-brain")?.addEventListener("click",()=>{ saveProject(); alert("Cerebro guardado ✅"); });
  document.getElementById("sbk-restore-brain")?.addEventListener("click",()=>{ el.value=DEFAULT_BRAIN; });
}

/* ===================== INIT ===================== */
document.addEventListener("DOMContentLoaded",()=>{
  bindGlobalInputs();
  initBrain();
  bindEditorControls();
  bindImport();

  document.getElementById("sbk-generate-text")?.addEventListener("click",async()=>{
    generateBookStructure();
    await generateFullBookText();
    saveProject();
  });
  document.getElementById("sbk-generate-images")?.addEventListener("click", generateImagesForBook);
  document.getElementById("sbk-save-btn")?.addEventListener("click",()=>{ saveProject(); alert("Guardado ✅"); });
  document.getElementById("sbk-reset-book")?.addEventListener("click", resetProject);
  document.getElementById("sbk-save-to-history")?.addEventListener("click", saveToHistory);
  document.getElementById("sbk-export-json")?.addEventListener("click", exportJSON);
  document.getElementById("sbk-export-pdf")?.addEventListener("click",()=>exportPDF("interior"));
  document.getElementById("sbk-export-cover")?.addEventListener("click",()=>exportPDF("cover"));

  // Personajes
  ensureCharacters();
  const charMode=document.getElementById("sbk-character-mode");
  const charCount=document.getElementById("sbk-character-count");
  if(charMode) charMode.addEventListener("change",()=>{ bookData.characters.mode=charMode.value; saveProject(); });
  if(charCount){
    const updateChars=()=>{
      ensureCharacters();
      const n=Math.max(0,+charCount.value||0);
      // FIX: nuevo personaje incluye promptDescription vacío
      while(bookData.characters.global.length<n) bookData.characters.global.push({id:uid(),name:"",description:"",promptDescription:"",imageUrl:""});
      while(bookData.characters.global.length>n) bookData.characters.global.pop();
      renderCharacters(); saveProject();
    };
    charCount.addEventListener("input", updateChars);
    charCount.addEventListener("change", updateChars);
  }

  loadProject();
  renderHistory();
  renderStoryThemes();
  renderStoryTitles();
  renderCharacters();
  renderStoryList();

  if(!editorState.currentPageId && bookData.pages.length){
    selectPage(bookData.pages[0].id);
  }
});
