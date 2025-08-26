document.addEventListener("DOMContentLoaded",()=>{
 const reload=document.getElementById("reload");
 const mode=document.getElementById("mode");
 function setText(m){mode.textContent=m==="static"?"タイムライン表示":"固定72%表示";}
 chrome.storage.sync.get(["hpExtMode"],res=>{
  const m=res.hpExtMode||"static";
  mode.dataset.mode=m;
  setText(m);
 });
 reload.addEventListener("click",()=>{
  chrome.tabs.query({active:true,currentWindow:true},tabs=>{
   if(tabs[0])chrome.tabs.reload(tabs[0].id);
  });
 });
 mode.addEventListener("click",()=>{
  const m=mode.dataset.mode==="static"?"timeline":"static";
  chrome.storage.sync.set({hpExtMode:m});
  mode.dataset.mode=m;
  setText(m);
 });
});
