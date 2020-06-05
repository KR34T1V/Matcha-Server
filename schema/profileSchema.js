const sql = require('./SQLSchema');
const verify = require('./verificationSchema');
const bcrypt = require('bcryptjs');
const mail = require('./emailSchema');
const gen = require('./generatorSchema');

// gen.generateUsers(50);
likeUser(1,2)
.then((res)=>{
	console.log(res);
})
// sql.findId(494)
// .then((user)=>{
// 	if (user != null)
// 		console.log(user);
// })
//returns the user on success, array of errors on failure
async function registerUser(user){
	var errors = [];
	let result;
	let form = {};
	try{
		if (user.Username == null || user.Firstname == null || user.Lastname == null ||
			user.Birthdate == null || user.Gender == null || user.SexualPreference == null ||
			user.Email == null || user.Password == null || user.RePassword == null)
			errors.push(['Fields are not valid']);
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
			form.Username = user.Username;
			form.Firstname = user.Firstname;
			form.Lastname = user.Lastname;
			form.Birthdate = user.Birthdate;
			form.Gender = user.Gender;
			form.SexualPreference = user.SexualPreference;
			form.Email = user.Email
			form.Password = await bcrypt.hash(user.Password, 6);
			form.VerifyKey = await bcrypt.genSalt(1);

			result = await sql.newUser(form);
			if (result){
				mail.verifyEmail(user.Email, user.Username, user.VerifyKey);
				return (form);
			} else
				errors.push('Email is already in use');
		}
		return (errors);
	} catch (err){
		console.log(err);
		//mail error
		errors = ['An Unexpected Error Occured Please Try Again Later...'];
		return (errors);
	}
}

//returns the user on success, array of errors on failure
async function loginUser(user){
	let errors = [];
	try {
		if (user == null || user.Email == null || user.Password == null)
			return (['Fields are not valid']);
		let data = await sql.findEmail(user.Email);
		if (data == null)
			data = await sql.findEmail(user.NewEmail);
		if (data != null){
			if (data.Password){
				let result = await bcrypt.compare(user.Password, data.Password);
				if (result == true){
					return (data);
				} else{
					errors.push("Password Incorrect");
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

//returns the modified user on success, array of errors on failure
async function updateUserProfile(user){
	let errors = [];
	let build = [];
	let form = [];
	let request;
	try{
		if (user == null || user.Id == null)
			return(['Fields are not valid']);
			let data = await sql.findId(user.Id);
			if (data == null)
				return (['Invalid User']);
			if (user.Username != null && user.Usermame != data.Username){
				if (!verify.checkUserName(user.Username))
					errors.push('Username may not contain special characters');
				else {
					build.push('Username=?');
					form.push(user.Username);
				}
			}
			if (user.Firstname != null && user.Firstname != data.Firstname){
				if (!verify.checkNames(user.Firstname))
					errors.push('Firstname may not contain special characters');
				else {
					build.push('Firstname=?');
					form.push(user.Firstname);
				}
			}
			if (user.Lastname != null && user.Lastname != data.Lastname){
				if (!verify.checkNames(user.Lastname))
					errors.push('Lastname may not contain special characters');
				else {
					build.push('Lastname=?');
					form.push(user.Lastname);
				}
			}
			if (user.Birthdate != null && user.Birthdate != data.Birthdate){
				if (!verify.checkBirth(user.Birthdate))
					errors.push('Selected date of birth is invalid');
				else {
					build.push('Birthdate=?');
					form.push(user.Birthdate);
				}
			}
			if (user.Gender != null && user.Gender != data.Gender){
				if (!verify.checkGender(user.Gender))
					errors.push('Selected gender is invalid');
				else {
					build.push('Gender=?');
					form.push(user.Gender);
				}
			}
			if (user.SexualPreference != null && user.SexualPreference != data.SexualPreference){
				if (!verify.checkPreference(user.SexualPreference))
					errors.push('Selected sexual preference is invalid');
				else {	
					build.push('SexualPreference=?')
					form.push(user.SexualPreference);
				}
			}

			//EMAIL
			if (user.NewEmail != null && user.NewEmail != data.Email){
				if (!verify.checkPassword(user.Password))
					errors.push('Password must contain: \'uppercase\', \'lowercase\', \'numeric\', \'special\' characters');
				else {
					//Create new key
					user.VerifyKey = await bcrypt.genSalt(1);
					mail.verifyEmail(user.NewEmail, user.Username, user.VerifyKey);
					//Unverify
					//Set New Email
					build.push('NewEmail=?');
					form.push(user.newEmail);
					build.push('DateVerified=?');
					form.push(null);
					build.push('VerifyKey=?');
					form.push(user.VerifyKey);
				}
			}

			//PASSWORD
			console.log(user.Password);
			if (! await bcrypt.compare(user.Password, data.Password)){
				if (!verify.checkPassword(user.Password)){
					errors.push('Password must contain: \'uppercase\', \'lowercase\', \'numeric\', \'special\' characters');
					if (!verify.checkRePassword(user.Password, user.RePassword))
						errors.push('Passwords do not match');
					else {
						user.Password = await bcrypt.hash(user.Password, 6);
						build.push('Password=?');
						form.push(user.Password);
					}
				}
			}
			if (errors.length == 0){
				request = await sql.buildQuery(build);
				if (await sql.updateUser(user.Id, request, form))
					return user;
				errors.push('An Unexpected Error Occured Please Try Again Later...');
			}
			return(errors);
	} catch(err){
		console.log(err);
		return (['An Unexpected Error Occured Please Try Again Later...'])
	}
}

//returns the modified user on success, array of errors on failure
async function resetUserPassword(user){
	

	try {
		let errors = [];
		if ( user == null || user.Id == null)
			return(['Fields are not valid']);
		let key = await bcrypt.genSalt(1);
		let request = `VerifyKey=?`;
		let data = await sql.updateUser(User.Id, request, [ key ]);
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
		return (errors);
	}
}

//returns the modified user on success, array of errors on failure
async function changeUserPassword(user){
	//REMOVE THESE DEV VALUES
	user.Password = "ILikeApples123!";
	user.RePassword = "ILikeApples123!";
	//REMOVE THESE DEV VALUES

	let errors = [];
	try {
		if ( user == null || user.Id == null || user.Password == null || user.RePassword == null)
			return(['Fields are not valid']);							
		if (!verify.checkPassword(user.Password))
			errors.push('Password must contain: \'uppercase\', \'lowercase\', \'numeric\', \'special\' & at least 8 characters');
		if (!verify.checkRePassword(user.Password, user.RePassword))
			errors.push('Passwords do not match');
		//check verification key
		let data  = await sql.findId(user.Id);
		if (data != null)
			if (data.VerifyKey != user.VerifyKey)
				errors.push("Key mismatch");
		else
			errors.push("Unknown User");
		//set password
		if (errors.length == 0){
			let hash = await bcrypt.hash(user.Password, 6);
			let request = `Password=?, VerifyKey=?`
			data = sql.updateUser(User.Id, request, [hash, null])
			if (data){
				user.Password = hash;
				return(user);
			} else {
				errors.push('An unexpected error occured please try again later...');
			}
		}
		return (errors);
	} catch (err){
		console.log(err);
		//mail error
		errors = ['An Unexpected Error Occured Please Try Again Later...'];
		return (errors);
	}
}

//Returns null on success, array of errors on failure
async function deleteUser(user){
	let errors = [];
	try {
		if ( user == null || user.Id == null || user.Password == null )
			return(['Fields are not valid']);
			let data = await sql.findId(user.Id);
			if (data != null){
				if (await bcrypt.compare(user.Password, data.Password)){
					let request = `DateDeleted=?`
					let res = await sql.updateUser(user.Id, request, new Date().toLocaleDateString());
					if (res){
						return (null);
					} else {
						errors.push('An Unexpected Error Occured Please Try Again Later...');
					}
				} else {
					errors.push('Password Incorrect');
				}
			} else {
			errors.push('User Not Found');
		}
		return(errors);
	} catch (err){
		console.log(err);
		//mail error
		errors = ['An Unexpected Error Occured Please Try Again Later...'];
		return (errors);
	}
}

async function likeUser(id, profileId){
	try{
		if (id != null && profileId != null){
			let user1 = await sql.findId(id);
			let user2 = await sql.findId(profileId);
			if (user1 != null && user1.Id != null){
				if (user1.Liked == null)
					user1.Liked = [];
				else
					user1.Liked = JSON.parse(user1.Liked);

				if (user2.LikedBy == null)
					user2.LikedBy = [];
				else 
					user2.LikedBy = JSON.parse(user2.LikedBy);

				if (user1.Liked.includes(profileId)){
					if (user2.LikedBy.includes(id)){
						//unlike user;
						let rm1 = user1.Liked.indexOf(profileId);
						let rm2 = user2.LikedBy.indexOf(id);
						console.log(user1.Liked);
						console.log(user2.LikedBy);
						//something is not working here;	
						if (rm1 > -1)
							user1.Liked = user1.Liked.splice(rm1, 1)
						if (rm2 > -1)
							user2.LikedBy = user2.LikedBy.splice(rm2, 1);
						console.log(user1.Liked);
						console.log(user2.LikedBy);
							
					}
				} else {
					user1.Liked.push(profileId);
					user2.LikedBy.push(id);
				}
				let request = `Liked=JSON_ARRAY(?)`;
				let data1 = await sql.updateUser(id, request, [user1.Liked])
				request = `LikedBy=JSON_ARRAY(?)`;
				let data2 = await sql.updateUser(profileId, request, [user2.LikedBy]);
				if (data1 == 1 && data2 == 1)
					return(1);
				return (0);
			}
	
		}

	} catch (err){
		console.log(err);
	}
}

async function grabUsers(user){
	if (user != null){
		//Age min-max
		//Distance min-max
		//Interests min-max
		//Fame Rating min-max
	}
}
module.exports = {
	likeUser,
	deleteUser,
	changeUserPassword,
	resetUserPassword,
	updateUserProfile,
	loginUser,
	registerUser
}