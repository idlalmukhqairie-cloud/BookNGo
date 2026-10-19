// Exercise frontend handlers against the live PHP API; this is not visual browser QA.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto'),{spawnSync}=require('node:child_process');
const path=require('node:path');
const email=`bookngo-test-${randomBytes(6).toString('hex')}-a@example.test`;
const password=randomBytes(18).toString('hex');
const elements=new Map();
function el(key){if(!elements.has(key))elements.set(key,{innerHTML:'',textContent:'',value:'',dataset:{},attrs:{},handlers:{},open:false,classList:{remove(){},toggle(){return true;}},addEventListener(t,f){this.handlers[t]=f;},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},focus(){},showModal(){this.open=true;},close(){this.open=false;}});return elements.get(key);}
const document={handlers:{},querySelector:el,querySelectorAll:()=>[],addEventListener(t,f){this.handlers[t]=f;}};
let cookie='',redirected='';const requests=new Set();
function apiFetch(url,options={}){const promise=(async()=>{const response=await fetch('http://localhost/BookNGo/'+url,{...options,headers:{...options.headers,Cookie:cookie}});const setCookie=response.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];return response;})();requests.add(promise);promise.finally(()=>requests.delete(promise));return promise;}
const context=vm.createContext({document,fetch:apiFetch,location:{hash:'',assign(url){redirected=url;}},window:{addEventListener(){},scrollTo(){}},setTimeout:()=>1,clearTimeout(){},console});
const run=s=>vm.runInContext(s,context);
async function settle(){for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,15));if(requests.size===0)return;}throw Error('Frontend request did not settle');}
async function click(dataset={},id=''){const target={dataset,id,matches:()=>false,hasAttribute:()=>false,setAttribute(){},disabled:false,textContent:''};await document.handlers.click({target:{closest:()=>target}});}
(async()=>{try{
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),context);await settle();assert.equal(run('ready'),true);
 assert.match(el('#main').innerHTML,/Street Fighter/);assert.doesNotMatch(el('#main').innerHTML,/DUNE/);
 await click({book:'street-fighter'});assert.equal(el('#auth-dialog').open,true);
 el('#auth-switch').handlers.click();assert.equal(run('authMode'),'register');
 el('#login-name').value='Frontend Test';el('#login-email').value=email;el('#login-password').value=password;
 await el('#login-form').handlers.submit({preventDefault(){}});await settle();
 assert.equal(el('#auth-dialog').open,false);assert.equal(el('#booking-dialog').open,true);
 assert.equal(run('activeBooking.loaded'),true);assert.match(el('#show-date').innerHTML,/<option/);
 for(const cinema of require('../database/cinemas.json')){
  assert.ok(el('#cinema').innerHTML.includes(cinema));
  el('#booking-dialog').handlers.change({target:{id:'cinema',value:cinema}});await settle();
  assert.equal(run('activeBooking.cinema'),cinema);assert.equal(run('activeBooking.loaded'),true,'Seats load for '+cinema);
 }
 const seats=el('#seats').innerHTML;const seat=/data-seat="([A-E][1-8])" aria-label="Seat [A-E][1-8]" aria-pressed="false" >/.exec(seats)?.[1];assert.ok(seat);
 await click({seat});assert.equal(el('#confirm-booking').disabled,false);
 await click({},'confirm-booking');assert.match(el('#booking-dialog').innerHTML,/saved in the database/);assert.equal(run('bookings.length'),1);
 await click({},'view-tickets');
 run("location.hash='#bookings';render()"); // The simulated location lacks browser hash normalization.
 const reference=run('bookings[0].id');await click({cancel:reference});assert.equal(run('bookings.length'),0);assert.match(el('#main').innerHTML,/You haven’t booked a movie yet/);assert.doesNotMatch(el('#main').innerHTML,new RegExp(reference));
 run("bookings.push({id:'HISTORY-CHECK',film:'dune',title:'Dune: Part Two',poster:'1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',cinema:'Archived screening',date:'2026-10-01',time:'14:30',seats:['A1'],total:22,cancelled:false})");
 assert.match(run('renderBookings()'),/Dune: Part Two/,'Archived movies remain visible in booking history');
 run('bookings.pop()');
 run("filter='soon';query='';renderMovies()");assert.match(el('#movie-results').innerHTML,/Avengers: Doomsday/);assert.match(el('#movie-results').innerHTML,/Clayface/);
 run("filter='all';query='Khong';renderMovies()");assert.match(el('#movie-results').innerHTML,/Khong Khaek 2/);assert.doesNotMatch(el('#movie-results').innerHTML,/Street Fighter/);
 await el('#account-button').handlers.click();assert.equal(run('user'),null);
 run('openLogin()');el('#login-email').value='admin@bookngo.com';el('#login-password').value='admin123';
 await el('#login-form').handlers.submit({preventDefault(){}});assert.equal(redirected,'admin/','Admin login redirects to the admin panel');
 await el('#account-button').handlers.click();
 console.log('PASS: frontend bootstrap, login prompt, registration, resume seat selection, database dates, availability, booking confirmation, cancellation and logout against the live PHP API.');
}finally{
 require('./cleanup.cjs')([email]);
}})().catch(error=>{console.error(error);process.exitCode=1;});
