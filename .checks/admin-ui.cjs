// Verify the admin view renderers with live API data in a simulated DOM.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map();
function el(key){if(!elements.has(key))elements.set(key,{innerHTML:'',textContent:'',value:'',attrs:{},handlers:{},open:false,addEventListener(t,f){this.handlers[t]=f;},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},focus(){},showModal(){this.open=true;},close(){this.open=false;},querySelector(){return {focus(){}};}});return elements.get(key);}
let cookie='';
async function request(action,body,csrf=''){const r=await fetch('http://localhost/BookNGo/api/index.php?action='+action,{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{})},body:body?JSON.stringify(body):undefined});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return r;}
(async()=>{
 const initial=await (await request('bootstrap')).json();const login=await (await request('login',{email:'admin@bookngo.com',password:'admin123'},initial.csrf)).json();assert.equal(login.user.role,'admin');
 const handlers={};const context=vm.createContext({document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){}},location:{hash:'#dashboard',replace(url){throw Error('Unexpected redirect: '+url);}},window:{addEventListener(t,f){handlers[t]=f;}},fetch:(url,options={})=>fetch('http://localhost/BookNGo/'+url.replace('../',''),{...options,headers:{...options.headers,Cookie:cookie}}),console,FormData});
 vm.runInContext(fs.readFileSync('admin/admin.js','utf8'),context);
 const run=s=>vm.runInContext(s,context);
 for(let i=0;i<100&&!run('state');i++)await new Promise(r=>setTimeout(r,10));
 assert.ok(run('state'));assert.match(el('#dashboard').innerHTML,/Demo booking value/);
 for(const view of ['cinemas','movies','showtimes','bookings','users']){
  run("location.hash='#"+view+"'");handlers.hashchange();assert.equal(el('#view-title').textContent,view[0].toUpperCase()+view.slice(1));assert.match(el('#table-head').innerHTML,/<th/);
 }
 for(const entity of ['cinema','movie','showtime','user']){run("openForm('"+entity+"')");assert.equal(el('#record-dialog').open,true);assert.match(el('#record-fields').innerHTML,/<(?:input|select)/);el('#record-dialog').close();}
 run("location.hash='#movies';render();query='unlikely-search-value';renderTable()");assert.match(el('#table-body').innerHTML,/No matching records/);
 run("openDelete('movie',state.movies[0].id)");assert.match(el('#delete-description').textContent,/Existing booked tickets/);
 await request('logout',{},login.csrf);
 console.log('PASS: admin dashboard, five management tables, add forms, search, deletion explanation and session-backed data rendering. Visual browser QA is still required.');
})().catch(error=>{console.error(error);process.exitCode=1;});
