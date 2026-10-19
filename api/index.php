<?php
declare(strict_types=1);
require_once __DIR__.'/../config/connect.php';
require_once __DIR__.'/../config/session.php';
date_default_timezone_set('Asia/Kuala_Lumpur');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
ini_set('display_errors', '0');
function respond(array $data,int $status=200): never { http_response_code($status); echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); exit; }
function fail(string $message,int $status=400): never { respond(['error'=>$message],$status); }
function authenticated(): int {
 global $pdo;
 if(empty($_SESSION['user_id'])) fail('Please log in to continue.',401);
 $q=$pdo->prepare('SELECT id FROM users WHERE id=?');$q->execute([$_SESSION['user_id']]);
 if(!$q->fetch()){unset($_SESSION['user_id']);fail('Your account is no longer available. Please log in again.',401);}
 return (int)$_SESSION['user_id'];
}
function bookings(PDO $pdo,int $userId): array {
 $q=$pdo->prepare("SELECT b.id AS internal_id,b.reference AS id,b.total,b.status,s.movie_id AS film,m.title,m.poster,c.name AS cinema,DATE(s.starts_at) AS date,TIME_FORMAT(s.starts_at,'%H:%i') AS time FROM bookings b JOIN showtimes s ON s.id=b.showtime_id JOIN movies m ON m.id=s.movie_id JOIN cinemas c ON c.id=s.cinema_id WHERE b.user_id=? ORDER BY b.created_at DESC,b.id DESC");
 $q->execute([$userId]);$rows=$q->fetchAll();$seats=$pdo->prepare('SELECT seat FROM booking_seats WHERE booking_id=? ORDER BY seat');
 foreach($rows as &$b){$seats->execute([$b['internal_id']]);$b['seats']=$seats->fetchAll(PDO::FETCH_COLUMN);unset($b['internal_id']);$b['total']=(float)$b['total'];$b['cancelled']=$b['status']==='cancelled';} return $rows;
}
try {
 bookngo_start_session();
 $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
 $config=require __DIR__.'/../config/database.php';
 $pdo=bookngo_pdo($config);
 $pdo->exec("SET time_zone = '+08:00'");
 $action=$_GET['action']??'bootstrap';$method=$_SERVER['REQUEST_METHOD'];
 if(!in_array($method,['GET','POST'],true))fail('Method not allowed.',405);
 $writes=['register','login','logout','book','cancel','admin_save','admin_delete'];
 if(in_array($action,$writes,true)) {
  if($method!=='POST')fail('Use POST for this action.',405);
  if(!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??''))fail('Your session expired. Refresh the page and try again.',403);
  if((int)($_SERVER['CONTENT_LENGTH']??0)>8192)fail('Request too large.',413);
  try{$body=json_decode(file_get_contents('php://input'),true,32,JSON_THROW_ON_ERROR);}catch(JsonException){fail('Invalid JSON.');}
  if(!is_array($body))fail('Invalid request.');
 } elseif($method!=='GET')fail('Method not allowed.',405);
 if(str_starts_with($action,'admin_')) {define('BOOKNGO_ADMIN_ROUTER',true);require __DIR__.'/admin.php';}
 if($action==='bootstrap') {
  $u=null;if(!empty($_SESSION['user_id'])){$q=$pdo->prepare('SELECT id,name,email,role FROM users WHERE id=?');$q->execute([$_SESSION['user_id']]);$u=$q->fetch()?:null;}
  $movies=$pdo->query("SELECT id,title,genre,IF(duration_minutes=0,'TBC',CONCAT(duration_minutes,' min')) AS length,age_rating AS age,price,poster,backdrop,description,status FROM movies WHERE is_active=1 ORDER BY sort_order")->fetchAll();
  foreach($movies as &$movie){$movie['price']=(float)$movie['price'];}unset($movie);
  $shows=$pdo->query("SELECT s.id,s.movie_id AS film,c.name AS cinema,DATE(s.starts_at) AS date,TIME_FORMAT(s.starts_at,'%H:%i') AS time FROM showtimes s JOIN cinemas c ON c.id=s.cinema_id JOIN movies m ON m.id=s.movie_id WHERE s.starts_at>NOW() AND s.is_active=1 AND c.is_active=1 AND m.is_active=1 AND m.status='showing' ORDER BY s.starts_at,FIELD(c.name,'BookNGo · Kuala Lumpur','BookNGo · Perak','BookNGo · Selangor','BookNGo · Kelantan','BookNGo · Terengganu'),s.id")->fetchAll();
  respond(['user'=>$u,'csrf'=>$_SESSION['csrf'],'movies'=>$movies,'showtimes'=>$shows,'bookings'=>$u?bookings($pdo,(int)$u['id']):[]]);
 }
 if($action==='register'||$action==='login') {
  $email=is_string($body['email']??null)?strtolower(trim($body['email'])):'';$password=$body['password']??'';
  if(!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($email)>160||!is_string($password)||strlen($password)<8||strlen($password)>72)fail('Enter a valid email and a password of 8–72 characters.');
  if($action==='register') {
   if($email==='admin@bookngo.com')fail('This email is reserved. Please log in with the admin account.',409);
   $name=is_string($body['name']??null)?trim($body['name']):'';if($name===''||mb_strlen($name)>60)fail('Enter a name of 1–60 characters.');
   $q=$pdo->prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)');
   try{$q->execute([$name,$email,password_hash($password,PASSWORD_DEFAULT)]);}catch(PDOException $e){if($e->getCode()==='23000')fail('This email already has an account. Please log in.',409);throw $e;}
   $u=['id'=>(int)$pdo->lastInsertId(),'name'=>$name,'email'=>$email,'role'=>'user'];
  } else {
   if(($_SESSION['login_attempts']??0)>=10 && time()-($_SESSION['last_login_attempt']??0)<60)fail('Too many attempts. Wait a minute and try again.',429);
   $_SESSION['login_attempts']=time()-($_SESSION['last_login_attempt']??0)>=60?1:($_SESSION['login_attempts']??0)+1;$_SESSION['last_login_attempt']=time();
   $q=$pdo->prepare('SELECT id,name,email,password_hash,role FROM users WHERE email=?');$q->execute([$email]);$u=$q->fetch();
   if(!$u||!password_verify($password,$u['password_hash']))fail('Email or password is incorrect.',401);
   unset($u['password_hash']);$_SESSION['login_attempts']=0;
  }
  session_regenerate_id(true);$_SESSION['user_id']=$u['id'];$_SESSION['csrf']=bin2hex(random_bytes(32));
  respond(['user'=>$u,'csrf'=>$_SESSION['csrf'],'bookings'=>bookings($pdo,(int)$u['id'])]);
 }
 if($action==='logout') {$_SESSION=[];session_regenerate_id(true);$_SESSION['csrf']=bin2hex(random_bytes(32));respond(['csrf'=>$_SESSION['csrf']]);}
 if($action==='availability') {
  $id=filter_var($_GET['showtime']??null,FILTER_VALIDATE_INT);if(!$id)fail('Choose a valid showtime.');
  $q=$pdo->prepare("SELECT s.id FROM showtimes s JOIN cinemas c ON c.id=s.cinema_id JOIN movies m ON m.id=s.movie_id WHERE s.id=? AND s.starts_at>NOW() AND s.is_active=1 AND c.is_active=1 AND m.is_active=1 AND m.status='showing'");$q->execute([$id]);if(!$q->fetch())fail('This showtime is no longer available.',404);
  $q=$pdo->prepare('SELECT seat FROM booking_seats WHERE active_showtime_id=? ORDER BY seat');$q->execute([$id]);respond(['taken'=>$q->fetchAll(PDO::FETCH_COLUMN)]);
 }
 if($action==='book') {
  $userId=authenticated();$id=filter_var($body['showtimeId']??null,FILTER_VALIDATE_INT);$seats=$body['seats']??null;
  if(!$id||!is_array($seats)||count($seats)<1||count($seats)>6)fail('Choose a showtime and 1–6 seats.');
  foreach($seats as $seat){if(!is_string($seat)||!preg_match('/^[A-E][1-8]$/D',$seat))fail('Choose valid seats.');}
  if(count(array_unique($seats))!==count($seats))fail('Each seat must be unique.');sort($seats);
  $pdo->beginTransaction();
  $q=$pdo->prepare("SELECT s.id,m.price FROM showtimes s JOIN movies m ON m.id=s.movie_id JOIN cinemas c ON c.id=s.cinema_id WHERE s.id=? AND s.starts_at>NOW() AND s.is_active=1 AND c.is_active=1 AND m.status='showing' AND m.is_active=1 FOR UPDATE");$q->execute([$id]);$show=$q->fetch();if(!$show){$pdo->rollBack();fail('This showtime is no longer available.',409);}
  $q=$pdo->prepare('SELECT seat FROM booking_seats WHERE active_showtime_id=?');$q->execute([$id]);
  if(array_intersect($seats,$q->fetchAll(PDO::FETCH_COLUMN))){$pdo->rollBack();fail('Some seats were just booked. Please choose again.',409);}
  $total=(float)$show['price']*count($seats);$reference='BNG-'.strtoupper(bin2hex(random_bytes(6)));
  $q=$pdo->prepare('INSERT INTO bookings (reference,user_id,showtime_id,total) VALUES (?,?,?,?)');$q->execute([$reference,$userId,$id,$total]);$bookingId=$pdo->lastInsertId();
  $q=$pdo->prepare('INSERT INTO booking_seats (booking_id,active_showtime_id,seat) VALUES (?,?,?)');foreach($seats as $seat){$q->execute([$bookingId,$id,$seat]);}$pdo->commit();
  $rows=bookings($pdo,$userId);respond(['booking'=>array_values(array_filter($rows,fn($b)=>$b['id']===$reference))[0],'bookings'=>$rows],201);
 }
 if($action==='cancel') {
  $userId=authenticated();$reference=$body['reference']??'';if(!is_string($reference))fail('Invalid booking.');
  $pdo->beginTransaction();$q=$pdo->prepare('SELECT id FROM bookings WHERE reference=? AND user_id=? FOR UPDATE');$q->execute([$reference,$userId]);$b=$q->fetch();if(!$b){$pdo->rollBack();fail('Booking not found.',404);}
  $q=$pdo->prepare('DELETE FROM booking_seats WHERE booking_id=?');$q->execute([$b['id']]);
  $q=$pdo->prepare('DELETE FROM bookings WHERE id=? AND user_id=?');$q->execute([$b['id'],$userId]);$pdo->commit();respond(['bookings'=>bookings($pdo,$userId)]);
 }
 fail('Endpoint not found.',404);
} catch(Throwable $e) {
 if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();
 error_log('BookNGo API: '.$e->getMessage());
 fail('Database service unavailable. Check MySQL and import database/setup.sql using phpMyAdmin.',503);
}
