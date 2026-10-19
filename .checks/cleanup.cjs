const {spawnSync}=require('node:child_process');
module.exports=function cleanup(emails){
 if(!Array.isArray(emails)||!emails.length||!emails.every(e=>/^bookngo-test-[a-f0-9]+-[ab]@example\.test$/.test(e)))throw Error('Only temporary test emails may be removed.');
 const values=emails.map(e=>"'"+e+"'").join(',');
 const sql=`START TRANSACTION;
DELETE bs FROM bookngo.booking_seats bs JOIN bookngo.bookings b ON bs.booking_id=b.id JOIN bookngo.users u ON b.user_id=u.id WHERE u.email IN (${values});
DELETE b FROM bookngo.bookings b JOIN bookngo.users u ON b.user_id=u.id WHERE u.email IN (${values});
DELETE FROM bookngo.users WHERE email IN (${values});
COMMIT;`;
 const result=spawnSync(process.env.BOOKNGO_MYSQL||'C:\\xampp\\htdocs\\mysql\\bin\\mysql.exe',['-u','root','-h','127.0.0.1','bookngo'],{input:sql,encoding:'utf8'});
 if(result.status!==0)throw Error('Test cleanup failed: '+(result.stderr||result.error));
 console.log('Temporary test accounts and bookings removed.');
};
