const mysql = require('mysql');
const config = require('../config');

const con = mysql.createConnection({
	host: config.MY_SQL_HOST,
	user: config.MY_SQL_USERNAME,
	password: config.MY_SQL_PASSWORD
  });
  
con.connect((err) => {
	if (err) throw err;
	console.log("MySQL Connected!");
	createDatabase(config.DATABASE_NAME);
	selectDatabase(config.DATABASE_NAME);
	createTable(config.USERS_TABLE, config.USERS_TABLE_COLUMNS);
});

async function createDatabase(database){
	try {
		let query = `CREATE DATABASE IF NOT EXISTS ${database}`;
		let res = await con.query(query);
		res.on("end", () => {
			console.log('Database: ' + database);
		})	
	} catch (err){
		console.log(err);
	}
}

async function createTable(table, tableColumns){
	try{
		let query = `CREATE TABLE IF NOT EXISTS ${table}(${tableColumns})`;
		let res = await con.query(query);
		res.on("end", () => {
			console.log(`Table: ${table} Created.`);
		})
	} catch (err){
		console.log(err);
	}
}

async function selectDatabase(database){
	try{
		let query = `USE ${database}`;
		let res = await con.query(query);
		res.on("end", (msg) => {
			console.log(`Using: ${database}`);
		})
	} catch (err){
		console.log(err);
	}
}