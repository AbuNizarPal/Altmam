async function portalRead(hash){
 const code=hash.slice(1);
 if(/^l[a-f0-9]{32}$/.test(code)){
 const r=await fetch('./tamam-customer/'+code.slice(1),{cache:'no-store'});if(!r.ok)throw Error('تعذر تحديث بيانات العميل');return r.json();}
 if(!code)throw Error('رابط العميل غير مكتمل');
 let bytes=Uint8Array.from(atob(code.slice(1).replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 if(code[0]==='z')bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 return JSON.parse(new TextDecoder().decode(bytes));
}
