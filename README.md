# BookNGo — PHP + MySQL

Start Apache and MySQL in XAMPP, then open **http://localhost/BookNGo/**. `home.html` opens the same app. Open through localhost; a `file://` URL cannot use the PHP backend.

## Database setup

Database **bookngo** has been created locally. View its tables at **http://localhost/phpmyadmin/**.

For a fresh installation, configure `config/database.php`, open phpMyAdmin → Import, and select `database/setup.sql`.

This creates the database and tables, imports ten selected films and five cinema locations (Kuala Lumpur, Perak, Selangor, Kelantan and Terengganu), and adds seven days of showtimes for the demo programme. The location list is in `database/cinemas.json`. Import it again when you need another week of sample showtimes. It preserves existing users and bookings. Previous catalogue entries are archived and remain available for booking history. The default database name is `bookngo`; update the SQL and configuration together if renaming it.

Tables: `users`, `movies`, `cinemas`, `showtimes`, `bookings`, `booking_seats`. `database/schema.sql` contains the schema; `database/movies.json` contains sample films. Runtime database credentials can also be supplied with `BOOKNGO_DB_HOST`, `BOOKNGO_DB_PORT`, `BOOKNGO_DB_NAME`, `BOOKNGO_DB_USER`, and `BOOKNGO_DB_PASSWORD` environment variables. Local XAMPP defaults use root with no password; use a dedicated database user and HTTPS when deploying.

## Features

### Super Admin

Login through the normal website with **admin@bookngo.com** / **admin123**. Successful login redirects to **http://localhost/BookNGo/admin/**. The admin account is seeded with a hashed password; existing admin passwords are preserved on later SQL imports.

The panel includes live dashboard counts, cinema and movie creation/editing/deletion, showtime scheduling/editing/deletion, all customer bookings with deletion, and customer creation/editing/deletion. Lists support search and pagination. Cinema/movie/showtime deletion removes the item from customer listings while retaining existing tickets. Deleting a booking removes it and releases its seats; deleting a customer removes their bookings and invalidates their session. The Super Admin account cannot be deleted from this panel.

Admin routes and API actions check the database role on the server. Public registration always creates customer accounts. Poster fields accept HTTPS URLs or local `image/` and `assets/` paths. Creating a movie does not automatically add showtimes; add its screenings under Showtimes. A showtime with bookings cannot be moved until its bookings are removed.

Home, Movies, My Bookings, About Us, responsive navigation, search, category filters, account registration, password login/logout, cinema/date/time selection, up to six seats per booking, booking confirmation and cancellation.

Accounts use PHP sessions and hashed passwords. All catalogue data and bookings come from MySQL, with ownership checked on the server. Booking prices are calculated by the server. InnoDB transactions and a unique seat constraint prevent double booking across users. Cancellation deletes the booking and its seat records in one transaction, releases the seats, and removes the ticket from My Bookings. Write requests require a CSRF token; SQL uses prepared statements.

Earlier browser-only demo accounts and bookings are not imported. Create a new account with a password using Login → Create account.

## Verification

Run the API integration checks with a modern Node.js runtime:

```powershell
node .checks/database.cjs
node .checks/frontend.cjs
node .checks/admin.cjs
node .checks/admin-ui.cjs
```

The checks create temporary test accounts, exercise authentication, conflicting bookings, pricing, ownership and cancellation, then remove only those test records. The frontend check uses a simulated DOM against the live PHP API. Tests assume the local XAMPP database credentials; set `BOOKNGO_MYSQL` if the MySQL executable is installed elsewhere. Visual browser QA has not been performed in this environment.

This remains a demo cinema programme: no payment is processed or actual cinema ticket issued. Runtime and age rating values marked TBC are unconfirmed. Film artwork comes from promotional image providers, with local title-specific placeholders when unavailable. See `database/movie-sources.md` for references. BookNGo is not endorsed by or affiliated with the studios or cinemas.
