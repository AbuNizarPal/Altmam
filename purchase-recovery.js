'use strict';
(()=>{
 const openInvoice=invoice;
 const controls='input:not([type=file]),select,textarea';
 const rowValues=(row,attribute)=>Object.fromEntries([...row.querySelectorAll('['+attribute+']')].map(el=>[el.getAttribute(attribute),el.value]));
 function remember(){
  const marker=$('#tmPurchaseClose');if(!marker||marker.dataset.done)return;
  const fields={};
  for(const el of $('#modalBody').querySelectorAll(controls)){
   if(el.closest('#invoiceLines,#payments')||!(el.name||el.id))continue;
   fields[el.name||el.id]=el.type==='checkbox'?el.checked:el.value;
  }
  session.setItem(marker.dataset.key,JSON.stringify({id:marker.dataset.id,fields,
   lines:$$('#invoiceLines .line-row').map(row=>rowValues(row,'data-l')),
   payments:$$('#payments .payment-row').map(row=>rowValues(row,'data-p'))}));
 }
 function forget(marker){marker.dataset.done='1';session.setItem(marker.dataset.key,'')}
 function restoreRows(selector,rows,attr,create){
  $(selector).replaceChildren();
  for(const values of rows){
   const product=attr==='data-l'&&find('products',values.product);
   if(attr==='data-l'&&!product)continue;
   create(product?{product:product.id,unit:product.units[Number(values.unit)]?Number(values.unit):0}:{});
   const row=$(selector).lastElementChild;
   for(const [key,value] of Object.entries(values)){const el=row?.querySelector('['+attr+'="'+CSS.escape(key)+'"]');if(el)el.value=value}
  }
 }
 invoice=function(kind='sale',draft={},...rest){
  if(kind!=='purchase')return openInvoice(kind,draft,...rest);
  const key='purchase-editor:'+String(WatheeqAuth.identity?.account?.id||WatheeqAuth.identity?.username||'')+':'+(draft.editOriginal||draft.id||draft.orderId||'new');
  let restored;try{restored=JSON.parse(session.getItem(key)||'null')}catch{}
  if(restored&&S.docs.some(d=>d.id===restored.id))restored=null;
  const result=openInvoice(kind,draft,...rest);
  if(restored){
   pendingId=restored.id;
   restoreRows('#invoiceLines',restored.lines,'data-l',addInvoiceLine);
   restoreRows('#payments',restored.payments,'data-p',paymentRow);
   for(const el of $('#modalBody').querySelectorAll(controls)){
    const k=el.name||el.id;if(!Object.hasOwn(restored.fields,k))continue;
    if(el.type==='checkbox')el.checked=restored.fields[k];else el.value=restored.fields[k];
   }
   enhanceFields();updateInvoiceTotal();
  }
  const marker=document.createElement('button');marker.id='tmPurchaseClose';marker.type='button';marker.textContent='إغلاق';marker.dataset.key=key;marker.dataset.id=pendingId;
  $('#saveDraft').after(marker);marker.onclick=()=>{forget(marker);closeModal()};
  const post=modalSave;modalSave=async function(...args){const value=await post.apply(this,args);if(value!==false)forget(marker);return value};
  const draftBtn=$('#saveDraft'),saveDraft=draftBtn.onclick;draftBtn.onclick=async function(e){await saveDraft.call(this,e);if(S.drafts.some(d=>d.id===marker.dataset.id)&&!$('#modal').open)forget(marker)};
  $('#cancelModal').textContent='إغلاق';return result;
 };
 document.addEventListener('click',e=>{
  const m=$('#tmPurchaseClose');if(!m)return;
  if(e.target.closest('#cancelModal,#tmPurchaseClose'))forget(m);
  else if(e.target.closest('#modalBody'))queueMicrotask(remember);
 },true);
 for(const event of ['input','change'])document.addEventListener(event,e=>{if(e.target.closest('#modalBody'))remember()});
 window.addEventListener('pagehide',remember);
})();
