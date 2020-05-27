var mysql = require('mysql');

var con = mysql.createConnection({
	host: "localhost",
	user: "matcha",
	password: "Papenvleis1"
  });
  
con.connect((err) => {
	if (err) throw err;
	console.log("MySQL Connected!");
});