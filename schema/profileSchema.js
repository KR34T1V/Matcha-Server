const sql = require('./SQLSchema');
const verify = require('./verificationSchema');
const bcrypt = require('bcryptjs');
const mail = require('./emailSchema');

let user = {
	Username : "BOB",
	Firstname : "Bob",
	Lastname : "Nan",
	Birthdate : new Date(1997,08,29).toLocaleDateString(),
	Email : "BobNan@dispostable.com",
	Gender : "Male",
	SexualPreference : "Bisexual",
	Password : "StaciesMom1!",
	RePassword : "StaciesMom1!"
}
registerUser(user);

async function registerUser(user){
	var errors = [];
	let result;
	try{
		if (!user.Username || !user.Firstname || !user.Lastname || !user.Birthdate
			|| !user.Gender || !user.SexualPreference || !user.Email || 
			!user.Password || !user.RePassword)
			errors.push('Form is incomplete');
		if (!verify.checkUserName(user.Username))
			errors.push('Username may not contain special characters');
		if (!verify.checkNames(user.Firstname) || !verify.checkNames(user.Lastname))
			errors.push('Firstname & Lastname may not contain special characters');
		if (!verify.checkBirth(user.Birthdate))
			errors.push('Selected date of birth is invalid');
		if (!verify.checkGender(user.Gender))
			errors.push('Selected gender is invalid');
		if (!verify.checkPreference(user.SexualPreference))
			errors.push('Selected sexual preference is invalid');
		if (!verify.checkEmail(user.Email))
			errors.push('Invalid email address');
		if (!verify.checkPassword(user.Password))
			errors.push('Password must contain: \'uppercase\', \'lowercase\', \'numeric\', \'special\' characters');
		if (!verify.checkRePassword(user.Password, user.RePassword))
			errors.push('Passwords do not match');
		//SQL stuff goes here
		if (!errors.length) {
			//Prepare for SQL
			//user.Birthdate = user.Birthdate.toLocaleDateString();
			user.VerifyKey = await bcrypt.genSalt(1);
			user.Password = await bcrypt.hash(user.Password, 6);
			result = await sql.newUser(user);
			if (result){
				mail.verifyEmail(user.Email, user.Username, user.VerifyKey);
				return (1);
			} else
				errors.push('Email is already in use');
		}
		// if (await mongo.searchUser({ 'Email' : user.u_email, DateDeleted: null }) != null)
		// 	errors.push('Email is already in use');
		// else if (!errors.length) {
		// 	user.key = await bcrypt.genSalt(1);
		// 	user.u_pwd = await bcrypt.hash(user.u_pwd, 6);
		// 	await mongo.addUser(user);
		// 	mail.verifyEmail(user.u_email, user.u_name, user.key);
		// }
		else
			return (errors);
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

