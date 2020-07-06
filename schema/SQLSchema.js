"use strict"
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
	await createTable(config.CHAT_TABLE, config.CHAT_TABLE_COLUMNS);
	await createTable(config.NOTIFY_TABLE, config.NOTIFY_TABLE_COLUMNS);
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
			result = await insertUser(user);
			console.log(`User added -> ${user.Username}`)
			return (result);
		}
	} catch (err) {
		console.log(err);
	}
}

//returns 1 on change and 0 on failure
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

async function stripHTML(string){
	if (string != null && string.length > 0){
		// Remove style tags and content
		string.replace(/<style[^>]*>.*<\/style>/gm, '')
		// Remove script tags and content
		.replace(/<script[^>]*>.*<\/script>/gm, '')
		// Remove all opening, closing and orphan HTML tags
		.replace(/<[^>]+>/gm, '')
		// Remove leading spaces and repeated CR/LF
		.replace(/([\r\n]+ +)+/gm, '');
	}
	return (string);
}

async function getConnexion(id){
	let request = `SELECT Id, Username, Avatar FROM ${config.USERS_TABLE} WHERE Id=? AND DateDeleted IS NULL`
	let res = await query(request, [id]);
	return(res);
}

//CHAT
async function sendChatMessage(senderId, receiverId, msg){
	try{
		let request = `INSERT INTO ${config.CHAT_TABLE} (FromId, ToId, Message) VALUES (?, ?, ?)`;
		let res = await query(request, [senderId, receiverId, msg]);
		return(res);
	} catch (err){
		console.log(err);
	}
}

async function readChatMessages(senderId, receiverId){
	try{
		let request = `SELECT FromId, Viewed, Message FROM ${config.CHAT_TABLE} WHERE (FromId=? AND ToId=?) OR (FromId=? AND ToId=?) ORDER BY TimeStamp`;
		let res = await query(request, [senderId, receiverId, receiverId, senderId]);
		request = `UPDATE ${config.CHAT_TABLE} SET Viewed=TRUE WHERE ToId=?`
		await query(request, [receiverId]);
		return(res);
	} catch (err){
		console.log(err);
	}
}

async function checkNewChatMessages(userId){
	try{
		let request1 = `SELECT FromId FROM ${config.CHAT_TABLE} WHERE ToId=? AND Viewed=FALSE ORDER BY TimeStamp`;
		let request2 = `SELECT Id, Username, Avatar FROM ${config.USERS_TABLE} WHERE Id IN (${request1}) AND Id!=? AND DateDeleted IS NULL`
		let rest = await query(request2, [userId, userId]);
		return (rest);
	} catch (err){
		console.log(err);
	}
}

//NOTIFICATIONS
async function newUserNorification(FromId, ToId, message){
	try{
		let request = `INSERT INTO ${config.NOTIFY_TABLE} (FromId, ToId, Message) VALUES (?, ?, ?)`;
		let result = await query(request, [FromId, ToId, message]);
		return (result);
	} catch (err){
		console.log(err);
	}
}

async function getUserNotifications(userId){
	try{
		let request = `SELECT Id, Username, Avatar, Message, Viewed, "Profile" AS Type FROM ${config.NOTIFY_TABLE} INNER JOIN ${config.USERS_TABLE} \
		ON  ${config.NOTIFY_TABLE}.FromId = ${config.USERS_TABLE}.Id WHERE ToId=? ORDER BY TimeStamp`;
		let result = await query(request, [userId]);
		console.log(result);
		return(result);
	} catch (err){
		console.log(err);
	}
}

async function clearUserNotifications(userId){
	try{
		let request = `DELETE FROM ${config.NOTIFY_TABLE} WHERE ToId=? AND Viewed=TRUE`;
		let result = await query(request, [userId]);
		return(result);
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
	findAccessToken,
	stripHTML,
	sendChatMessage,
	readChatMessages,
	checkNewChatMessages,
	newUserNorification,
	getUserNotifications,
	clearUserNotifications,
	getConnexion
}