const state={section:"feedback",feedbackFilter:"All",resolvedFilter:"All",items:[],currentImages:[],currentIndex:0};

const feedbackGrid=document.getElementById("feedbackGrid");
const resolvedGrid=document.getElementById("resolvedGrid");
const feedbackFilters=document.getElementById("feedbackFilters");
const resolvedFilters=document.getElementById("resolvedFilters");
const feedbackSection=document.getElementById("feedbackSection");
const resolvedSection=document.getElementById("resolvedSection");

async function loadData(){
  try{
    const res=await fetch("feedback-index.json?ts="+Date.now());
    if(!res.ok) throw new Error("Could not load feedback index");
    state.items=await res.json();
    render();
  }catch(err){
    feedbackGrid.innerHTML='<div class="empty">Feedback is temporarily unavailable.</div>';
    resolvedGrid.innerHTML='<div class="empty">Resolved issues are temporarily unavailable.</div>';
    console.error(err);
  }
}

function getItems(section){
  return state.items.filter(x=>x.type===section);
}
function getFilter(section){
  return section==="feedback"?state.feedbackFilter:state.resolvedFilter;
}
function setFilter(section,value){
  if(section==="feedback")state.feedbackFilter=value;else state.resolvedFilter=value;
  render();
}
function products(items){
  return ["All",...new Set(items.map(x=>x.item).filter(Boolean))];
}
function renderFilters(section,container){
  container.innerHTML="";
  products(getItems(section)).forEach(product=>{
    const b=document.createElement("button");
    b.className="filter"+(getFilter(section)===product?" active":"");
    b.textContent=product;
    b.onclick=()=>setFilter(section,product);
    container.appendChild(b);
  });
}
function renderCards(section,container){
  const filter=getFilter(section);
  const items=getItems(section).filter(x=>filter==="All"||x.item===filter);
  if(!items.length){container.innerHTML='<div class="empty">No entries yet.</div>';return;}
  container.innerHTML=items.map((item,i)=>`
    <article class="card">
      <div class="card-info">
        <div class="meta">
          <span>👤 <strong>${escapeHtml(item.buyer||"Buyer")}</strong></span>
          <span>🛒 <strong>${escapeHtml(item.item||"Other")}</strong></span>
        </div>
        <span class="status ${section==="resolved"?"resolved":"positive"}">
          ${section==="resolved"?"🟢 Resolved":"⭐ Feedback"}
        </span>
      </div>
      <div class="images">
        <img class="feedback-image" src="${encodeURI(item.image)}" alt="Buyer feedback" loading="lazy"
             onclick='openLightbox(${JSON.stringify([item.image])},0)'>
      </div>
    </article>`).join("");
}
function render(){
  feedbackSection.classList.toggle("hidden",state.section!=="feedback");
  resolvedSection.classList.toggle("hidden",state.section!=="resolved");
  renderFilters("feedback",feedbackFilters);
  renderFilters("resolved",resolvedFilters);
  renderCards("feedback",feedbackGrid);
  renderCards("resolved",resolvedGrid);
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.section===state.section));
}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{state.section=b.dataset.section;render()}));
function escapeHtml(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}

const lightbox=document.getElementById("lightbox"),lightboxImage=document.getElementById("lightboxImage");
function openLightbox(images,index){state.currentImages=images;state.currentIndex=index;lightbox.classList.remove("hidden");updateLightbox()}
function updateLightbox(){lightboxImage.src=state.currentImages[state.currentIndex]}
function closeLightbox(){lightbox.classList.add("hidden")}
document.getElementById("closeLightbox").onclick=closeLightbox;
document.getElementById("prevImage").onclick=()=>{if(!state.currentImages.length)return;state.currentIndex=(state.currentIndex-1+state.currentImages.length)%state.currentImages.length;updateLightbox()};
document.getElementById("nextImage").onclick=()=>{if(!state.currentImages.length)return;state.currentIndex=(state.currentIndex+1)%state.currentImages.length;updateLightbox()};
lightbox.addEventListener("click",e=>{if(e.target===lightbox)closeLightbox()});
document.addEventListener("keydown",e=>{if(lightbox.classList.contains("hidden"))return;if(e.key==="Escape")closeLightbox();if(e.key==="ArrowLeft")document.getElementById("prevImage").click();if(e.key==="ArrowRight")document.getElementById("nextImage").click()});
loadData();
