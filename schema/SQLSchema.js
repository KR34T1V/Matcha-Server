const mysql = require('mysql');
const config = require('../config');
const util = require('util');
const moment = require('moment');

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
			user.AccessTime = new Date();
			console.log(user.AccessTime);
			result = await insertUser(user);
			console.log(`User added -> ${user.Username}`)
			return (result);
		}
	} catch (err) {
		console.log(err);
	}
}

//kinda working
async function updateUser(id, qry, varArray){
	try{
		if (id != null && qry != null && varArray != null){
			let request = `UPDATE ${config.USERS_TABLE} SET ${qry}, DateModified=? WHERE Id=? AND DateDeleted IS NULL`;
			varArray.push(new Date());
			varArray.push(id);
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
			values = await buildQuery(values, ', ');
			let request = `INSERT INTO ${config.USERS_TABLE} (${qry}) VALUES (${values})`;
			// console.log(request);
			console.log(varArray);
			await query(request, varArray);
			return (1);
		}
		return (0);		
	} catch (err){
		console.log(err);
	}
}

async function findEmail(email){
	try{
		let request = `SELECT * FROM ${config.USERS_TABLE} WHERE (Email=? OR NewEmail=?) AND DateDeleted IS NULL`;
		let res = await query(request,[email, email]);
			if (res != null && res[0] != null){
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

async function buildQuery(queryArray, separator){
	let request = null;

	if (queryArray == null)
		return(null);
	queryArray.forEach((elem, i)=>{
		if (i > 0)
			request = request + separator;
		if (request == null)
			request = elem;
		else
			request = request + elem;
	})
	return(request);
}

async function getAllActiveUsers(){
	try{
		let request = `SELECT * FROM ${config.USERS_TABLE} WHERE DateDeleted IS NULL`;
		let data = await query(request, []);
		return data;

	} catch(err){
		console.log(err);
	}
}

async function searchAllActiveUsers(where, varArray){
	
	try{
		let request = `SELECT * FROM ${config.USERS_TABLE} WHERE ${where} AND DateDeleted IS NULL`;
		let data = await query(request, varArray);
		return data;

	} catch(err){
		console.log(err);
	}
}

async function findAccessToken(token){
	try {
		let request = `SELECT * FROM ${config.USERS_TABLE} WHERE AccessToken=? AND DateDeleted IS NULL`;
		let res = await query(request,[token]);
			if (res != null && res[0] != null){
				return (res[0]);
			}
			return (null);
	} catch (err){
		console.log(err);
	}
}

//SUBMODULES
async function insertUser(user){
	//this has no security checks
	try{
		let request = `INSERT INTO ${config.USERS_TABLE} 
		(AccessTime, Username, Firstname, Lastname, Birthdate, Gender, SexualPreference, NewEmail,
		VerifyKey, Password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
		console.log(user.VerifyKey);
		let res = await query(request, [user.AccessTime, user.Username, user.Firstname, user.Lastname, 
			user.Birthdate, user.Gender, user.SexualPreference, user.NewEmail, user.VerifyKey, user.Password]);
		return (user);
	} catch (err) {
		console.log(err);
	}
}



module.exports = {
	newUser,
	getAllActiveUsers,
	searchAllActiveUsers,
	insert,
	updateUser,
	findEmail,
	findId,
	findUsername,
	buildQuery,
	findAccessToken
}