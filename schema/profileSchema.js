const sql = require('./SQLSchema');
const verify = require('./verificationSchema');

async function registerUser(){
	var user = (req.body);
	var errors = [];
	try{
		if (!user.u_name || !user.u_first || !user.u_last || !user.u_bdate || !user.u_gender ||
			!user.u_pref || !user.u_email || !user.u_pwd || !user.u_repwd)
			errors.push('Form is incomplete');
		if (!verify.checkUserName(user.u_name))
			errors.push('Username may not contain special characters');
		if (!verify.checkNames(user.u_first) || !verify.checkNames(user.u_last))
			errors.push('Firstname & Lastname may not contain special characters');
		if (!verify.checkBirth(user.u_bdate))
			errors.push('Selected date of birth is invalid');
		if (!verify.checkGender(user.u_gender))
			errors.push('Selected gender is invalid');
		if (!verify.checkPreference(user.u_pref))
			errors.push('Selected sexual preference is invalid');
		if (!verify.checkEmail(user.u_email))
			errors.push('Invalid email address');
		if (!verify.checkPassword(user.u_pwd))
			errors.push('Password must contain: \'uppercase\', \'lowercase\', \'numeric\', \'special\' characters');
		if (!verify.checkRePassword(user.u_pwd, user.u_repwd))
			errors.push('Passwords do not match');
		//SQL stuff goes here
		// if (await mongo.searchUser({ 'Email' : user.u_email, DateDeleted: null }) != null)
		// 	errors.push('Email is already in use');
		// else if (!errors.length) {
		// 	user.key = await bcrypt.genSalt(1);
		// 	user.u_pwd = await bcrypt.hash(user.u_pwd, 6);
		// 	await mongo.addUser(user);
		// 	mail.verifyEmail(user.u_email, user.u_name, user.key);
		// }
		if (!errors.length){
			return (res.json({ 'msg': 'Success', 'email': user.u_email }));
		}
		else
			return (res.json({ 'error': errors }));
	} catch (err){
		console.log(err);
		//mail error
		errors = ['An Unexpected Error Occured Please Try Again Later...'];
		return (res.json({ 'error': errors }));
	}
}

async function loginUser(){

}

async function deleteUser(){

}

