'use strict';
function accountBranch(){
 return WatheeqPermissions.manager()?'':WatheeqAuth.identity?.account?.assignedBranch||'';
}
function branchStockFields(kind){
 const source=accountBranch()||S.branches[0]?.id;
 const branches=accountBranch()?S.branches.filter(b=>b.id===source):S.branches;
 return '<section id="branchStock" class="form-grid">'+field('التاريخ','date',today(),'date','required')+
 field('البيان','note','')+select('الفرع المصدر','branch',branches,source)+select('المخزن','warehouse',[], '')+
 (kind==='transfer'?select('الفرع المستلم','toBranch',S.branches,source)+select('المخزن المستلم','toWarehouse',[],''):'')+'</section>';
}
function bindBranchStock(kind){
 const form=$('#modalForm');
 function refresh(){
  const src=form.elements.warehouse,branch=form.elements.branch.value;
  const populate=(el,rows)=>{const last=el.value;el.innerHTML=options(rows);if(rows.some(w=>w.id===last))el.value=last;el.required=true};
  populate(src,S.warehouses.filter(w=>w.branch===branch));
  if(kind==='transfer')populate(form.elements.toWarehouse,S.warehouses.filter(w=>w.branch===form.elements.toBranch.value&&w.id!==src.value));
  enhanceFields();
 }
 for(const name of ['branch','toBranch','warehouse'])form.elements[name]?.addEventListener('change',refresh);
 refresh();
}
function validateBranchStock(state,fields,kind){
 for(const [branch,warehouse] of kind==='transfer'?[['branch','warehouse'],['toBranch','toWarehouse']]:[['branch','warehouse']]){
  if(!state.warehouses.some(w=>w.id===fields.get(warehouse)&&w.branch===fields.get(branch)))throw Error('اختر مخزناً تابعاً للفرع المحدد');
 }
 if(accountBranch()&&accountBranch()!==fields.get('branch'))throw Error('اختر مخزناً تابعاً لفرعك');
}
function stockSearch(row){
 const product=row.querySelector('select'),label=product.closest('label');
 label.classList.add('branch-product');
 const input=document.createElement('input'),list=document.createElement('div');
 input.type='search';input.placeholder='ابحث بالاسم أو الرقم أو الباركود';input.required=true;
 product.selectedIndex=-1;product.dispatchEvent(new Event('change'));
 input.oninput=()=>{product.selectedIndex=-1;product.dispatchEvent(new Event('change'));draw()};
 function draw(){
  list.replaceChildren();const q=input.value.trim().toLowerCase();
  for(const p of S.products.filter(p=>!p.archived&&p.type!=='service'&&[p.name,p.code,...p.units.map(u=>u.barcode)].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,50)){
   const button=document.createElement('button');button.type='button';button.textContent=p.name+' · '+(p.code||'');
   button.onclick=e=>{e.preventDefault();product.value=p.id;product.dispatchEvent(new Event('change',{bubbles:true}));input.value=p.name;list.replaceChildren()};
   list.append(button);
  }
 }
 input.onfocus=draw;input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();list.firstElementChild?.click()}};
 label.after(list);label.append(input);list.className='branch-results';
}
actions.branchDirectory=()=>{
 if(!WatheeqPermissions.manager())return;
 modal('إدارة الفروع والمخازن','<div class="file-actions"><button type="button" data-add="branches">إضافة فرع</button><button type="button" data-add="warehouses">إضافة مخزن</button><button type="button" data-w34-users>تعيين مدير أو موظف وإصدار شيفرة الدخول</button></div>'+S.branches.map(b=>'<section class="panel"><h3>'+esc(b.name)+'</h3>'+S.warehouses.filter(w=>w.branch===b.id).map(w=>esc(w.name)).join('، ')+'</section>').join(''),null);
};
