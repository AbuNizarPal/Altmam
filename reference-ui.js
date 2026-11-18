'use strict';
(() => {
 const sections = {
  home:['لوحة التحكم','dashboard','dashboard'],
  sell:['المبيعات والأرباح','sales','pos'],
  stock:['إدارة المخزون والمشتريات','inventory','products'],
  debt:['العملاء والديون','parties','parties'],
  spend:['المصاريف وقوائم الدخل','expenses','vouchers']
 };
 const allowed=k=>WatheeqAuth.can(k);
 const colors={pos:'#067dd7',products:'#009879',inventory:'#098ac4',parties:'#db9512',vouchers:'#8460cc',reports:'#008ec5'};
 const domainLinks={
  home:[['@sell','المبيعات','pos'],['purchases','المشتريات','products'],['@debt','الديون','parties'],['@stock','المخزون','inventory'],['reports','التقارير','reports'],['@spend','المصاريف','vouchers']],
  sell:[['pos','المبيعات','pos'],['sales','الفواتير','invoices'],['profit','الأرباح','vouchers'],['reports','التقارير','reports']],
  stock:[['inventory','المخزون','inventory'],['products','الأصناف','products'],['parties','الموردون','parties'],['purchases','المشتريات','pos'],['orders','طلبات الشراء','orders'],['stockCurrent','تقرير المخزون','reports']],
  debt:[['parties','العملاء','parties'],['installments','الأقساط والديون','vouchers'],['parties','كشف الحساب','invoices'],['vouchers','التحصيل','vouchers']],
  spend:[['profit','قائمة الدخل','reports'],['expenses','المصاريف','invoices'],['reports','التحليل المالي','reports'],['trading','الأرباح','vouchers']]
 };
 let section=sections[history.state?.refHub]?history.state.refHub:'home';
 const glyph=k=>'<span class="ref-icon" style="--ink:'+(colors[k]||'#147ebc')+'">'+icon(k)+'</span>';
 function link([to,label,k],cl=''){
  const hub=to.startsWith('@')?to.slice(1):null;
  if(to!=='more'&&!allowed(hub?sections[hub][1]:to))return '';
  return '<a class="'+cl+'" href="#'+(hub?'dashboard':to)+'" '+(hub?'data-ref-hub="'+hub+'"':'')+'>'+glyph(k)+'<span>'+label+'</span></a>';
 }
 const moneyText=v=>money(v)+' <small>'+esc(S.settings.currency)+'</small>';
 const panel=(title,k,body,cl='')=>'<section class="ref-panel '+cl+'"><h2>'+glyph(k)+title+'</h2>'+body+'</section>';
 const tableView=(headers,rows)=>'<div class="ref-scroll"><table><thead><tr>'+headers.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+ (rows.length?rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+headers.length+'" class="ref-empty">لا توجد حركات مسجلة</td></tr>')+'</tbody></table></div>';
 const blank=v=>Number(v).toLocaleString('en-US',{maximumFractionDigits:2});
 function plot(title,keys,series,line=false){
  const vals=series.flatMap(s=>s.values),lo=Math.min(0,...vals),hi=Math.max(100,...vals);
  const y=v=>139-(v-lo)*113/(hi-lo),x=i=>65+i*65,baseline=y(0);
  const grid=Array.from({length:4},(_,i)=>{const v=lo+(hi-lo)*i/3;return '<path d="M45 '+y(v)+'H412" stroke="#dfebf4"/><text x="39" y="'+(y(v)+3)+'" text-anchor="end">'+blank(v/100)+'</text>'}).join('');
  const layers=series.map((s,n)=>{
   const points=s.values.map((v,i)=>x(i)+','+y(v)).join(' ');
   return (line?'<polygon points="'+x(0)+','+baseline+' '+points+' '+x(5)+','+baseline+'" fill="#cceaff"/><polyline points="'+points+'" fill="none" stroke="#087dce" stroke-width="3"/>':'')+s.values.map((v,i)=>{
    const shape=line?'<circle cx="'+x(i)+'" cy="'+y(v)+'" r="3.8" fill="#fff" stroke="#087dce" stroke-width="2.5">':'<rect x="'+(x(i)-15+n*15)+'" y="'+Math.min(baseline,y(v))+'" width="'+(series.length===1?30:14)+'" height="'+Math.abs(baseline-y(v))+'" rx="2" fill="'+(n?'#19bccf':'url(#ref-bars)')+'">';
    return shape+'<title>'+keys[i]+' · '+s.label+' · '+money(v)+'</title>'+(line?'</circle>':'</rect>');
   }).join('');
  }).join('');
  return '<svg class="ref-plot" dir="ltr" viewBox="0 0 426 169" role="img" aria-label="'+title+'">'+grid+layers+keys.map((k,i)=>'<text x="'+x(i)+'" y="161" text-anchor="middle">'+['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][Number(k.slice(5))-1]+'</text>').join('')+'</svg>'+(series.length>1?'<div class="ref-legend">'+series.map(s=>'<span>'+s.label+'</span>').join('')+'</div>':'');
 }
 let notices='';
 function alerts(){
  const cards=[];
  function notice(k,title,detail){
   cards.push('<article class="ref-notice">'+glyph(k)+'<div><small>التمام برو</small><b>'+esc(title)+'</b><span>'+esc(detail)+'</span></div></article>');
  }
  const last=S.docs.filter(d=>!d.reversed&&d.kind==='sale').at(-1);
  if(last&&allowed('sales'))notice('invoices','تم إنشاء فاتورة بيع',last.number+' · '+last.date);
  if(allowed('inventory')){
   const low=S.products.filter(p=>!p.archived&&p.type!=='service'&&p.min>0&&E.sum(S.warehouses,w=>E.stock(S,p.id,w.id).qty)<=p.min);
   for(const p of low.slice(0,5))notice('inventory','تنبيه مخزون منخفض',p.name);
  }
  if(allowed('parties')){
   for(const d of S.docs.filter(d=>d.kind==='sale'&&!d.reversed&&d.party&&(d.due===today()||d.installments?.some(i=>i.date===today()))).filter(d=>d.installments?.length?E.installments(S,d).some(i=>i.date===today()&&i.remaining>0):E.outstanding(S,d)>0).slice(-5))notice('parties','دفعة مستحقة اليوم',name('parties',d.party)+' · '+d.number);
  }
  const exp=S.docs.filter(d=>!d.reversed&&d.kind==='payment'&&chartAmount(d,'expenses')>0).at(-1);
  if(exp&&allowed('expenses'))notice('vouchers','تم تسجيل مصروف',exp.number+' · '+exp.date);
  const sync=window.WatheeqSync?.state;
  if(sync?.label)notice('reports','حالة المزامنة',sync.label);
  return cards.join('')||'<p class="ref-empty">لا توجد تنبيهات حالياً</p>';
 }
 function board(){
  notices=alerts();
  if(!allowed(sections[section][1]))section='home';
  const docs=S.docs.filter(docFilter),financial=E.financials({...S,docs},filter),sum=(arr,fn)=>arr.reduce((t,x)=>t+(Number(fn(x))||0),0);
  const amount=k=>sum(docs,d=>chartAmount(d,k));
  const recent=docs.filter(d=>d.kind===(section==='stock'?'purchase':'sale')).sort((a,b)=>b.date.localeCompare(a.date)||String(b.number).localeCompare(String(a.number)));
  const inv=tableView(['رقم الفاتورة','العميل / المورد','القيمة'],recent.slice(0,4).map(d=>['<button data-view="'+esc(d.id)+'">'+esc(d.number)+'</button>',esc(d.party?name('parties',d.party):'نقدي'),moneyText(d.totalBase)]));
  const keys=Array.from({length:6},(_,i)=>{const end=new Date((filter.to||today())+'T12:00:00');end.setDate(1);end.setMonth(end.getMonth()-5+i);return end.getFullYear()+'-'+String(end.getMonth()+1).padStart(2,'0')});
  const buckets=keys.map(k=>docs.filter(d=>d.date.startsWith(k)));
  const series=(label,fn)=>({label,values:buckets.map(b=>sum(b,fn))});
  const sales=series('المبيعات',d=>chartAmount(d,'sales'));
  let metrics=[],panels=[],summary='',mobileValue='';
  const metric=(title,value,k)=>[title,value,k];
  const stockRows=()=>S.products.filter(p=>!p.archived).map(p=>({p,q:sum(S.warehouses.filter(w=>(!filter.warehouse||filter.warehouse===w.id)&&(!filter.branch||filter.branch===w.branch)),w=>E.stock(S,p.id,w.id).qty)}));
  const stockState=rows=>'<div class="ref-states">'+[['متوفر',rows.filter(r=>r.q>(r.p.min||0)).length],['منخفض',rows.filter(r=>r.q>0&&r.q<=(r.p.min||0)).length],['نافد',rows.filter(r=>r.q<=0).length]].map(([t,v])=>'<div>'+t+'<b>'+v+'</b></div>').join('')+'</div>';
  const chart=(title,ss,line=false)=>panel(title,'reports',plot(title,keys,ss,line));
  if(section==='home'||section==='sell'){
   const selling=section==='sell';
   metrics=[metric('إجمالي المبيعات',moneyText(financial.sales),'pos'),selling?metric('عدد الفواتير',recent.length,'invoices'):metric('إجمالي المشتريات',moneyText(amount('purchases')),'products'),selling?metric('صافي الربح',moneyText(financial.net),'parties'):metric('إجمالي المصاريف',moneyText(financial.expenses),'parties'),selling?metric('هامش الربح',financial.sales?blank(100*financial.net/financial.sales)+'%':'—','reports'):metric('صافي الربح',moneyText(financial.net),'vouchers')];
   panels=[panel('أحدث الفواتير','invoices',inv),chart('حركة المبيعات',[sales],true),chart(selling?'الأرباح الشهرية':'أداء المبيعات الشهري',[selling?series('صافي الربح',d=>chartAmount(d,'profit')):sales]),panel('حالة المخزون','inventory',stockState(stockRows()))];
   summary=chart(selling?'الأرباح الشهرية':'ملخص المبيعات',[selling?series('صافي الربح',d=>chartAmount(d,'profit')):sales]);if(selling){
    mobileValue='صافي الربح';
    const orders=(S.orders||[]).filter(o=>o.kind==='sale'&&docFilter(o));
    panels[3]=panel('ملخص طلبات البيع','pos','<div class="ref-states">'+[['مكتملة',['fulfilled']],['قيد التنفيذ',['draft','confirmed']],['ملغاة',['cancelled']]].map(([label,states])=>'<div>'+label+'<b>'+orders.filter(o=>states.includes(o.status)).length+'</b></div>').join('')+'</div>');
   }
  }else if(section==='stock'){
   const rows=stockRows(),orders=(S.orders||[]).filter(o=>o.kind==='purchase'&&docFilter(o));
   metrics=[metric('إجمالي الأصناف',rows.length,'inventory'),metric('كمية المخزون',blank(sum(rows,r=>r.q)/1000),'products'),metric('الموردون',S.parties.filter(p=>['supplier','both'].includes(p.type)).length,'parties'),metric('طلبات الشراء',orders.length,'pos')];
   panels=[panel('مستوى المخزون','inventory',tableView(['الصنف','الكمية المتاحة'],rows.slice(0,4).map(r=>[esc(r.p.name),qty(r.q)+' '+esc(r.p.units?.[0]?.name||'')]))),chart('حركة المشتريات',[series('المشتريات',d=>chartAmount(d,'purchases'))]),panel('أحدث فواتير الشراء','invoices',inv),panel('حالة المخزون','inventory',stockState(rows))];summary=panels[1];
   const moves=docs.slice().reverse().flatMap(d=>(d.movements||[]).filter(m=>!filter.warehouse||m.warehouse===filter.warehouse).map(m=>[esc(name('products',m.product)),qty(Math.abs(m.qty)),m.qty>0?'إضافة':'صرف'])).slice(0,4);
   panels[1]=panel('حركة المخزون','inventory',tableView(['الصنف','الكمية','الحركة'],moves));
   panels[2]=panel('طلبات الشراء الأخيرة','pos',tableView(['رقم الطلب','المورد','الحالة'],orders.slice(-4).reverse().map(o=>['<button data-order-view="'+esc(o.id)+'">'+esc(o.number)+'</button>',esc(name('parties',o.party)),({draft:'مسودة',confirmed:'معتمدة',fulfilled:'مفوترة',cancelled:'ملغاة'})[o.status]||'—'])));
   const pics=rows.filter(r=>r.p.image).slice(0,4);
   if(pics.length)panels[3]=panel('الأصناف','products','<div class="ref-pics">'+pics.map(({p})=>'<a href="#products"><img src="'+esc(p.image)+'" alt=""><span>'+esc(p.name)+'</span></a>').join('')+'</div>');
  }else if(section==='debt'){
   const clients=S.parties.filter(p=>p.type!=='supplier'),balances=new Map();
   for(const d of S.docs){if((filter.branch&&d.branch!==filter.branch)||(filter.to&&d.date>filter.to))continue;for(const e of d.entries)if(e.account==='120'&&e.party)balances.set(e.party,(balances.get(e.party)||0)+e.debit-e.credit)}
   const ranked=clients.map(p=>({p,v:balances.get(p.id)||0})).filter(r=>r.v>0).sort((a,b)=>b.v-a.v);
   const total=sum(ranked,r=>r.v), receipts=d=>{const src=d.kind==='reverse'?find('docs',d.original):d;return src?.kind==='receipt'&&src.party?(d.kind==='reverse'?-1:1)*src.totalBase:0};
   const now=today(),cutoff=new Date(now+'T12:00:00Z');cutoff.setUTCDate(cutoff.getUTCDate()+30);
   const byDue={late:0,soon:0,later:0};
   for(const d of S.docs.filter(d=>d.kind==='sale'&&!d.reversed&&d.party&&(!filter.branch||d.branch===filter.branch))){
    const dues=d.installments?.length?E.installments(S,d):[{date:d.due,remaining:E.outstanding(S,d)}];
    for(const due of dues){const key=due.date&&due.date<now?'late':due.date&&due.date<=cutoff.toISOString().slice(0,10)?'soon':'later';byDue[key]+=due.remaining}
   }
   metrics=[metric('عدد العملاء',clients.length,'parties'),metric('إجمالي الديون',moneyText(total),'vouchers'),metric('مستحق خلال 30 يوماً',moneyText(byDue.soon),'invoices'),metric('إجمالي التحصيلات',moneyText(sum(docs,receipts)),'reports')];
   panels=[panel('أبرز العملاء','parties',tableView(['العميل','الرصيد'],ranked.slice(0,4).map(r=>['<button data-statement="'+esc(r.p.id)+'">'+esc(r.p.name)+'</button>',moneyText(r.v)]))),chart('حركة التحصيلات',[series('التحصيل',receipts)],true)];
   summary=panel('إجمالي الأرصدة','vouchers','<strong>'+moneyText(total)+'</strong>');
   panels.push(summary,panel('استحقاقات الفواتير الحالية','invoices','<div class="ref-states">'+[['أخرى',byDue.later],['خلال 30 يوماً',byDue.soon],['متأخرة',byDue.late]].map(([t,v])=>'<div>'+t+'<b>'+moneyText(v)+'</b></div>').join('')+'</div>'));
  }else{
   const rev=financial.sales+financial.otherIncome,expenses=financial.cost+financial.expenses;
   metrics=financial.rows.filter(r=>r.type==='expense'&&r.id!=='510').sort((a,b)=>b.amount-a.amount).slice(0,4).map(r=>metric(r.name,moneyText(r.amount),'vouchers'));
   panels=[panel('قائمة الدخل','invoices',tableView(['البند','القيمة'],[['الإيرادات',moneyText(rev)],['تكلفة المبيعات',moneyText(financial.cost)],['المصاريف',moneyText(financial.expenses)],['صافي الربح',moneyText(financial.net)]])),chart('الإيرادات مقابل المصاريف',['revenue','expense'].map((type,i)=>series(i?'المصاريف':'الإيرادات',d=>d.kind==='close'?0:sum(d.entries,e=>find('accounts',e.account)?.type===type?(i?1:-1)*(e.debit-e.credit):0)))),panel('ملخص الفترة','reports',tableView(['إجمالي الإيرادات','إجمالي التكاليف والمصاريف'],[[moneyText(rev),moneyText(expenses)]]))];
   summary=panel('صافي الربح','vouchers','<strong>'+moneyText(financial.net)+'</strong>','ref-profit');panels.push(summary);
  }
  const tiles=domainLinks[section].map(item=>link(item,'ref-tile')).join('');
  return '<div class="ref-board"><svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs><linearGradient id="ref-bars" x2="0" y2="1"><stop stop-color="#16b6f1"/><stop offset="1" stop-color="#036bc9"/></linearGradient></defs></svg><div class="ref-heading"><div><h1>'+(section==='home'?'مرحباً بك في التمام برو':sections[section][0])+'</h1><small>'+(section==='home'?'لوحة التحكم':esc(S.settings.company))+'</small></div><button data-action="filter">'+icon('filter')+' تصفية</button></div><div class="ref-mobile"><div class="ref-tiles">'+tiles+'</div>'+(mobileValue?panel(mobileValue,'reports','<strong>'+moneyText(financial.net)+'</strong>','ref-profit'):'')+summary+'</div><div class="ref-desktop"><div class="ref-metrics">'+metrics.map(([t,v,k])=>'<div class="ref-metric">'+glyph(k)+'<span>'+esc(t)+'</span><strong>'+v+'</strong></div>').join('')+'</div><div class="ref-panels">'+panels.join('')+'</div>'+(section==='home'?'':'<div class="ref-actions">'+tiles+'</div>')+'</div></div>';
 }
 const originalDashboard=dashboard;
 dashboard=function(){return route==='dashboard'?board():originalDashboard()};
 const rail=document.getElementById('ref-rail');
 const openGroups=new Set(['الأعمال']);
 let activeKey='',sidebarSignature='',sidebarContext='',menuButton;
 const smallScreen=matchMedia('(max-width:1023px)');
 function drawer(open){
  const trigger=document.getElementById('ref-hamburger');
  document.body.classList.toggle('ref-drawer-open',open);
  trigger?.setAttribute('aria-expanded',String(open));
  if(open)rail.querySelector('#ref-close')?.focus();
  else if(rail.contains(document.activeElement)&&smallScreen.matches)trigger?.focus();
 }
 function sidebar(){
  const identity=WatheeqAuth.identity;
  const context=JSON.stringify([route,section,identity?.companyId,identity?.type,identity?.account?.id,identity?.account?.permissions,identity?.account?.watheeqPermissions,WatheeqAuth.blocked]);
  if(context===sidebarContext)return;
  sidebarContext=context;
  const groups=moreSectionsV18.map(([title,k,items])=>[title,k,items.slice()]);
  const append=(group,items)=>groups.find(g=>g[0]===group)?.[2].push(...items);
  append('التقارير',reportList.filter(([id])=>!['repDetail','trading','inventoryDetail','cashierShifts','popular'].includes(id)).map(([id,title])=>[title,'report:'+id,'reports']));
  append('الأصناف',[['مجموعات الأصناف','master:productGroups','layers'],['الماركات','master:brands','products'],['الضمانات','master:warranties','receipt'],['الضمانات السارية','action:activeWarranties','receipt']]);
  append('المحاسبة',[['دفتر اليومية','action:journals','invoices'],['الصناديق والحسابات','action:paymentAccounts','cash'],['السنوات والفترات المالية','action:fiscalYears','calendar']]);
  if(w34Manager())append('المستخدمين',[['حسابات الدخول والصلاحيات','users:accounts','employees']]);
  const seen=new Set(groups.flatMap(g=>g[2].map(item=>item[1])));
  const missing=nav.filter(([key])=>!seen.has('#'+key)&&key!=='more');
  if(missing.length)groups.push(['أقسام إضافية','menu',missing.map(([k,l])=>[l,'#'+k,k])]);
  groups[groups.findIndex(g=>g[0]==='الإعدادات')][2].push(['دليل الأقسام','#more','menu']);
  const key=route==='dashboard'?'@'+section:'#'+route;
  const hubs={الأعمال:['home'],المبيعات:['sell'],الأصناف:['stock'],المستخدمين:['debt'],المصاريف:['spend']};
  let html='';
  for(const [title,k,items] of groups){
   const entries=[];
   for(const h of hubs[title]||[]){
    if(!allowed('dashboard')||!allowed(sections[h][1]))continue;
    entries.push(['@'+h,link(['@'+h,sections[h][0],sections[h][2]],'ref-nav'+(key==='@'+h?' current':''))]);
   }
   for(const [label,target,glyphName] of items){
    if(target==='#dashboard')continue;
    const template=document.createElement('template');
    template.innerHTML=moreItemV18(label,target,glyphName);
    const el=template.content.firstElementChild;
    if(target.startsWith('master:')){delete el.dataset.nativeLink;el.dataset.master=target.slice(7)}
    if(target==='users:accounts'){delete el.dataset.nativeLink;el.setAttribute('data-w34-users','')}
    const required={expenseCategories:'expenses',printDesign:'settings',audit:'settings',journals:'accounts',paymentAccounts:'vouchers',activeWarranties:'products'};
    if(target.startsWith('action:')&&required[target.slice(7)]&&!allowed(required[target.slice(7)]))continue;
    if(!w34Access(el))continue;
    if(target.startsWith('returns:')&&!allowed(target==='returns:sale'?'sales':'purchases'))continue;
    if(target==='report:repDetail'&&!allowed('reports'))continue;
    el.className='ref-nav'+(target===key?' current':'');
    if(target===key)el.setAttribute('aria-current','page');
    el.innerHTML='<span class="ref-icon">'+moreSubIconV18(glyphName)+'</span><span>'+esc(label.replace('مرجع المشتريات','مرتجع المشتريات'))+'</span>';
    entries.push([target,el.outerHTML]);
   }
   if(!entries.length)continue;
   if(key!==activeKey&&entries.some(item=>item[0]===key))openGroups.add(title);
   html+='<details data-ref-group="'+esc(title)+'"'+(openGroups.has(title)?' open':'')+'><summary>'+glyph(k)+'<b>'+esc(title)+'</b><svg class="ref-caret" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></summary><div>'+entries.map(item=>item[1]).join('')+'</div></details>';
  }
  activeKey=key;
  if(sidebarSignature===html)return;
  sidebarSignature=html;
  rail.innerHTML='<div class="ref-rail-head"><b>أقسام البرنامج</b><button id="ref-close" type="button" aria-label="إغلاق القائمة">×</button></div>'+html;
 }
 rail.addEventListener('toggle',event=>{
  const group=event.target.dataset.refGroup;
  if(group&&rail.contains(event.target)){
   if(event.target.open)openGroups.add(group);else openGroups.delete(group);
  }
 },true);
 rail.addEventListener('click',event=>{if(event.target.closest('a,button'))drawer(false)},true);
 document.getElementById('ref-scrim').onclick=()=>drawer(false);
 document.addEventListener('keydown',e=>{
  if(!document.body.classList.contains('ref-drawer-open'))return;
  if(e.key==='Escape'){e.preventDefault();drawer(false)}
  if(e.key==='Tab'){
   const nodes=[...rail.querySelectorAll('summary,a,button')].filter(el=>el.getClientRects().length&&el.checkVisibility?.()!==false&&(!el.closest('details:not([open])')||el.tagName==='SUMMARY'));
   if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1)?.focus()}
   else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0]?.focus()}
  }
 });
 smallScreen.addEventListener('change',()=>drawer(false));
 addEventListener('hashchange',()=>drawer(false));
 function shell(){
  const tools=document.querySelector('main>header .header-tools');
  if(!document.getElementById('ref-bell')){
   const b=document.createElement('button');b.id='ref-bell';b.type='button';b.setAttribute('aria-label','الإشعارات');b.title='الإشعارات';
   b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 17h16l-2-3V9a6 6 0 0 0-12 0v5l-2 3Zm5 3a4 4 0 0 0 6 0"/></svg>';
   b.onclick=()=>modal('الإشعارات','<div class="ref-notices">'+notices+'</div>',null);tools.append(b);
   const menu=menuButton=document.createElement('button');menu.type='button';menu.id='ref-hamburger';menu.setAttribute('aria-label','فتح القائمة الجانبية');menu.setAttribute('aria-controls','ref-rail');menu.setAttribute('aria-expanded','false');menu.innerHTML=icon('menu');menu.onclick=()=>drawer(true);tools.append(menu);
  }
  const alternate=smallScreen.matches&&document.querySelector('#content .v19-cashier-header,#content .v19-pagebar');
  const host=alternate||tools;
  if(menuButton.parentElement!==host)host.append(menuButton);
  sidebar();
  document.getElementById('ref-page-name').textContent=route==='dashboard'?'':(nav.find(([key])=>key===route)?.[1]||'');
  document.body.classList.toggle('ref-home',route==='dashboard');
 }
 const oldRender=render;
 render=function(...args){const result=oldRender.apply(this,args);if(S)shell();return result};
 document.addEventListener('click',e=>{
  const a=e.target.closest('a');if(!a)return;
  const target=a.dataset.refHub||(a.hash==='#dashboard'?'home':null);
  if(!target)return;
  if(route==='dashboard'&&section!==target){
   e.preventDefault();history.pushState({...history.state,refHub:target},'','#dashboard');
   section=target;render();window.scrollTo(0,0);
  }else if(route!=='dashboard'&&a.dataset.refHub){
   e.preventDefault();
   const oldURL=location.href;
   section=target;
   history.pushState({...history.state,refHub:target},'','#dashboard');
   dispatchEvent(new HashChangeEvent('hashchange',{oldURL,newURL:location.href}));
  }else section=target;
 },true);
 addEventListener('popstate',()=>{section=sections[history.state?.refHub]?history.state.refHub:'home';if(route==='dashboard')render()});
 if(S)render();
})();
