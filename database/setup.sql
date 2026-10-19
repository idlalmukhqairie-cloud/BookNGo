-- Import into phpMyAdmin. Safe to import again; existing accounts and bookings are preserved.
CREATE DATABASE IF NOT EXISTS bookngo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bookngo;
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS bookngo_sessions (
 id CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 data MEDIUMBLOB NOT NULL,
 expires_at BIGINT UNSIGNED NOT NULL,
 KEY session_expiry (expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS users (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(60) NOT NULL,
 email VARCHAR(160) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 role ENUM('user','admin') NOT NULL DEFAULT 'user',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS movies (
 id VARCHAR(30) PRIMARY KEY, title VARCHAR(160) NOT NULL, genre VARCHAR(40) NOT NULL,
 duration_minutes SMALLINT UNSIGNED NOT NULL, age_rating VARCHAR(10) NOT NULL,
 price DECIMAL(8,2) NOT NULL, poster VARCHAR(512) NOT NULL,
 backdrop VARCHAR(512) NULL, description TEXT NULL,
 is_active TINYINT(1) NOT NULL DEFAULT 1,
 status ENUM('showing','soon') NOT NULL DEFAULT 'showing', sort_order SMALLINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS cinemas (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE,
 is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS showtimes (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, movie_id VARCHAR(30) NOT NULL,
 cinema_id INT UNSIGNED NOT NULL, starts_at DATETIME NOT NULL,
 is_active TINYINT(1) NOT NULL DEFAULT 1,
 UNIQUE KEY unique_show (movie_id, cinema_id, starts_at),
 FOREIGN KEY (movie_id) REFERENCES movies(id), FOREIGN KEY (cinema_id) REFERENCES cinemas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS bookings (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, reference VARCHAR(32) NOT NULL UNIQUE,
 user_id BIGINT UNSIGNED NOT NULL, showtime_id BIGINT UNSIGNED NOT NULL,
 total DECIMAL(8,2) NOT NULL, status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (showtime_id) REFERENCES showtimes(id),
 KEY user_bookings (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS booking_seats (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, booking_id BIGINT UNSIGNED NOT NULL,
 active_showtime_id BIGINT UNSIGNED NULL, seat VARCHAR(3) NOT NULL,
 UNIQUE KEY unique_reserved_seat (active_showtime_id, seat),
 FOREIGN KEY (booking_id) REFERENCES bookings(id),
 FOREIGN KEY (active_showtime_id) REFERENCES showtimes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @bookngo_upgrade = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='role')=0,'ALTER TABLE users ADD COLUMN role ENUM(''user'',''admin'') NOT NULL DEFAULT ''user''','SELECT 1');
PREPARE bookngo_upgrade_stmt FROM @bookngo_upgrade;
EXECUTE bookngo_upgrade_stmt;
DEALLOCATE PREPARE bookngo_upgrade_stmt;

SET @bookngo_upgrade = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cinemas' AND COLUMN_NAME='is_active')=0,'ALTER TABLE cinemas ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1','SELECT 1');
PREPARE bookngo_upgrade_stmt FROM @bookngo_upgrade;
EXECUTE bookngo_upgrade_stmt;
DEALLOCATE PREPARE bookngo_upgrade_stmt;

SET @bookngo_upgrade = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='showtimes' AND COLUMN_NAME='is_active')=0,'ALTER TABLE showtimes ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1','SELECT 1');
PREPARE bookngo_upgrade_stmt FROM @bookngo_upgrade;
EXECUTE bookngo_upgrade_stmt;
DEALLOCATE PREPARE bookngo_upgrade_stmt;
INSERT INTO users (name,email,password_hash,role) VALUES ('Super Admin','admin@bookngo.com','$2y$10$HWndyxmiM9EJRyJw4rwEMuai6WeLT7bODQ7u9v4.KAwHJ/qU0B.bq','admin') ON DUPLICATE KEY UPDATE password_hash=IF(role='admin',password_hash,VALUES(password_hash)),role='admin';

-- Preserve old movies for booking history; show only the current catalogue.
SET @bookngo_upgrade = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movies' AND COLUMN_NAME='is_active')=0,'ALTER TABLE movies ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1','SELECT 1');
PREPARE bookngo_upgrade_stmt FROM @bookngo_upgrade;
EXECUTE bookngo_upgrade_stmt;
DEALLOCATE PREPARE bookngo_upgrade_stmt;
ALTER TABLE movies MODIFY poster VARCHAR(512) NOT NULL, MODIFY backdrop VARCHAR(512) NULL;
UPDATE movies SET is_active=0 WHERE id IN ('dune','interstellar','batman','spider','oppenheimer','insideout','arrival','inception');

INSERT IGNORE INTO movies (id,title,genre,duration_minutes,age_rating,price,poster,backdrop,description,status,sort_order,is_active) VALUES
('street-fighter','Street Fighter','Action','0','TBC','22','image/Street%20Fighter%20.jpg',NULL,'Choose your fighter. Bring the arcade energy to your next big-screen movie night.','showing','0','1'),
('other-mommy','Other Mommy','Horror','0','TBC','20','image/OTHER%20MOMMY.jpeg',NULL,'Make room for a chilling horror movie night with Other Mommy.','showing','1','1'),
('avengers-doomsday','Avengers: Doomsday','Action / Sci-Fi','0','TBC','24','https://i.abcnewsfe.com/a/0c097b14-4cb4-4ca8-ba88-e770a1d3d4dd/avengers-poster_1766515462943_hpEmbed_2x3.jpg',NULL,'The Avengers return for another big-screen event. Watch this space for demo showtimes.','soon','2','1'),
('clayface','Clayface','Horror / Thriller','0','TBC','22','https://pbs.twimg.com/media/HGhTNnTbUAAOeeG.jpg?name=orig',NULL,'Discover the darker side of Gotham with Clayface.','soon','3','1'),
('resident-evil','Resident Evil','Horror','0','TBC','22','https://d9s3e2ooa0od7.cloudfront.net/assets/resident-evil/4569e7e0-a5b5-4b5b-84fc-2c39ede8ac67/4569e7e0-a5b5-4b5b-84fc-2c39ede8ac67.jpg',NULL,'Step into survival horror with Resident Evil. Pick your seats for a tense night at the movies.','showing','4','1'),
('juminten-edan','Juminten Edan','Horror','0','TBC','18','image/Juminten%20Edan.jpg',NULL,'Add Indonesian horror to your movie night with Juminten Edan.','showing','5','1'),
('whalefall','Whalefall','Thriller','0','TBC','20','image/Whalefall.jpeg',NULL,'Take a deep dive into your next big-screen thriller with Whalefall.','showing','6','1'),
('avengers-endgame','Avengers: Endgame','Action / Sci-Fi','181','TBC','22','or06FN3Dka5tukK1e9sl16pB3iy.jpg',NULL,'Assemble your friends for an Avengers: Endgame screening in our demo programme.','showing','7','1'),
('spider-man-brand-new-day','Spider-Man: Brand New Day','Action / Adventure','0','TBC','22','https://imagecinepolisgcc.enpointe.io/uploads/images/movies/1782028871177-movie_image1_1782028869987.jpg',NULL,'A brand new movie night starts here. Catch Spider-Man on the big screen.','showing','8','1'),
('khong-khaek-2','Khong Khaek 2','Horror','0','TBC','18','image/Khong%20Khaek%202.jpeg',NULL,'Settle in for Thai supernatural horror with Khong Khaek 2.','showing','9','1');
UPDATE cinemas SET name='BookNGo · Perak' WHERE name='BookNGo · Ipoh';
UPDATE cinemas SET name='BookNGo · Selangor' WHERE name='BookNGo · Penang';
INSERT IGNORE INTO cinemas (name) VALUES ('BookNGo · Kuala Lumpur'),('BookNGo · Perak'),('BookNGo · Selangor'),('BookNGo · Kelantan'),('BookNGo · Terengganu');
INSERT IGNORE INTO showtimes (movie_id,cinema_id,starts_at)
SELECT m.id,c.id,TIMESTAMP(DATE_ADD(CURDATE(),INTERVAL d.day_number DAY),t.show_time)
FROM movies m CROSS JOIN cinemas c
CROSS JOIN (SELECT 0 day_number UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) d
CROSS JOIN (SELECT '14:30:00' show_time UNION ALL SELECT '17:45:00' UNION ALL SELECT '21:00:00') t
WHERE m.status='showing' AND m.is_active=1 AND c.is_active=1;
