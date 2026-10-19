const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto'),{spawnSync}=require('node:child_process');
const run=randomBytes(6).toString('hex'),emails=['a','b'].map(x=>`bookngo-test-${run}-${x}@example.test`),password=randomBytes(16).toString('hex');
const base='http://localhost/BookNGo/';
class Client{
 constructor(){this.cookie='';this.csrf='';}
 async request(action,body,token=this.csrf){const r=await fetch(base+'api/index.php?action='+action,{method:body?'POST':'GET',headers:{Cookie:this.cookie,...(body?{'Content-Type':'application/json','X-CSRF-Token':token}:{})},body:body?JSON.stringify(body):undefined});const cookie=r.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];const data=await r.json();if(data.csrf)this.csrf=data.csrf;return {status:r.status,data};}
}
let movieId=null,cinemaId=null;
function future(minutes){const d=new Date(Date.now()+86400000+minutes*60000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
(async()=>{try{
 const admin=new Client(),customer=new Client(),guest=new Client();await admin.request('bootstrap');await customer.request('bootstrap');await guest.request('bootstrap');
 assert.equal((await guest.request('admin_state')).status,401);
 const registration=await customer.request('register',{name:'Admin Test Customer',email:emails[0],password,role:'admin'});assert.equal(registration.status,200);assert.equal(registration.data.user.role,'user','Registration cannot grant admin role');
 assert.equal((await customer.request('admin_state')).status,403);
 assert.equal((await customer.request('admin_save',{entity:'cinema',name:'Unauthorized'})).status,403);
 const login=await admin.request('login',{email:'admin@bookngo.com',password:'admin123'});assert.equal(login.status,200);assert.equal(login.data.user.role,'admin');
 const protectedId=login.data.user.id;
 const page=await fetch(base+'admin/',{headers:{Cookie:admin.cookie},redirect:'manual'});assert.equal(page.status,200);assert.match(await page.text(),/Showtimes/);
 const denied=await fetch(base+'admin/',{headers:{Cookie:customer.cookie},redirect:'manual'});assert.equal(denied.status,302);
 const anon=await fetch(base+'admin/',{redirect:'manual'});assert.equal(anon.status,302);
 assert.equal((await admin.request('admin_save',{entity:'cinema',name:'CSRF test'},'invalid')).status,403);
 let state=(await admin.request('admin_state')).data;assert.ok(state.stats.movies>=10);assert.ok(!JSON.stringify(state).includes('password_hash'));
 assert.equal((await admin.request('admin_delete',{entity:'user',id:protectedId})).status,403,'Admin cannot delete their own account');
 const name='Test Cinema '+run;
 assert.equal((await admin.request('admin_save',{entity:'cinema',name})).status,200);
 state=(await admin.request('admin_state')).data;cinemaId=state.cinemas.find(c=>c.name===name).id;
 assert.equal((await admin.request('admin_save',{entity:'cinema',id:cinemaId,name:name+' Edited'})).status,200);
 const movie={entity:'movie',title:'Test Movie '+run,genre:'Action',age:'TBC',duration:100,price:23.5,poster:'assets/cinema-fallback.svg',description:'Temporary test movie',status:'showing'};
 assert.equal((await admin.request('admin_save',{...movie,poster:'javascript:alert(1)'})).status,400);
 assert.equal((await admin.request('admin_save',movie)).status,200);
 state=(await admin.request('admin_state')).data;movieId=state.movies.find(m=>m.title===movie.title).id;
 assert.equal((await admin.request('admin_save',{...movie,id:movieId,title:movie.title+' Edited'})).status,200);
 const screening={entity:'showtime',movie_id:movieId,cinema_id:cinemaId,starts_at:future(13)};
 assert.equal((await admin.request('admin_save',screening)).status,200);
 state=(await admin.request('admin_state')).data;const showtime=state.showtimes.find(s=>s.movie_id===movieId);
 assert.equal((await admin.request('admin_save',{...screening,id:showtime.id,starts_at:future(43)})).status,200,'Unbooked showtime can be edited');
 const customerData={entity:'user',name:'Admin-created test user',email:emails[1],password};
 assert.equal((await admin.request('admin_save',customerData)).status,200);
 state=(await admin.request('admin_state')).data;const createdUser=state.users.find(u=>u.email===emails[1]);assert.equal(createdUser.role,'user');
 assert.equal((await admin.request('admin_save',{...customerData,id:createdUser.id,name:'Edited test user',password:''})).status,200);
 let publicData=(await customer.request('bootstrap')).data;assert.ok(publicData.movies.some(m=>m.id===movieId));assert.ok(publicData.showtimes.some(s=>s.id===showtime.id));
 let booking=await customer.request('book',{showtimeId:showtime.id,seats:['A1']});assert.equal(booking.status,201);const reference=booking.data.booking.id;
 assert.equal((await admin.request('admin_save',{...screening,id:showtime.id,starts_at:future(73)})).status,409,'Booked showtime cannot be moved');
 state=(await admin.request('admin_state')).data;const ticket=state.bookings.find(b=>b.reference===reference);assert.ok(ticket);assert.equal(Number(ticket.total),23.5);
 assert.equal((await admin.request('admin_delete',{entity:'booking',id:ticket.id})).status,200);assert.equal((await customer.request('bootstrap')).data.bookings.length,0);
 booking=await customer.request('book',{showtimeId:showtime.id,seats:['A1']});assert.equal(booking.status,201,'Admin deletion releases seat');
 assert.equal((await admin.request('admin_delete',{entity:'showtime',id:showtime.id})).status,200);
 publicData=(await customer.request('bootstrap')).data;assert.ok(!publicData.showtimes.some(s=>s.id===showtime.id));assert.equal(publicData.bookings.length,1,'Removing screening preserves booked ticket');
 assert.equal((await customer.request('book',{showtimeId:showtime.id,seats:['A2']})).status,409,'Removed showtime cannot be booked');
 assert.equal((await admin.request('admin_delete',{entity:'user',id:registration.data.user.id})).status,200);assert.equal((await customer.request('bootstrap')).data.user,null);assert.equal((await customer.request('book',{showtimeId:showtime.id,seats:['A2']})).status,401,'Deleted account loses access');
 assert.equal((await admin.request('admin_delete',{entity:'user',id:createdUser.id})).status,200);
 assert.equal((await admin.request('admin_delete',{entity:'movie',id:movieId})).status,200);
 assert.equal((await admin.request('admin_delete',{entity:'cinema',id:cinemaId})).status,200);
 state=(await admin.request('admin_state')).data;assert.ok(!state.movies.some(m=>m.id===movieId));assert.ok(!state.cinemas.some(c=>c.id===cinemaId));
 await admin.request('logout',{});assert.equal((await admin.request('admin_state')).status,401);
 console.log('PASS: Super Admin login, protected page/API, privilege and CSRF checks, dashboard, cinema/movie/showtime/user create/edit/delete, admin booking deletion, seat release, account deletion and logout.');
}finally{
 require('./cleanup.cjs')(emails);
 if(cinemaId&&/^\d+$/.test(String(cinemaId))&&movieId&&/^movie-[a-f0-9]+$/.test(movieId)){
  const sql=`START TRANSACTION; DELETE FROM bookngo.showtimes WHERE cinema_id=${Number(cinemaId)} AND movie_id='${movieId}'; DELETE FROM bookngo.movies WHERE id='${movieId}'; DELETE FROM bookngo.cinemas WHERE id=${Number(cinemaId)}; COMMIT;`;
  const result=spawnSync('C:/xampp/htdocs/mysql/bin/mysql.exe',['-u','root','-h','127.0.0.1','bookngo'],{input:sql,encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);
 }
}})().catch(error=>{console.error(error);process.exitCode=1;});
