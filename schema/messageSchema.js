const sql = require('./SQLSchema');
const profile = require('./profileSchema');
const config = require('../config');
const gen = require('./generatorSchema');

async function test(){
	// for (var i = 0; i <= 50; i++){
	// 	sql.sendChatMessage(gen.getRandomInt(1, 25),gen.getRandomInt(1, 25),`test message ${i}`)
	// }
	let news = await sql.checkNewChatMessages(1);
	console.log(news);
	// let rest = await sql.readChatMessages(1,2);
	// console.log(rest);
}

// returns null on success or an array of errors;
async function sendChatMessage(accesstoken, to, msg){
	if (accesstoken == null || to == null || msg == null)
		return(config.MSG_FORM_INVALID);
	let user1 = await profile.verifyAccessToken(accesstoken);
	let user2 = await sql.findId(to);
	if (user1 != null && user1.Id != null){
		if (user1.Liked != null && user1.Liked.includes(to)
		&& user1.LikedBy != null && user1.LikedBy.includes(to)){
			if (user2 != null && user2.Id != null){
				let result = await sql.sendChatMessage(user1.Id, user2.Id, msg);
				return (null);
			} else return(['Receiver is no longer an active user'])
		} else return(['Users are not connexted']);
	}else return(user1);
}

//returns an array of chat messages or null
async function readChat(id, withId){
		let result = await sql.readChatMessages(id, withId);
		return(result);
}

//returns and array of users or null
async function checkNewChatMessages(Id){
	if (Id != null){
		let from = await sql.checkNewChatMessages(Id);
		return (from);
	} else return (null);
}
module.exports = {
	sendChatMessage,
	checkNewChatMessages,
	readChat,
}