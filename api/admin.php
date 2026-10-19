<?php
declare(strict_types=1);
if(!defined('BOOKNGO_ADMIN_ROUTER')) {http_response_code(404);exit;}
$adminId=authenticated();
$q=$pdo->prepare('SELECT id,name,email,role FROM users WHERE id=?');$q->execute([$adminId]);$adminUser=$q->fetch();
if(!$adminUser||$adminUser['role']!=='admin')fail('Super Admin access required.',403);
function adminText(array $input,string $key,int $max,bool $required=true): string {
 $value=$input[$key]??'';if(!is_string($value))fail('Invalid '.$key.'.');$value=trim($value);
 if(($required&&$value==='')||mb_strlen($value)>$max||preg_match('/[<>\x00-\x08\x0B\x0C\x0E-\x1F]/u',$value))fail('Enter a valid '.$key.' (up to '.$max.' characters).');return $value;
}
function adminIdValue(mixed $value): int {$id=filter_var($value,FILTER_VALIDATE_INT);if(!$id||$id<1)fail('Invalid record ID.');return $id;}
function adminRows(PDO $pdo,string $sql,array $values=[]): array {$q=$pdo->prepare($sql);$q->execute($values);return $q->fetchAll();}
function removeBooking(PDO $pdo,int $id): void {
 $q=$pdo->prepare('DELETE FROM booking_seats WHERE booking_id=?');$q->execute([$id]);
 $q=$pdo->prepare('DELETE FROM bookings WHERE id=?');$q->execute([$id]);
}
if($action==='admin_state') {
 $movies=adminRows($pdo,'SELECT * FROM movies WHERE is_active=1 ORDER BY sort_order,title');
 $cinemas=adminRows($pdo,'SELECT c.id,c.name,COUNT(CASE WHEN m.is_active=1 THEN s.id END) AS showtime_count FROM cinemas c LEFT JOIN showtimes s ON s.cinema_id=c.id AND s.is_active=1 LEFT JOIN movies m ON m.id=s.movie_id WHERE c.is_active=1 GROUP BY c.id,c.name ORDER BY c.name');
 $shows=adminRows($pdo,"SELECT s.id,s.movie_id,s.cinema_id,s.starts_at,m.title,c.name AS cinema,COUNT(b.id) AS booking_count FROM showtimes s JOIN movies m ON m.id=s.movie_id JOIN cinemas c ON c.id=s.cinema_id LEFT JOIN bookings b ON b.showtime_id=s.id WHERE s.is_active=1 AND m.is_active=1 AND c.is_active=1 GROUP BY s.id,s.movie_id,s.cinema_id,s.starts_at,m.title,c.name ORDER BY s.starts_at DESC,s.id DESC");
 $tickets=adminRows($pdo,"SELECT b.id,b.reference,b.total,b.created_at,u.name AS customer,u.email,m.title,c.name AS cinema,s.starts_at,GROUP_CONCAT(bs.seat ORDER BY bs.seat SEPARATOR ', ') AS seats FROM bookings b JOIN users u ON u.id=b.user_id JOIN showtimes s ON s.id=b.showtime_id JOIN movies m ON m.id=s.movie_id JOIN cinemas c ON c.id=s.cinema_id LEFT JOIN booking_seats bs ON bs.booking_id=b.id GROUP BY b.id,b.reference,b.total,b.created_at,u.name,u.email,m.title,c.name,s.starts_at ORDER BY b.created_at DESC,b.id DESC");
 $users=adminRows($pdo,'SELECT u.id,u.name,u.email,u.role,u.created_at,COUNT(b.id) AS booking_count FROM users u LEFT JOIN bookings b ON b.user_id=u.id GROUP BY u.id,u.name,u.email,u.role,u.created_at ORDER BY u.created_at DESC,u.id DESC');
 $value=array_sum(array_column($tickets,'total'));
 respond(['user'=>$adminUser,'csrf'=>$_SESSION['csrf'],'movies'=>$movies,'cinemas'=>$cinemas,'showtimes'=>$shows,'bookings'=>$tickets,'users'=>$users,'stats'=>['movies'=>count($movies),'cinemas'=>count($cinemas),'showtimes'=>count(array_filter($shows,fn($s)=>$s['starts_at']>date('Y-m-d H:i:s'))),'bookings'=>count($tickets),'users'=>count($users),'value'=>$value]]);
}
if(!in_array($action,['admin_save','admin_delete'],true))fail('Endpoint not found.',404);
$entity=$body['entity']??'';if(!in_array($entity,['cinema','movie','showtime','booking','user'],true))fail('Invalid resource.');
$id=$body['id']??null;
try {
 if($action==='admin_save') {
  if($entity==='cinema') {
   $name=adminText($body,'name',100);
   if($id){$id=adminIdValue($id);if(!adminRows($pdo,'SELECT id FROM cinemas WHERE id=? AND is_active=1',[$id]))fail('Cinema not found.',404);$q=$pdo->prepare('UPDATE cinemas SET name=? WHERE id=? AND is_active=1');$q->execute([$name,$id]);}
   else{$q=$pdo->prepare('INSERT INTO cinemas (name,is_active) VALUES (?,1) ON DUPLICATE KEY UPDATE is_active=1');$q->execute([$name]);}
  } elseif($entity==='movie') {
   $title=adminText($body,'title',160);$genre=adminText($body,'genre',40);$age=adminText($body,'age',10);$description=adminText($body,'description',4000,false);
   $poster=adminText($body,'poster',512,false)?:'assets/cinema-fallback.svg';
   if(preg_match('/[\s"\'<>]/',$poster)||str_contains($poster,'..')||!(filter_var($poster,FILTER_VALIDATE_URL)&&str_starts_with($poster,'https://')||preg_match('~^(?:assets|image)/[a-zA-Z0-9_./%()\-]+$~D',$poster)))fail('Use an HTTPS poster URL or a local image/ or assets/ path. Encode spaces as %20.');
   $duration=filter_var($body['duration']??0,FILTER_VALIDATE_INT);if($duration===false||$duration<0||$duration>600)fail('Runtime must be between 0 and 600 minutes (0 = TBC).');
   $price=filter_var($body['price']??null,FILTER_VALIDATE_FLOAT);if($price===false||$price<0||$price>9999)fail('Enter a valid ticket price.');$price=round($price,2);
   $status=$body['status']??'';if(!in_array($status,['showing','soon'],true))fail('Choose Now Showing or Coming Soon.');
   if($id){if(!is_string($id)||!preg_match('/^[a-z0-9-]{1,30}$/D',$id))fail('Invalid movie ID.');if(!adminRows($pdo,'SELECT id FROM movies WHERE id=? AND is_active=1',[$id]))fail('Movie not found.',404);$q=$pdo->prepare('UPDATE movies SET title=?,genre=?,age_rating=?,description=?,poster=?,duration_minutes=?,price=?,status=? WHERE id=? AND is_active=1');$q->execute([$title,$genre,$age,$description,$poster,$duration,$price,$status,$id]);}
   else{$id='movie-'.bin2hex(random_bytes(8));$q=$pdo->prepare('INSERT INTO movies (id,title,genre,age_rating,description,poster,duration_minutes,price,status,sort_order) VALUES (?,?,?,?,?,?,?,?,?,100)');$q->execute([$id,$title,$genre,$age,$description,$poster,$duration,$price,$status]);}
  } elseif($entity==='showtime') {
   $movieId=adminText($body,'movie_id',30);$cinemaId=adminIdValue($body['cinema_id']??null);$starts=adminText($body,'starts_at',19);
   $date=DateTimeImmutable::createFromFormat('!Y-m-d\TH:i',$starts);if(!$date||$date->format('Y-m-d\TH:i')!==$starts||$date<=new DateTimeImmutable())fail('Choose a valid future showtime.');
   $pdo->beginTransaction();
   if(!adminRows($pdo,"SELECT id FROM movies WHERE id=? AND is_active=1 AND status='showing' FOR UPDATE",[$movieId])||!adminRows($pdo,'SELECT id FROM cinemas WHERE id=? AND is_active=1 FOR UPDATE',[$cinemaId])){$pdo->rollBack();fail('Choose an active cinema and a Now Showing movie.');}
   if($id){$id=adminIdValue($id);$rows=adminRows($pdo,'SELECT id FROM showtimes WHERE id=? AND is_active=1 FOR UPDATE',[$id]);if(!$rows){$pdo->rollBack();fail('Showtime not found.',404);}if(adminRows($pdo,'SELECT id FROM bookings WHERE showtime_id=?',[$id])){$pdo->rollBack();fail('This showtime has bookings. Remove its bookings before editing, or create another showtime.',409);}$q=$pdo->prepare('UPDATE showtimes SET movie_id=?,cinema_id=?,starts_at=? WHERE id=?');$q->execute([$movieId,$cinemaId,$date->format('Y-m-d H:i:s'),$id]);}
   else{$q=$pdo->prepare('INSERT INTO showtimes (movie_id,cinema_id,starts_at,is_active) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE is_active=1');$q->execute([$movieId,$cinemaId,$date->format('Y-m-d H:i:s')]);}
   $pdo->commit();
  } elseif($entity==='user') {
   $name=adminText($body,'name',60);$email=strtolower(adminText($body,'email',160));if(!filter_var($email,FILTER_VALIDATE_EMAIL)||$email==='admin@bookngo.com')fail('Enter a valid customer email.');
   $password=$body['password']??'';if(!is_string($password)||($password!==''&&(strlen($password)<8||strlen($password)>72)))fail('Password must be 8–72 characters.');
   if($id){$id=adminIdValue($id);$rows=adminRows($pdo,"SELECT id FROM users WHERE id=? AND role='user'",[$id]);if(!$rows)fail('Customer account not found.',404);$q=$pdo->prepare('UPDATE users SET name=?,email=? WHERE id=?');$q->execute([$name,$email,$id]);if($password!==''){$q=$pdo->prepare('UPDATE users SET password_hash=? WHERE id=?');$q->execute([password_hash($password,PASSWORD_DEFAULT),$id]);}}
   else{if($password==='')fail('Enter a password for the new account.');$q=$pdo->prepare("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'user')");$q->execute([$name,$email,password_hash($password,PASSWORD_DEFAULT)]);}
  } else fail('Bookings can be viewed or deleted.');
  respond(['ok'=>true]);
 }
 // Locks serialize deletions with seat reservations. Archived listings retain existing tickets.
 $pdo->beginTransaction();
 if($entity==='movie') {
  if(!is_string($id)||!preg_match('/^[a-z0-9-]{1,30}$/D',$id)){$pdo->rollBack();fail('Invalid movie ID.');}
  $q=$pdo->prepare('UPDATE movies SET is_active=0 WHERE id=?');$q->execute([$id]);
 } elseif($entity==='cinema') {
  $id=adminIdValue($id);$q=$pdo->prepare('UPDATE cinemas SET is_active=0 WHERE id=?');$q->execute([$id]);
 } elseif($entity==='showtime') {
  $id=adminIdValue($id);$q=$pdo->prepare('UPDATE showtimes SET is_active=0 WHERE id=?');$q->execute([$id]);
 } elseif($entity==='booking') {
  $id=adminIdValue($id);$rows=adminRows($pdo,'SELECT id FROM bookings WHERE id=? FOR UPDATE',[$id]);if(!$rows){$pdo->rollBack();fail('Booking not found.',404);}removeBooking($pdo,$id);
 } elseif($entity==='user') {
  $id=adminIdValue($id);$rows=adminRows($pdo,'SELECT id,role FROM users WHERE id=? FOR UPDATE',[$id]);if(!$rows){$pdo->rollBack();fail('User not found.',404);}if($rows[0]['role']==='admin'){$pdo->rollBack();fail('The Super Admin account cannot be deleted.',403);}
  foreach(adminRows($pdo,'SELECT id FROM bookings WHERE user_id=? FOR UPDATE',[$id]) as $b)removeBooking($pdo,(int)$b['id']);
  $q=$pdo->prepare('DELETE FROM users WHERE id=?');$q->execute([$id]);
 }
 $pdo->commit();respond(['ok'=>true]);
} catch(PDOException $e) {
 if($pdo->inTransaction())$pdo->rollBack();
 if($e->getCode()==='23000')fail('A record with these details already exists, or it is still in use.',409);
 throw $e;
}
