const sql = require('./SQLSchema');
const verify = require('./verificationSchema');
const bcrypt = require('bcryptjs');
const mail = require('./emailSchema');

const user = {
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
console.log(`here we go: ${user.Password}`);
loginUser(user);
registerUser(user);
resetUserPassword(user);

async function registerUser(user){
	var errors = [];
	var form;
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
			form = user;
			form.VerifyKey = await bcrypt.genSalt(1);
			form.Password = await bcrypt.hash(user.Password, 6);
			result = await sql.newUser(form);
			if (result){
				mail.verifyEmail(form.Email, form.Username, form.VerifyKey);
				return (form);
			} else
				errors.push('Email is already in use');
		}
		else
			return (errors);
	} catch (err){
		console.log(err);
		//mail error
		errors = ['An Unexpected Error Occured Please Try Again Later...'];
		return (res.json({ 'error': errors }));
	}
}

async function loginUser(user){
	let errors = [];
	try {
		if (user == null || user.Email == null || user.Password == null)
		return (errors.push("Fields are not valid"));
		let data = await sql.findEmail(user.Email);
		if (data != null){
			if (data.Password){
				let result = await bcrypt.compare(user.Password, data.Password);
				if (result == true){
					return (user);
				} else{
					errors.push("Incorrect Password");
					return (errors);
				}
			}
		}
		errors.push("Unknown user");
		return(errors);
	} catch (err){
		console.log(err);
		errors = ['An Unexpected Error Occured Please Try Again Later...'];
		return (errors);
	}

}

async function resetUserPassword(user){
	try {
		let errors = [];
		if ( user == null || user.Id == null)
			errors.push('Form Incomplete');
		let key = await bcrypt.genSalt(1);
		let request = `VerifyKey=?`;
		let data = await sql.updateUser(user, request, [ key ]);
		if (!data)
			errors.push('Account was not found');
		else {
			user.VerifyKey = key;
			mail.resetEmail(user.Email, user.Username, key);
		}
		if (errors.length == 0){
			return (user);
		}
		else
			return (errors);
	} catch (err){
		console.log(err);
		//mail error
		errors = ['An Unexpected Error Occured Please Try Again Later...'];
		return (res.json({ 'error': errors }));
	}
}

async function deleteUser(){

}

