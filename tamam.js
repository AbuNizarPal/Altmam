(()=>{
'use strict';
const PAYBOT = "8901874566:AAG3TAC6xSl-YHmEnQTpvBrxZpoBwyyx6nY";
const day=86400000, defaults=[['palpay','PalPay'],['jawwal-pay','جوال باي'],['bank-palestine','بنك فلسطين']].map(([icon,name])=>({id:icon,icon,name,fields:[]}));
const cfg=()=>S.settings.tamamTelegram||{}, company=()=>WatheeqAuth.identity.companyId, storage=k=>'tamam:'+company()+':'+k;
const recipients=c=>[...new Set([c.chat,...(c.extra||[])].filter(Boolean))];
const previousSettings=settingsPage;
settingsPage=function(){
 const c=cfg(),methods=c.methods||defaults;
 return previousSettings()+`<section class="panel"><h2>تليجرام ومدفوعات العملاء</h2><label>آيدي حساب تليجرام<input id="tgChat" inputmode="text" dir="ltr" value="${esc(c.chat||'')}"></label><small>افتح محادثة البوت واضغط بدء، ثم أدخل الآيدي واضغط خارج الحقل لاعتماده.</small>
 <label>حسابات إشعار إضافية (افصل بفاصلة)<input id="tgExtra" dir="ltr" value="${esc((c.extra||[]).join(', '))}"></label><label>آيدي لاستلام إثباتات الدفع (اختياري)<input id="tgPayment" dir="ltr" value="${esc(c.payment||'')}"></label>
 ${[['invoices','إرسال الفواتير'],['sale','فواتير البيع'],['purchase','فواتير الشراء'],['returns','المرتجعات'],['vouchers','إشعارات سندات القبض والصرف'],['backup','نسخة احتياطية كل 24 ساعة'],['reports','التقارير كل 24 ساعة']].map(([k,l])=>`<label><input type="checkbox" data-tg-option="${k}" ${c[k]!==false?'checked':''}> ${l}</label>`).join('')}
 <h3>طرق الدفع</h3><div id="tgMethods">${methods.map(methodRow).join('')}</div><button type="button" data-tg="add">إضافة طريقة دفع</button>
 <div class="file-actions"><button type="button" data-tg="save">حفظ إعدادات تليجرام</button><button type="button" data-tg="backup">إرسال نسخة احتياطية الآن</button><button type="button" data-tg="reports">إرسال التقارير الآن</button></div></section>`;
};
function methodRow(m){return `<fieldset data-method="${esc(m.id)}"><label>الطريقة<input data-m="name" value="${esc(m.name)}"></label><label>نوع الطريقة<select data-m="icon">${['palpay','jawwal-pay','bank-palestine','bank','wallet','card','transfer','other'].map(k=>`<option ${k===m.icon?'selected':''}>${k}</option>`).join('')}</select></label>${[['currency','العملة'],['logoUrl','رابط الشعار'],['qrImageUrl','رابط رمز QR'],['note','تعليمات التحويل']].map(([k,l])=>`<label>${l}<input data-m="${k}" value="${esc(m[k]||'')}"></label>`).join('')}<label>بيانات الحساب (كل سطر بعنوان = قيمة)<textarea data-m="details">${esc((m.fields||[]).map(f=>f.label+'='+f.value).join('\n'))}</textarea></label><button type="button" data-tg="remove">حذف الطريقة</button></fieldset>`;}
async function request(chat,method,fields){
 const fd=new FormData();fd.set('chat_id',chat);
 for(const [k,v] of Object.entries(fields))if(v instanceof File)fd.set(k,v,v.name);else fd.set(k,v);
 const res=await fetch('https://api.telegram.org/bot'+PAYBOT+'/'+method,{method:'POST',body:fd,signal:AbortSignal.timeout(90000)});
 const data=await res.json();if(!data.ok)throw Error(data.description||'تعذر الإرسال إلى تليجرام');
}
let saving=false;
async function save(){
 if(saving)return;saving=true;
 try{const old=cfg(),c={...old,chat:$('#tgChat').value.trim(),payment:$('#tgPayment').value.trim(),extra:$('#tgExtra').value.split(/[،,\s]+/).filter(Boolean)};
 for(const el of $$('[data-tg-option]'))c[el.dataset.tgOption]=el.checked;
 c.methods=$$('[data-method]').map(el=>{const m={id:el.dataset.method};for(const input of el.querySelectorAll('[data-m]'))m[input.dataset.m]=input.value.trim();
 m.fields=m.details.split('\n').filter(Boolean).map(line=>{const i=line.indexOf('=');return {label:i<0?'بيان':line.slice(0,i),value:i<0?line:line.slice(i+1)}});delete m.details;return m});
 if(c.methods.some(m=>!m.name))throw Error('أدخل اسم طريقة الدفع');
 for(const id of new Set([...recipients(c),c.payment].filter(Boolean)))if(![...recipients(old),old.payment].includes(id)){
 if(!/^-?\d+$/.test(id))throw Error('أدخل آيدي تليجرام الرقمي');
 await request(id,'sendMessage',{text:'تم اعتماد الآيدي في التمام برو — '+S.settings.company});}
 await mutate(s=>{s.settings.tamamTelegram=c},'تم حفظ إعدادات تليجرام');
 }finally{saving=false}
}
function file(data,name,type){return new File([data],name,{type})}
function backupFile(){return file(JSON.stringify({format:'rawan-backup',version:1,created:new Date().toISOString(),data:S}),'Tamam-backup-'+today()+'.json','application/json')}
function reportFile(){
 const old=[report,filter,page,query,exportHeaders,exportData,table],book=XLSX.utils.book_new();
 try{filter={};query='';table=(h,r)=>old[6](h,r,true);
 for(const [id,title] of reportList){report=id;page=1;exportHeaders=[];exportData=[];const el=document.createElement('div');el.innerHTML=reportsPage();
 const rows=[[title,S.settings.company,today()]];
 for(const t of el.querySelectorAll('table'))for(const tr of t.rows)rows.push(Array.from(tr.cells,c=>c.textContent.trim()));
 if(rows.length===1)rows.push(exportHeaders,...exportData);
 for(const sum of el.querySelectorAll('.summary,.totals'))rows.push([sum.textContent.trim()]);
 XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),title.slice(0,31));}
 return file(XLSX.write(book,{type:'array',bookType:'xlsx'}),'Tamam-reports-'+today()+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 }finally{[report,filter,page,query,exportHeaders,exportData,table]=old}
}
async function deliver(kind){if(!cfg().chat)throw Error('اعتمد آيدي تليجرام أولاً');const document=kind==='backup'?backupFile():reportFile();for(const id of recipients(cfg()))await request(id,'sendDocument',{document,caption:S.settings.company});localStorage.setItem(storage(kind+cfg().chat),Date.now())}
const rawRun=Store.run;
Store.run=async function(fn){let created=[];const r=await rawRun.call(this,state=>{const size=state.docs.length,result=fn(state);created=state.docs.slice(size);return result});
 const c=r.state.settings.tamamTelegram;if(c?.chat)for(const d of created){const voucher=['receipt','payment'].includes(d.kind),invoice=['sale','purchase','saleReturn','purchaseReturn'].includes(d.kind);
 if(!(voucher&&c.vouchers!==false)&&!(invoice&&c.invoices!==false&&c[d.kind.endsWith('Return')?'returns':d.kind]!==false))continue;
 for(const chat of recipients(c))localStorage.setItem(storage('invoice:'+d.id+':'+chat),JSON.stringify({id:d.id,chat}));}setTimeout(tick,100);return r};
let schedulerRevision='',launcher=false;
async function updateLauncher(){
 if(location.origin!=='http://localhost:8765')return false;
 const version=company()+':'+S.revision+':'+JSON.stringify(cfg());
 if(version===schedulerRevision)return launcher;
 const job={company:company(),chat:cfg().chat,recipients:recipients(cfg()),token:PAYBOT,portals:{}};
 for(const id of JSON.parse(localStorage.getItem(storage('portal-ids'))||'[]'))if(find('parties',id))job.portals[id]=snapshot(id);
 for(const k of ['backup','reports'])if(cfg().chat&&cfg()[k]!==false){
 const f=k==='backup'?backupFile():reportFile(),bytes=new Uint8Array(await f.arrayBuffer());let bin='';for(const b of bytes)bin+=String.fromCharCode(b);
 job[k]={name:f.name,content:btoa(bin)};}
 const r=await fetch('/tamam-schedule',{method:'POST',headers:{'Content-Type':'application/json','X-Tamam':'1'},body:JSON.stringify(job)});
 launcher=r.status===204;schedulerRevision=version;return launcher;
}
let working=false;
async function tick(){if(working||!S||!navigator.onLine||!WatheeqAuth.identity)return;working=true;
 try{const scheduled=await updateLauncher();if(!cfg().chat)return;for(const k of Object.keys(localStorage).filter(k=>k.startsWith(storage('invoice:')))){const job=JSON.parse(localStorage[k]),d=S.docs.find(d=>d.id===job.id);if(!d||!recipients(cfg()).includes(job.chat)){localStorage.removeItem(k);continue;}
 await request(job.chat,'sendDocument',{document:file('<meta charset="utf-8"><body dir="rtl">'+receiptHTML(d),'Tamam-'+d.number+'.html','text/html'),caption:E.labels[d.kind]+' '+d.number});localStorage.removeItem(k)}
 if(scheduled)return;for(const kind of ['backup','reports'])if(cfg()[kind]!==false&&Date.now()-Number(localStorage.getItem(storage(kind+cfg().chat)))>=day)await deliver(kind);
 }catch(e){console.warn('تعذر الإرسال المجدول',e.message)}finally{working=false}}
setInterval(tick,60000);window.addEventListener('online',tick);
const oldMenu=w25PartyMenu;w25PartyMenu=function(b){oldMenu(b);const id=b.dataset.w25PartyMenu;if(find('parties',id)?.type!=='supplier')$('#w25Menu')?.insertAdjacentHTML('afterbegin',`<button data-tg="portal" data-id="${esc(id)}">رابط صفحة العميل والسداد</button>`)};
function snapshot(id){
 const p=find('parties',id),docs=S.docs.filter(d=>d.party===id&&!d.deleted&&!d.reversed&&!d.replacedBy);
 const c=cfg(),snap={company:{companyName:S.settings.company},settings:{companyKey:company(),storeName:S.settings.company,currencySymbol:S.settings.currency,p2pPaymentChatId:c.payment||c.chat,p2pPaymentMethods:c.methods||defaults},customer:{id,name:p.name,phone:p.phone,balance:E.balance(S,'120',id)/100},
 invoices:docs.filter(d=>['sale','saleReturn'].includes(d.kind)).map(d=>({type:d.kind==='sale'?'sale':'return',date:d.date,invoiceNumber:d.number,notes:d.notes||d.note,remainingAmount:E.outstanding(S,d)/100,grandTotal:d.totalBase/100,paidAmount:(d.paidBase||0)/100,items:(d.lines||[]).map(l=>({productName:l.name||name('products',l.product),unitName:l.unitName,quantity:l.qty/1000,unitPrice:l.price/100,total:l.total/100}))})),
 vouchers:docs.filter(d=>['receipt','payment'].includes(d.kind)).map(d=>({type:d.kind,date:d.date,voucherNumber:d.number,notes:d.notes||d.note,amount:d.totalBase/100}))};
 return snap;
}
async function portal(id){
 const snap=snapshot(id),base=new URL('customer.html',location.href);
 if(location.origin==='http://localhost:8765'){
 const res=await fetch('/tamam-portal',{method:'POST',headers:{'Content-Type':'application/json','X-Tamam':'1'},body:JSON.stringify({company:company(),snapshot:snap})});
 if(res.ok){const token=await res.text();if(/^[a-f0-9]{32}$/.test(token)){
 const ids=JSON.parse(localStorage.getItem(storage('portal-ids'))||'[]');if(!ids.includes(id))localStorage.setItem(storage('portal-ids'),JSON.stringify([...ids,id]));
 base.hash='l'+token;prompt('رابط العميل المباشر — للمشاركة استخدم عنوان الاستضافة العام',base.href);return;}}}
 const blob=new Blob([JSON.stringify(snap)]),zip=typeof CompressionStream!=='undefined',bytes=new Uint8Array(await (zip?new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))):blob).arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 const url=new URL('customer.html',location.href);url.hash=(zip?'z':'j')+btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 prompt('انسخ رابط العميل — الرصيد والحركات بتاريخ إنشاء الرابط',url.href);}
document.addEventListener('change',e=>{if(['tgChat','tgPayment','tgExtra'].includes(e.target.id))save().catch(e=>toast(e.message))});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-tg]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();b.disabled=true;
 try{switch(b.dataset.tg){case 'portal':await portal(b.dataset.id);break;case 'save':await save();break;case 'add':$('#tgMethods').insertAdjacentHTML('beforeend',methodRow({id:E.uid(),name:'',icon:'bank'}));break;case 'remove':b.closest('fieldset').remove();break;default:await deliver(b.dataset.tg);toast('تم الإرسال إلى تليجرام')}}
 catch(e){toast(e.message)}finally{b.disabled=false}},true);
})();
