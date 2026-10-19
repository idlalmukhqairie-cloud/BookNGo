'use strict';
let films = [
  {
    "id": "street-fighter",
    "title": "Street Fighter",
    "genre": "Action",
    "length": "TBC",
    "age": "TBC",
    "price": 22,
    "poster": "image/Street%20Fighter%20.jpg",
    "description": "Choose your fighter. Bring the arcade energy to your next big-screen movie night.",
    "status": "showing"
  },
  {
    "id": "other-mommy",
    "title": "Other Mommy",
    "genre": "Horror",
    "length": "TBC",
    "age": "TBC",
    "price": 20,
    "poster": "image/OTHER%20MOMMY.jpeg",
    "description": "Make room for a chilling horror movie night with Other Mommy.",
    "status": "showing"
  },
  {
    "id": "avengers-doomsday",
    "title": "Avengers: Doomsday",
    "genre": "Action / Sci-Fi",
    "length": "TBC",
    "age": "TBC",
    "price": 24,
    "poster": "https://i.abcnewsfe.com/a/0c097b14-4cb4-4ca8-ba88-e770a1d3d4dd/avengers-poster_1766515462943_hpEmbed_2x3.jpg",
    "description": "The Avengers return for another big-screen event. Watch this space for demo showtimes.",
    "status": "soon"
  },
  {
    "id": "clayface",
    "title": "Clayface",
    "genre": "Horror / Thriller",
    "length": "TBC",
    "age": "TBC",
    "price": 22,
    "poster": "https://pbs.twimg.com/media/HGhTNnTbUAAOeeG.jpg?name=orig",
    "description": "Discover the darker side of Gotham with Clayface.",
    "status": "soon"
  },
  {
    "id": "resident-evil",
    "title": "Resident Evil",
    "genre": "Horror",
    "length": "TBC",
    "age": "TBC",
    "price": 22,
    "poster": "https://d9s3e2ooa0od7.cloudfront.net/assets/resident-evil/4569e7e0-a5b5-4b5b-84fc-2c39ede8ac67/4569e7e0-a5b5-4b5b-84fc-2c39ede8ac67.jpg",
    "description": "Step into survival horror with Resident Evil. Pick your seats for a tense night at the movies.",
    "status": "showing"
  },
  {
    "id": "juminten-edan",
    "title": "Juminten Edan",
    "genre": "Horror",
    "length": "TBC",
    "age": "TBC",
    "price": 18,
    "poster": "image/Juminten%20Edan.jpg",
    "description": "Add Indonesian horror to your movie night with Juminten Edan.",
    "status": "showing"
  },
  {
    "id": "whalefall",
    "title": "Whalefall",
    "genre": "Thriller",
    "length": "TBC",
    "age": "TBC",
    "price": 20,
    "poster": "image/Whalefall.jpeg",
    "description": "Take a deep dive into your next big-screen thriller with Whalefall.",
    "status": "showing"
  },
  {
    "id": "avengers-endgame",
    "title": "Avengers: Endgame",
    "genre": "Action / Sci-Fi",
    "length": "181 min",
    "age": "TBC",
    "price": 22,
    "poster": "or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    "description": "Assemble your friends for an Avengers: Endgame screening in our demo programme.",
    "status": "showing"
  },
  {
    "id": "spider-man-brand-new-day",
    "title": "Spider-Man: Brand New Day",
    "genre": "Action / Adventure",
    "length": "TBC",
    "age": "TBC",
    "price": 22,
    "poster": "https://imagecinepolisgcc.enpointe.io/uploads/images/movies/1782028871177-movie_image1_1782028869987.jpg",
    "description": "A brand new movie night starts here. Catch Spider-Man on the big screen.",
    "status": "showing"
  },
  {
    "id": "khong-khaek-2",
    "title": "Khong Khaek 2",
    "genre": "Horror",
    "length": "TBC",
    "age": "TBC",
    "price": 18,
    "poster": "image/Khong%20Khaek%202.jpeg",
    "description": "Settle in for Thai supernatural horror with Khong Khaek 2.",
    "status": "showing"
  }
];
const $ = (s, root=document) => root.querySelector(s);
const main = $('#main');
const auth = $('#auth-dialog');
const bookingDialog = $('#booking-dialog');
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => `RM ${Number(n).toFixed(2)}`;
const artwork = (film,size='w500') => /^(https:\/\/|assets\/|image\/)/.test(film.poster)?film.poster:`https://image.tmdb.org/t/p/${size}/${film.poster}`;
let user=null, bookings=[], showtimes=[], csrf='', ready=false, authMode='login';
let filter='all', query='',pendingFilm=null, activeBooking=null;
async function api(action,body,params='') {
 const response=await fetch('api/index.php?action='+action+params,{credentials:'same-origin',cache:'no-store',method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{},body:body?JSON.stringify(body):undefined});
 let data;try{data=await response.json();}catch{throw new Error('The server did not return valid data. Open BookNGo through localhost with PHP and MySQL running.');}
 if(!response.ok){const error=new Error(data.error||'Request failed.');error.status=response.status;throw error;}return data;
}
async function initialise(){try{const data=await api('bootstrap');user=data.user;bookings=data.bookings;showtimes=data.showtimes;csrf=data.csrf;films=data.movies;ready=true;render();}catch(error){notice(error.message);}}
function setAuthMode(mode){authMode=mode;const register=mode==='register';$('#register-name').hidden=!register;$('#login-name').required=register;$('#login-password').autocomplete=register?'new-password':'current-password';$('#auth-submit').textContent=register?'Create account →':'Login →';$('#auth-switch').textContent=register?'Already have an account? Login':'New to BookNGo? Create account';$('#auth-title').textContent=register?'Make movie night yours.':'Your next movie awaits.';$('#login-error').textContent='';}
function notice(message){$('#notice').textContent=message;clearTimeout(notice.timer);notice.timer=setTimeout(()=>$('#notice').textContent='',6000);}
function updateAccount(){$('#account-button').innerHTML=user?`Logout <span aria-hidden="true">↗</span>`:'Login <span aria-hidden="true">↗</span>';$('#account-button').setAttribute('aria-label',user?`Logout ${user.name}`:'Login');}
function movieCard(f){return `<article class="movie-card"><button class="poster-button" data-book="${f.id}" aria-label="${f.status==='soon'?'View':'Book'} ${esc(f.title)}"><div class="poster-wrap"><img src="${esc(artwork(f))}" alt="${esc(f.title)} poster" loading="lazy" onerror="this.onerror=null;this.src='assets/posters/${f.id}.svg';this.onerror=function(){this.onerror=null;this.src='assets/cinema-fallback.svg'}"><span class="poster-badge">${f.status==='soon'?'COMING SOON':'2D · DEMO'}</span></div></button><h3>${esc(f.title)}</h3><div class="meta"><span class="age">${f.age}</span><span>${f.genre}</span><span>·</span><span>${f.length}</span></div><div class="card-bottom"><span class="price">From <strong>${money(f.price)}</strong></span><button class="card-book" data-book="${f.id}">${f.status==='soon'?'View details':'Book tickets'} <span aria-hidden="true">↗</span></button></div></article>`;}
function discovery(full=false){return `<section class="container discovery"><div class="section-heading"><div><h2>${full?'Find your next favourite.':'Good movies. Great plans.'}</h2><p>Pick a story. We’ll save you a seat.</p></div>${!full?'<a class="text-link" href="#movies">Explore all movies <span aria-hidden="true">↗</span></a>':''}</div><div class="filters"><div class="tabs" role="group" aria-label="Movie category"><button class="tab" data-filter="showing" aria-pressed="${filter==='showing'}">Now Showing</button><button class="tab" data-filter="soon" aria-pressed="${filter==='soon'}">Coming Soon</button><button class="tab" data-filter="all" aria-pressed="${filter==='all'}">All Movies</button></div><label class="search" style="margin:0"><span aria-hidden="true">⌕</span><input id="movie-search" type="search" placeholder="Search movies…" aria-label="Search movies" value="${esc(query)}"></label></div><div id="movie-results" class="movie-grid"></div><p id="result-count" class="muted" role="status" style="font-size:12px;margin-top:20px"></p></section>`;}
function renderMovies(){const result=films.filter(f=>(filter==='all'||f.status===filter)&&`${f.title} ${f.genre}`.toLowerCase().includes(query.toLowerCase()));$('#movie-results').innerHTML=result.length?result.map(movieCard).join(''):'<div class="empty"><h2>No movies found.</h2><p>Try a different title, genre or category.</p><button class="button secondary" id="clear-search">Clear filters</button></div>';$('#result-count').textContent=`${result.length} movies · Sample programme. Showtimes and prices are for demonstration.`;}
function home(){const f=films[0];if(!f)return `<section class="container page"><h1 class="page-title">Your next movie night is coming.</h1><p class="muted">Check back soon for the next programme.</p></section>${discovery()}`;return `<section class="hero" aria-label="Featured movie"><img class="hero-image" src="${esc(artwork(f,'original'))}" alt="${esc(f.title)} artwork" fetchpriority="high" onerror="this.onerror=null;this.src='assets/posters/${f.id}.svg'"><div class="hero-content"><div class="hero-label"><span class="red-line"></span> THE BIG SCREEN IS CALLING</div><h1 class="hero-title">${esc(f.title)}</h1><div class="meta" style="margin-top:24px"><span class="age">${esc(f.age)}</span><span>${esc(f.genre)}</span><span>·</span><span>${f.length==='TBC'?'Runtime TBC':esc(f.length)}</span></div><p>${esc(f.description)}</p><div class="hero-actions"><button class="button" data-book="${f.id}"><span aria-hidden="true">▣</span> Book tickets</button><button class="button secondary" data-detail="${f.id}">Movie details <span aria-hidden="true">↗</span></button></div></div><div class="hero-bottom"><span>Your next big-screen escape starts here.</span></div></section>${discovery()}<aside class="container invitation"><div class="invitation-copy"><span class="ticket-icon" aria-hidden="true">▧</span><div><h2>Make it a movie night.</h2><p>Your favourite people. The perfect seats. One good plan.</p></div></div><a href="#bookings" class="button secondary">My bookings <span aria-hidden="true">↗</span></a></aside>`;}
function renderBookings(){const owned=user?bookings:[];return `<section class="container page"><div class="page-intro"><h1 class="page-title">My Bookings</h1><p>${user?`Ready for the big screen, ${esc(user.name)}? Your saved tickets live here.`:'Log in to find your next movie night.'}</p></div>${!user?'<div class="empty"><div class="empty-symbol" aria-hidden="true">▧</div><h2>Your tickets, all together.</h2><p>Log in to view your saved bookings.</p><button class="button" data-login>Login to continue</button></div>':!owned.length?'<div class="empty"><div class="empty-symbol" aria-hidden="true">▧</div><h2>A great story is waiting.</h2><p>You haven’t booked a movie yet. Let’s change that.</p><a class="button" href="#movies">Explore movies →</a></div>':owned.map(b=>{const f=films.find(f=>f.id===b.film)||{id:b.film,title:b.title,poster:b.poster};return `<article class="ticket"><img src="${esc(artwork(f,'w185'))}" alt="${esc(f.title)} poster" onerror="this.onerror=null;this.src='assets/posters/${f.id}.svg';this.onerror=function(){this.onerror=null;this.src='assets/cinema-fallback.svg'}"><div class="ticket-info"><span class="ticket-status">DEMO TICKET · ${b.cancelled?'CANCELLED':'CONFIRMED'}</span><h2>${esc(f.title)}</h2><div class="ticket-details"><span>${esc(b.cinema)}</span><span>${esc(b.date)} · ${esc(b.time)}</span><span>Seats ${b.seats.map(esc).join(', ')}</span></div></div><div class="ticket-stub"><span>${esc(b.id)}</span><strong>${money(b.total)}</strong>${!b.cancelled?`<button class="card-book" data-cancel="${esc(b.id)}">Cancel booking</button>`:'<span>No payment was taken.</span>'}</div></article>`;}).join('')}</section>`;}
// Replace each member's name, role and photo path when the team details are ready.
const teamMembers = [
  { name: 'MUHAMMAD ADAM QOYYUM BIN IMRAN', role: 'IPN241310445', photo: 'image/about%20us/Adam.jpeg' },
  { name: 'MOHAMMAD IDLAL MUKHQAIRIE BIN MAKHZAN', role: 'IPN241310716', photo: 'image/about%20us/idlal.jpeg' },
  { name: 'MUHAMMAD AMIR AIZAT BIN ADANAN', role: 'IPN241310642', photo: 'image/about%20us/amir.jpeg' }
];
function about(){return `<section class="container page about-team-page"><header class="team-intro"><h1>Meet the team<br>behind BookNGo.</h1><p>Three people. One love for the big screen. We’re building a simpler way to discover movies, choose your seats and plan your next movie night.</p></header><section class="team-grid" aria-label="Our three team members">${teamMembers.map(member=>`<figure class="team-card"><div class="team-photo"><img src="${esc(member.photo)}" alt="${esc(member.name)}${member.photo==='assets/member-placeholder.svg'?' photo placeholder':' portrait'}" width="480" height="560" loading="lazy" onerror="this.onerror=null;this.src='assets/member-placeholder.svg'">${member.photo==='assets/member-placeholder.svg'?'<span class="team-photo-label">Photo coming soon</span>':''}</div><figcaption><h2>${esc(member.name)}</h2><p>${esc(member.role)}</p></figcaption></figure>`).join('')}</section><div class="team-closing"><p>A good movie brings people together.<br><strong>Let’s make your next movie night happen.</strong></p><a class="button secondary" href="#movies">Explore movies <span aria-hidden="true">↗</span></a></div></section>`;}
function render(){const page=location.hash.slice(1)||'home';document.querySelectorAll('[data-page]').forEach(a=>{if(a.dataset.page===page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});main.innerHTML=page==='bookings'?renderBookings():page==='about'?about():page==='movies'?`<div class="page">${discovery(true)}</div>`:home();if($('#movie-results'))renderMovies();$('.header nav').classList.remove('open');$('.menu-toggle').setAttribute('aria-expanded','false');updateAccount();}
function openLogin(film=null){if(!ready){notice('Database is not connected yet. Refresh the page after starting MySQL.');return;}pendingFilm=film;setAuthMode('login');auth.showModal();$('#login-email').focus();}
function showDetails(id){const f=films.find(f=>f.id===id);bookingDialog.innerHTML=`<button class="close" data-close aria-label="Close movie details">×</button><div class="booking-top"><img src="${esc(artwork(f,'w185'))}" alt="${esc(f.title)} poster" onerror="this.onerror=null;this.src='assets/posters/${f.id}.svg';this.onerror=function(){this.onerror=null;this.src='assets/cinema-fallback.svg'}"><div><h2 id="booking-title">${esc(f.title)}</h2><p>${f.genre} · ${f.length} · ${f.age}</p></div></div><p style="margin-top:24px">${f.description||'Rediscover this film on the big screen with BookNGo’s sample cinema programme.'}</p><p style="margin-top:16px">${f.status==='soon'?'Coming soon in the demo programme. Showtimes are not available yet.':'Demo tickets from '+money(f.price)+'. Select your cinema, showtime and seats to continue.'}</p>${f.status==='showing'?`<button class="button wide" style="margin-top:24px" data-book="${f.id}">Choose seats →</button>`:''}`;bookingDialog.showModal();}
function dates(){return Array.from({length:5},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return {key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,label:d.toLocaleDateString('en-MY',{weekday:'short',day:'numeric',month:'short'})};});}
function openBooking(id){const f=films.find(f=>f.id===id);if(!f)return;if(bookingDialog.open)bookingDialog.close();if(f.status==='soon'){showDetails(id);return;}if(!user){openLogin(id);return;}if(!ready){notice('Database is not connected yet.');return;}const options=showtimes.filter(s=>s.film===id);if(!options.length){notice('No upcoming showtimes. Please check back soon for new showtimes.');return;}const first=options[0];activeBooking={film:f,seats:[],cinema:first.cinema,date:first.date,time:first.time,loaded:false};bookingDialog.innerHTML=`<button class="close" data-close aria-label="Close seat selection">×</button><div class="booking-top"><img src="${esc(artwork(f,'w185'))}" alt="${esc(f.title)} poster" onerror="this.onerror=null;this.src='assets/posters/${f.id}.svg';this.onerror=function(){this.onerror=null;this.src='assets/cinema-fallback.svg'}"><div><h2 id="booking-title">${esc(f.title)}</h2><p>${f.genre} · ${f.length} · ${money(f.price)} per seat</p></div></div><div class="booking-fields"><div><label for="cinema">Cinema</label><select id="cinema"></select></div><div><label for="show-date">Date</label><select id="show-date"></select></div><div><label for="show-time">Showtime</label><select id="show-time"></select></div></div><p style="text-align:center;font-size:12px">Choose up to 6 seats for your movie night.</p><div class="screen">SCREEN THIS WAY</div><div class="seat-grid" id="seats" role="group" aria-label="Choose your seats"></div><div class="legend"><span><i></i>Available</span><span><i class="selected"></i>Selected ✓</span><span>× Unavailable</span></div><div class="booking-total"><div><p id="selected-seats" aria-live="polite">Select your seats</p><strong id="total">RM 0.00</strong></div><button id="confirm-booking" class="button" disabled>Confirm demo booking →</button></div><p class="form-error" id="booking-error" role="alert"></p><small>Demo checkout · No payment required. No real tickets will be issued.</small>`;syncShowOptions();bookingDialog.showModal();}
function syncShowOptions(){const a=activeBooking;const rows=showtimes.filter(s=>s.film===a.film.id);const cinemas=[...new Set(rows.map(s=>s.cinema))];if(!cinemas.includes(a.cinema))a.cinema=cinemas[0];const days=[...new Set(rows.filter(s=>s.cinema===a.cinema).map(s=>s.date))];if(!days.includes(a.date))a.date=days[0];const times=[...new Set(rows.filter(s=>s.cinema===a.cinema&&s.date===a.date).map(s=>s.time))];if(!times.includes(a.time))a.time=times[0];const option=(v,label=v)=>'<option value="'+esc(v)+'">'+esc(label)+'</option>';$('#cinema').innerHTML=cinemas.map(v=>option(v)).join('');$('#cinema').value=a.cinema;$('#show-date').innerHTML=days.map(v=>option(v,new Date(v+'T12:00:00').toLocaleDateString('en-MY',{weekday:'short',day:'numeric',month:'short'}))).join('');$('#show-date').value=a.date;$('#show-time').innerHTML=times.map(v=>option(v)).join('');$('#show-time').value=a.time;a.showtimeId=rows.find(s=>s.cinema===a.cinema&&s.date===a.date&&s.time===a.time).id;renderSeats();}
async function renderSeats(){const a=activeBooking;const showtimeId=a.showtimeId;a.loaded=false;a.seats=[];updateTotal();$('#seats').innerHTML='';$('#booking-error').textContent='Loading available seats…';try{const data=await api('availability',null,'&showtime='+encodeURIComponent(showtimeId));if(activeBooking!==a||a.showtimeId!==showtimeId)return;const taken=new Set(data.taken);$('#seats').innerHTML=['A','B','C','D','E'].map(row=>'<span class="row-label">'+row+'</span>'+Array.from({length:8},(_,i)=>{const s=row+(i+1);return '<button class="seat" data-seat="'+s+'" aria-label="Seat '+s+(taken.has(s)?', unavailable':'')+'" aria-pressed="false" '+(taken.has(s)?'disabled':'')+'>'+(taken.has(s)?'×':s)+'</button>';}).join('')).join('');a.loaded=true;$('#booking-error').textContent='';updateTotal();}catch(error){if(activeBooking===a&&a.showtimeId===showtimeId)$('#booking-error').textContent=error.message;}}
function updateTotal(){const a=activeBooking;$('#selected-seats').textContent=a.seats.length?`Seats ${a.seats.join(', ')} · ${a.seats.length} ticket${a.seats.length===1?'':'s'}`:'Select your seats';$('#total').textContent=money(a.seats.length*a.film.price);$('#confirm-booking').disabled=!a.loaded||a.saving||!a.seats.length;}
document.addEventListener('click',async event=>{const target=event.target.closest('button,a');if(!target)return;if(target.matches('[data-close]')){target.closest('dialog').close();return;}if(target.dataset.book){openBooking(target.dataset.book);return;}if(target.dataset.detail){showDetails(target.dataset.detail);return;}if(target.hasAttribute('data-login')){openLogin();return;}if(target.dataset.filter){filter=target.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));renderMovies();return;}if(target.id==='clear-search'){filter='all';query='';render();return;}if(target.dataset.seat){const a=activeBooking,s=target.dataset.seat;if(a.seats.includes(s))a.seats=a.seats.filter(x=>x!==s);else if(a.seats.length<6)a.seats.push(s);else{$('#booking-error').textContent='You can choose up to 6 seats per booking.';return;}target.setAttribute('aria-pressed',String(a.seats.includes(s)));target.textContent=a.seats.includes(s)?'✓':s;$('#booking-error').textContent='';updateTotal();return;}if(target.id==='confirm-booking'){const a=activeBooking;if(!user||!a?.loaded||!a.seats.length||a.saving)return;a.saving=true;updateTotal();try{const data=await api('book',{showtimeId:a.showtimeId,seats:a.seats});bookings=data.bookings;const b=data.booking;if(!bookingDialog.open||activeBooking!==a)return;bookingDialog.innerHTML=`<button class="close" data-close aria-label="Close confirmation">×</button><div class="success"><div class="success-icon" aria-hidden="true">✓</div><h2 id="booking-title">Movie night, sorted.</h2><p>Your demo booking for ${esc(a.film.title)} is saved in the database.</p><p style="margin-top:16px">${esc(b.id)} · Seats ${b.seats.map(esc).join(', ')}<br>${esc(b.date)} at ${esc(b.time)}<br>${money(b.total)} · No payment taken</p><button class="button" id="view-tickets">View my bookings →</button></div>`;if(location.hash==='#bookings')render();}catch(error){if(activeBooking===a&&$('#booking-error')){if(error.status===409){await renderSeats();}$('#booking-error').textContent=error.message;}else notice(error.message);}finally{a.saving=false;if(activeBooking===a&&$('#confirm-booking'))updateTotal();}return;}if(target.id==='view-tickets'){bookingDialog.close();location.hash='bookings';render();return;}if(target.dataset.cancel){target.disabled=true;try{const data=await api('cancel',{reference:target.dataset.cancel});bookings=data.bookings;render();}catch(error){notice(error.message);target.disabled=false;}return;}});
$('#account-button').addEventListener('click',async()=>{if(user){try{const data=await api('logout',{});csrf=data.csrf;user=null;bookings=[];pendingFilm=null;render();notice('You have logged out.');}catch(error){notice(error.message);}}else openLogin();});
$('#login-form').addEventListener('submit',async event=>{event.preventDefault();const button=$('#auth-submit');button.disabled=true;$('#login-error').textContent='';try{const data=await api(authMode,{name:$('#login-name').value.trim(),email:$('#login-email').value.trim(),password:$('#login-password').value});user=data.user;csrf=data.csrf;bookings=data.bookings;$('#login-password').value='';if(user.role==='admin'){location.assign('admin/');return;}auth.close();const film=pendingFilm;pendingFilm=null;render();if(film)openBooking(film);}catch(error){$('#login-error').textContent=error.message;}finally{button.disabled=false;}});
$('#auth-switch').addEventListener('click',()=>setAuthMode(authMode==='login'?'register':'login'));
main.addEventListener('input',event=>{if(event.target.id==='movie-search'){query=event.target.value;renderMovies();}});
bookingDialog.addEventListener('change',event=>{const fields={'cinema':'cinema','show-date':'date','show-time':'time'};if(fields[event.target.id]){activeBooking[fields[event.target.id]]=event.target.value;syncShowOptions();}});
$('.menu-toggle').addEventListener('click',()=>{const open=$('#navigation').classList.toggle('open');$('.menu-toggle').setAttribute('aria-expanded',String(open));$('.menu-toggle').setAttribute('aria-label',open?'Close navigation':'Open navigation');});
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);});
$('#year').textContent=new Date().getFullYear();render();initialise();

