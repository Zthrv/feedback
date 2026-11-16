import 'dotenv/config';
import mysql from 'mysql2/promise';
const c = await mysql.createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
const [rows] = await c.execute("SELECT feedback_id,sender_id,receiver_id,feedback_title,feedback_text,created_at FROM feedback ORDER BY feedback_id DESC LIMIT 8");
console.log(JSON.stringify(rows,null,2));
await c.end();
