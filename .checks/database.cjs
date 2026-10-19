const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const base=process.env.BOOKNGO_TEST_URL||'http://localhost/BookNGo/';
const run=randomBytes(6).toString('hex');
const emails=['a','b'].map(x=>`bookngo-test-${run}-${x}@example.test`);
const password=randomBytes(18).toString('hex');
class Client {
 constructor(){this.cookie='';this.csrf='';}
 async request(action,body,extra='',token=this.csrf){
  const r=await fetch(base+'api/index.php?action='+action+extra,{method:body?'POST':'GET',headers:{Cookie:this.cookie,...(body?{'Content-Type':'application/json','X-CSRF-Token':token}:{})},body:body?JSON.stringify(body):undefined});
  const cookie=r.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];
  const data=await r.json();if(data.csrf)this.csrf=data.csrf;return {status:r.status,data,headers:r.headers};
 }
}
(async()=>{
 try {
  const a=new Client(),b=new Client(),guest=new Client();
  const initial=await a.request('bootstrap');assert.equal(initial.status,200);assert.equal(initial.data.movies.length,10);assert.ok(initial.data.showtimes.length);
  const catalogue=require('../database/movies.json');assert.deepEqual(initial.data.movies.map(m=>m.id),catalogue.map(m=>m.id));assert.ok(initial.data.showtimes.every(s=>catalogue.some(m=>m.id===s.film&&m.status==='showing')));
  const cinemas=require('../database/cinemas.json');assert.deepEqual([...new Set(initial.data.showtimes.map(s=>s.cinema))],cinemas,'Exactly the five requested cinema locations are offered');
  for(const movie of catalogue.filter(m=>m.status==='showing'))assert.equal(new Set(initial.data.showtimes.filter(s=>s.film===movie.id).map(s=>s.cinema)).size,5,'Each bookable movie has all five locations');
  assert.match(initial.headers.get('set-cookie'),/HttpOnly/i);assert.match(initial.headers.get('set-cookie'),/SameSite=Lax/i);
  await b.request('bootstrap');await guest.request('bootstrap');
  const payload={name:'Database Test',email:emails[0],password};
  assert.equal((await a.request('register',payload,'','wrong-token')).status,403);
  assert.equal((await a.request('register',payload)).status,200);
  assert.equal((await b.request('register',{...payload,email:emails[1]})).status,200);
  assert.equal((await guest.request('register',payload)).status,409,'Duplicate email rejected');
  const show=initial.data.showtimes[0];
  const availability=await a.request('availability',null,'&showtime='+show.id);
  const free=['A','B','C','D','E'].flatMap(r=>Array.from({length:8},(_,i)=>r+(i+1))).filter(s=>!availability.data.taken.includes(s));
  assert.ok(free.length>=2,'Need two free seats for tests');
  const book={showtimeId:show.id,seats:[free[0]],total:0};
  assert.equal((await guest.request('book',book)).status,401,'Guest cannot book');
  assert.equal((await a.request('book',{...book,seats:['Z9']})).status,400);
  assert.equal((await a.request('book',{...book,seats:[free[0],free[0]]})).status,400);
  assert.equal((await a.request('book',{...book,seats:['A1','A2','A3','A4','A5','A6','A7']})).status,400);
  const races=await Promise.all([a.request('book',book),b.request('book',book)]);
  assert.deepEqual(races.map(r=>r.status).sort(),[201,409],'Exactly one concurrent request reserves a seat');
  const winnerIndex=races.findIndex(r=>r.status===201),winner=[a,b][winnerIndex],loser=[a,b][1-winnerIndex];
  const ticket=races[winnerIndex].data.booking;
  const movie=initial.data.movies.find(m=>m.id===show.film);
  assert.equal(ticket.total,movie.price,'Server calculates price and ignores submitted total');
  assert.equal((await loser.request('cancel',{reference:ticket.id})).status,404,'Other user cannot cancel');
  const isolated=await loser.request('bootstrap');assert.equal(isolated.data.bookings.length,0);
  const persisted=await winner.request('bootstrap');assert.equal(persisted.data.bookings[0].id,ticket.id);
  assert.ok((await loser.request('availability',null,'&showtime='+show.id)).data.taken.includes(free[0]),'Availability shared across accounts');
  const cancelled=await winner.request('cancel',{reference:ticket.id});assert.equal(cancelled.status,200);assert.equal(cancelled.data.bookings.length,0,'Cancelled booking is removed');
  assert.equal((await winner.request('bootstrap')).data.bookings.length,0,'Removed booking stays absent after reload');
  assert.equal((await winner.request('cancel',{reference:ticket.id})).status,404,'Deleted booking no longer exists');
  assert.ok(!(await loser.request('availability',null,'&showtime='+show.id)).data.taken.includes(free[0]),'Cancellation releases seat');
  assert.equal((await loser.request('book',book)).status,201,'Released seat can be booked again');
  await a.request('logout',{});assert.equal((await a.request('bootstrap')).data.user,null);
  assert.equal((await a.request('login',{email:emails[0],password:'invalid-password'})).status,401);
  const login=await a.request('login',{email:emails[0],password});assert.equal(login.status,200);assert.equal(login.data.user.email,emails[0]);
  for(const resource of ['config/database.php','database/schema.sql','.checks/cleanup.cjs'])assert.equal((await fetch(base+resource)).status,403,'Private files must be blocked');
  console.log('PASS: database catalogue, registration, duplicate email, password login, session cookies, CSRF, guest denial, input validation, concurrent seat conflict, server price, account privacy, persistence, cancellation, seat reuse and logout.');
 } finally {
  require('./cleanup.cjs')(emails);
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
