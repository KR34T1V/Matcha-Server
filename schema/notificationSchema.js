const profile = require('./profileSchema');
const sql = require('./SQLSchema');

async function readNotifications(id){
	let notify = await sql.getUserNotifications(id);
	return(notify);
}

module.exports = {
	readNotifications
}