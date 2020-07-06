const profile = require('./profileSchema');
const sql = require('./SQLSchema');

async function readNotifications(accesstoken){
	let user = await profile.verifyAccessToken(accesstoken);
	if (user != null && user.Id != null){
		let notify = await sql.getUserNotifications(user.Id);
		return(notify);
	} else return (null);
}

module.exports = {
	readNotifications
}