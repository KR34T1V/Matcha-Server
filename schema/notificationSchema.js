const profile = require('./profileSchema');
const sql = require('./SQLSchema');

async function readNotification(accesstoken){
	let user = await profile.verifyAccessToken(accesstoken);
	if (user != null && user.Id != NULL){
		sql.getUserNotifications(user.Id);
	} else return (null);
}