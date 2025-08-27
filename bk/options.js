document.addEventListener('DOMContentLoaded',()=>{
 const uidInput=document.getElementById('uid');
 const copyBtn=document.getElementById('copy-btn');
 const locBtn=document.getElementById('loc-btn');
 const slider=document.getElementById('hp-threshold');
 const hpVal=document.getElementById('hp-val');
 const toggle=document.getElementById('feedback-toggle');
 const fbLabel=document.getElementById('fb-label');
 uidInput.value='未登録';
 hpVal.textContent=slider.value+'%';
 copyBtn.addEventListener('click',async()=>{
  try{
   await navigator.clipboard.writeText(uidInput.value);
   const t=copyBtn.textContent;
   copyBtn.textContent='コピーしました';
   setTimeout(()=>copyBtn.textContent=t,2000);
  }catch(e){}
 });
 locBtn.addEventListener('click',()=>{showToast('位置登録は未実装です');});
 slider.addEventListener('input',()=>{hpVal.textContent=slider.value+'%';});
 toggle.addEventListener('change',()=>{fbLabel.textContent=toggle.checked?'ON':'OFF';});
});
function showToast(msg){
 const toast=document.getElementById('toast');
 toast.textContent=msg;
 toast.classList.add('show');
 setTimeout(()=>toast.classList.remove('show'),2000);
}
