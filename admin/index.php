<?php
declare(strict_types=1);
ini_set('display_errors', '0');
require_once __DIR__.'/../config/connect.php';
require_once __DIR__.'/../config/session.php';
header('Cache-Control: no-store');
try {
 bookngo_start_session();
 if(empty($_SESSION['user_id'])){header('Location: ../#home');exit;}
 $c=require __DIR__.'/../config/database.php';
 $p=bookngo_pdo($c);
 $q=$p->prepare('SELECT role FROM users WHERE id=?');$q->execute([$_SESSION['user_id']]);
 if($q->fetchColumn()!=='admin'){header('Location: ../#home');exit;}
}catch(Throwable $e){error_log('BookNGo admin: '.$e->getMessage());http_response_code(503);exit('Database service unavailable. Please try again shortly.');}
session_write_close();
?>
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Super Admin — BookNGo</title><link rel="stylesheet" href="../styles.css">
<link rel="stylesheet" href="admin.css"><script defer src="admin.js"></script></head>
<body class="admin-body">
 <a href="#content" class="skip">Skip to content</a>
 <aside class="admin-sidebar">
  <a class="brand" href="#dashboard"><span class="brand-icon" aria-hidden="true">B</span>Book<span>N</span>Go.</a>
  <p class="workspace-label">SUPER ADMIN</p>
  <nav class="admin-nav" aria-label="Admin navigation">
   <a href="#dashboard" data-view="dashboard"><span aria-hidden="true">▦</span>Dashboard</a>
   <a href="#cinemas" data-view="cinemas"><span aria-hidden="true">▤</span>Cinemas</a>
   <a href="#movies" data-view="movies"><span aria-hidden="true">▷</span>Movies</a>
   <a href="#showtimes" data-view="showtimes"><span aria-hidden="true">◷</span>Showtimes</a>
   <a href="#bookings" data-view="bookings"><span aria-hidden="true">▧</span>Bookings</a>
   <a href="#users" data-view="users"><span aria-hidden="true">♙</span>Users</a>
  </nav>
  <div class="sidebar-bottom"><a href="../" class="text-link">View website ↗</a><button id="admin-logout" class="button secondary wide">Logout</button></div>
 </aside>
 <div class="admin-workspace">
  <header class="admin-topbar"><div>BookNGo <span aria-hidden="true">/</span> <strong id="breadcrumb">Dashboard</strong></div><div class="admin-identity">
  <span class="admin-avatar" aria-hidden="true">A</span><span id="admin-name">Super Admin</span></div></header>
  <main id="content" class="admin-content" tabindex="-1">
   <div class="admin-page-heading"><div><p class="muted">Your cinema, in one place.</p><h1 id="view-title">Dashboard</h1><p id="view-description" class="muted"></p></div><button id="add-record" class="button" hidden>Add new</button></div>
   <p id="admin-feedback" role="status" aria-live="polite"></p>
   <section id="dashboard"></section>
   <section id="records" hidden>
    <div class="admin-toolbar"><label class="search"><span aria-hidden="true">⌕</span><input id="admin-search" type="search" aria-label="Search records" placeholder="Search records…"></label><button id="refresh-records" class="button secondary small">Refresh</button></div>
    <div class="table-scroll" tabindex="0" role="region" aria-label="Management records"><table><thead id="table-head"></thead><tbody id="table-body"></tbody></table></div>
    <div class="pagination"><p id="record-count" class="muted"></p><div><button id="previous-page" class="card-book">← Previous</button><button id="next-page" class="card-book">Next →</button></div></div>
   </section>
  </main>
 </div>
 <dialog id="record-dialog" aria-labelledby="record-title"><button class="close" data-close aria-label="Close form">×</button><h2 id="record-title">Add record</h2><form id="record-form"><div id="record-fields"></div><p id="record-error" class="form-error" role="alert"></p><button id="save-record" type="submit" class="button wide">Save</button></form></dialog>
 <dialog id="delete-dialog" aria-labelledby="delete-title"><button class="close" data-close aria-label="Close deletion">×</button><h2 id="delete-title">Delete record?</h2><p id="delete-description"></p><p id="delete-error" class="form-error" role="alert"></p><div class="dialog-actions"><button class="button secondary" data-close>Keep record</button><button class="button" id="confirm-delete">Delete</button></div></dialog>
</body></html>
