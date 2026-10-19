// Generates the portable SQL file used by phpMyAdmin's Import screen.
const fs=require('node:fs'),path=require('node:path');
const dir=__dirname;
const quote=value=>value==null?'NULL':"'"+String(value).replace(/'/g,"''")+"'";
const movies=JSON.parse(fs.readFileSync(path.join(dir,'movies.json'),'utf8'));
const admin=JSON.parse(fs.readFileSync(path.join(dir,'admin.json'),'utf8'));
let sql='-- Import into phpMyAdmin. Safe to import again; existing accounts and bookings are preserved.\nCREATE DATABASE IF NOT EXISTS bookngo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE bookngo;\nSET NAMES utf8mb4;\n'+fs.readFileSync(path.join(dir,'schema.sql'),'utf8');
for(const [table,column,definition] of [['users','role',"ENUM('user','admin') NOT NULL DEFAULT 'user'"],['cinemas','is_active','TINYINT(1) NOT NULL DEFAULT 1'],['showtimes','is_active','TINYINT(1) NOT NULL DEFAULT 1']]){
 sql+='\nSET @bookngo_upgrade = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='+quote(table)+' AND COLUMN_NAME='+quote(column)+')=0,'+quote('ALTER TABLE '+table+' ADD COLUMN '+column+' '+definition)+",'SELECT 1');\nPREPARE bookngo_upgrade_stmt FROM @bookngo_upgrade;\nEXECUTE bookngo_upgrade_stmt;\nDEALLOCATE PREPARE bookngo_upgrade_stmt;\n";
}
sql+='INSERT INTO users (name,email,password_hash,role) VALUES ('+[admin.name,admin.email,admin.password_hash,'admin'].map(quote).join(',')+") ON DUPLICATE KEY UPDATE password_hash=IF(role='admin',password_hash,VALUES(password_hash)),role='admin';\n";
sql+=`\n-- Preserve old movies for booking history; show only the current catalogue.\nSET @bookngo_upgrade = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movies' AND COLUMN_NAME='is_active')=0,'ALTER TABLE movies ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1','SELECT 1');
PREPARE bookngo_upgrade_stmt FROM @bookngo_upgrade;
EXECUTE bookngo_upgrade_stmt;
DEALLOCATE PREPARE bookngo_upgrade_stmt;
ALTER TABLE movies MODIFY poster VARCHAR(512) NOT NULL, MODIFY backdrop VARCHAR(512) NULL;
UPDATE movies SET is_active=0 WHERE id IN ('dune','interstellar','batman','spider','oppenheimer','insideout','arrival','inception');
`;
sql+='\nINSERT IGNORE INTO movies (id,title,genre,duration_minutes,age_rating,price,poster,backdrop,description,status,sort_order,is_active) VALUES\n';
sql+=movies.map((m,i)=>'('+[m.id,m.title,m.genre,parseInt(m.length)||0,m.age,m.price,m.poster,m.backdrop,m.description,m.status,i,1].map(quote).join(',')+')').join(',\n')+';\n';
const cinemas=JSON.parse(fs.readFileSync(path.join(dir,'cinemas.json'),'utf8'));
sql+="UPDATE cinemas SET name='BookNGo · Perak' WHERE name='BookNGo · Ipoh';\nUPDATE cinemas SET name='BookNGo · Selangor' WHERE name='BookNGo · Penang';\n";
sql+='INSERT IGNORE INTO cinemas (name) VALUES '+cinemas.map(name=>'('+quote(name)+')').join(',')+';\n';
sql+=`INSERT IGNORE INTO showtimes (movie_id,cinema_id,starts_at)
SELECT m.id,c.id,TIMESTAMP(DATE_ADD(CURDATE(),INTERVAL d.day_number DAY),t.show_time)
FROM movies m CROSS JOIN cinemas c
CROSS JOIN (SELECT 0 day_number UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) d
CROSS JOIN (SELECT '14:30:00' show_time UNION ALL SELECT '17:45:00' UNION ALL SELECT '21:00:00') t
WHERE m.status='showing' AND m.is_active=1 AND c.is_active=1;\n`;
fs.writeFileSync(path.join(dir,'setup.sql'),sql);
console.log('database/setup.sql generated. Import using phpMyAdmin.');
