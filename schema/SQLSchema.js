const mysql = require('mysql');
const config = require('../config');
const util = require('util');

const con = mysql.createConnection({
	host: config.MY_SQL_HOST,
	user: config.MY_SQL_USERNAME,
	password: config.MY_SQL_PASSWORD
  });
  
// node native promisify
const query = util.promisify(con.query).bind(con);

//CONNECT DB AND CREATE TABLES
con.connect(async (err) => {
	if (err) throw err;
	await createDatabase(config.DATABASE_NAME);
	await selectDatabase(config.DATABASE_NAME);
	await createTable(config.USERS_TABLE, config.USERS_TABLE_COLUMNS);
	console.log("MySQL Connected!");
});

//STARTUP FUNCTIONS
async function createDatabase(database){
	try {
		let request = `CREATE DATABASE IF NOT EXISTS ${database}`;
		let res = await query(request);
		console.log('Database: ' + database);
		return(database);
	} catch (err){
		console.log(err);
	}
}

async function createTable(table, tableColumns){
	try{
		let request = `CREATE TABLE IF NOT EXISTS ${table}(${tableColumns})`;
		let res = await query(request);
		console.log(`Table Created: ${table}`);
		return(table);
	} catch (err){
		console.log(err);
	}
}

async function selectDatabase(database){
	try{
		let request = `USE ${database}`;
		let res = await query(request);
		console.log(`Using: ${database}`);
		return(database);
	} catch (err){
		console.log(err);
	}
}

//EXPORTS
async function newUser(user){
	let result;
	try{
		if ((result = await findEmail(user.Email))){
			return null;
		}else {
			result = await insertUser(user);
			console.log(`User added -> ${user.Username}`)
			return (result);
		}
	} catch (err) {
		console.log(err);
	}
}

//kinda working
async function updateUser(user, qry, varArray){
	try{
		if (user && user.Email){
			let request = `UPDATE ${config.USERS_TABLE} SET ${qry} WHERE Email=? AND DateDeleted IS NULL`;
			varArray.push(user.Email);
			await query(request, varArray);
			return (1);
		}
		return (0);		
	} catch (err){
		console.log(err);
	}
}

async function insert(qry, varArray){
	let values = [];
	try{
		if (qry != null, varArray != null){
			varArray.forEach(()=>{
				values.push('?');
			})
			values = await buildQuery(values);
			let request = `INSERT INTO ${config.USERS_TABLE} (${qry}) VALUES (${values})`;
			console.log(request);
			console.log(varArray);
			await query(request, varArray);
			return (1);
		}
		return (0);		
	} catch (err){
		console.log(err);
	}
}

async function findEmail(email, newEmail){
	try{
		let request = `SELECT * FROM ${config.USERS_TABLE} WHERE (Email=? OR NewEmail=?) AND DateDeleted IS NULL`;
		let res = await query(request,[email, newEmail]);
			if (res && res[0] && res[0]){
				return (res[0]);
			}
			return (null);
	} catch (err){
		console.log(err);
	}
}

async function findId(id){
	try{
		let request = `SELECT * FROM ${config.USERS_TABLE} WHERE Id=? AND DateDeleted IS NULL`;
		let res = await query(request, id);
		if (res && res[0])
			return (res[0]);
		return (null);
	} catch (err){
		console.log(err);
	}
}

async function findUsername(user){
	try{
		let request = `SELECT * FROM ${config.USERS_TABLE} WHERE Username=? AND DateDeleted IS NULL`;
		let res = await query(request, user);
		if (res && res[0])
			return(res[0]);
		return (null);
	} catch (err){
		console.log(err);
	}
}

async function buildQuery(queryArray){
	let request = null;

	if (queryArray == null)
		return(null);
	queryArray.forEach((elem, i)=>{
		if (i > 0)
			request = request + ', ';
		if (request == null)
			request = elem;
		else
			request = request + elem;
	})
	return(request);
}

//SUBMODULES
async function insertUser(user){
	//this has no security checks
	try{
		let request = `INSERT INTO ${config.USERS_TABLE} 
		(Username, Firstname, Lastname, Birthdate, Gender, SexualPreference, Email,
		VerifyKey, Password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
		console.log(user.VerifyKey);
		let res = await query(request, [user.Username, user.Firstname, user.Lastname, 
			user.Birthdate, user.Gender, user.SexualPreference, user.Email, user.VerifyKey, user.Password]);
		return (user);
	} catch (err) {
		console.log(err);
	}
}



module.exports = {
	newUser,
	insert,
	updateUser,
	findEmail,
	findId,
	findUsername,
	buildQuery
}