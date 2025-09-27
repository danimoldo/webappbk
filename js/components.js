// js/components.js
export async function mountPartials(){
  async function injectById(id, url){
    const el = document.getElementById(id);
    if (!el) return;
    try {
      const res = await fetch(new URL(url, location.href), { cache: "no-cache" });
      if (!res.ok) throw new Error("fetch failed");
      el.innerHTML = await res.text();
    } catch (e) {
      console.warn("mountPartials failed:", id, url, e);
    }
  }
  await injectById("left-panel", "components/left-panel.html");
  await injectById("toolbar", "components/header.html");
  await injectById("footer", "components/footer.html");
  // Optional right panel (may be absent in layout)
  if (document.getElementById("right-panel")){
    await injectById("right-panel", "components/right-panel.html");
  }
}
