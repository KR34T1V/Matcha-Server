const sql = require('./SQLSchema');
const verify = require('./verificationSchema');
const bcrypt = require('bcryptjs');
const mail = require('./emailSchema');
const gen = require('./generatorSchema');
const moment = require ('moment');

start();

async function start(){
	let user = await sql.findId(1);
	if (user != null)
		calculateUserAge(user);
	// await gen.generateUsers(10);
	// console.log(await findIds([1,2,3,4,5,6]));
	// console.log(await viewUser(1, 6));

}
// likealot(50, 10);
// sql.findId(494)
// .then((user)=>{
// 	if (user != null)
// 		console.log(user);
// })
//generates 'n' amount of likes between ids, 0 and maxUsers
async function likealot(n, maxUsers){
	let i = 0;
	while (i++ <= n){
		await likeUser(gen.getRandomInt(0, maxUsers), gen.getRandomInt(0, maxUsers));
	}
}

//returns null on success, array of errors on failure
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
				mail.verifyEmail(form.Email, form.Id, form.Username, form.VerifyKey);
				return (null);
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
		if (data == null && user.NewEmail != null)
			data = await sql.findEmail(user.NewEmail);
		if (data != null){
			if (data.Password){
				let result = await bcrypt.compare(user.Password, data.Password);
				if (result == true){
					let salt = await bcrypt.genSalt(1);
					result = await newAccessToken(data.Id, salt);
					if (result == 1){
						data.AccessToken = salt;
						return (data);
					}
					else
						errors.push("Failed to generate access token");
				} else{
					errors.push("Password Incorrect");
				}
				return (errors);
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
				if (!verify.checkEmail(user.NewEmail))
					errors.push('Invalid Email address');
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

async function verifyUserEmail(id, key){
	if (id != null && key != null){
		let data = await sql.findId(id);
		if (data != null && data.VerifyKey != null && data.DateVerified == null){
			//verify
			if (key == data.VerifyKey){
				if (data.NewEmail != null){
					data.Email = data.NewEmail;
					data.VerifyKey = null;
					data.DateVerified = new Date();
				} else {
					data.VerifyKey = null;
					data.DateVerified = new Date();
					//set new email if required
					if (data.NewEmail != null){
						data.Email = data.NewEmail;
						let request = `Email=?, VerifyKey=?, DateVerified=?`
						let res = await sql.updateUser(id, request,
						[data.Email, data.VerifyKey, data.DateVerified] );
					} else {
						//verify account;
						let request = `VerifyKey=?, DateVerified=?`
						let res = await sql.updateUser(id, request,
						[data.VerifyKey, data.DateVerified] );
					}
					if (res == 1){
						console.log(`${id} verified account`);
						return(1)
					}
				}
			}
		}
	}
	return (0);
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

//Returns 1 on Liked -1 on Disliked,and 0 on error;
async function likeUser(id, profileId){
	let rtn = 1;
	try{
		if (id != null && profileId != null){
			let user1 = await sql.findId(id);
			let user2 = await sql.findId(profileId);
			if (user1 != null && user1.Id != null && user2 != null && user2.Id != null
				&& user1.Id != user2.Id){
				//check that array exists
				if (user1.Liked == null)
					user1.Liked = [];
				else
					user1.Liked = JSON.parse(user1.Liked);

				if (user2.LikedBy == null)
					user2.LikedBy = [];
				else 
					user2.LikedBy = JSON.parse(user2.LikedBy);
				// unlike user if already liked
				if (user1.Liked.includes(profileId) || user2.LikedBy.includes(id)){
					console.log(`${id} disliked ${profileId}`);
					user1.Liked = user1.Liked.filter(e => e != profileId);
					user2.LikedBy = user2.LikedBy.filter(e => e != id);
					rtn = -1;
				} else {
					console.log(`${id} liked ${profileId}`);
					user1.Liked.push(profileId);
					user2.LikedBy.push(id);
				}
				let request = `Liked=?`;
				let data1 = await sql.updateUser(id, request, [JSON.stringify(user1.Liked)])
				request = `LikedBy=?`;
				let data2 = await sql.updateUser(profileId, request, [JSON.stringify(user2.LikedBy)]);
				if (data1 == 1 && data2 == 1){
					return(rtn);
				}
				return (0);
			}
		}
	} catch (err){
		console.log(err);
	}
}

async function viewUser(id, profileId){
	try {
		if (id != null && profileId != null){
			let data = await sql.findId(profileId);
			if (data != null && data.Id != null){
				//check for array
				if (data.ViewedBy == null)
					data.ViewedBy = [];
				else
					data.ViewedBy = JSON.parse(data.ViewedBy);

				if (!data.ViewedBy.includes(id)){
					data.ViewedBy.push(id);
				}

				data.ViewedBy = JSON.stringify(data.ViewedBy);
				let request = `ViewedBy=?`;
				let res = await sql.updateUser(profileId, request, [data.ViewedBy]);
				if (res == 1)
					return (data);
			}
		}
		return (null);
	} catch(err){
		console.log(err);
	}
}

//returns an array of matching users if found, else null is returned
async function findIds(idArray) {
	if (idArray != null) {
	  const users = await Promise.all(
		idArray.map(async (id) => {
		  let res = await sql.findId(id);
		  if (res != null) 
		  	return res;
		})
	  );
	  console.log(users);
	  if (users.length > 0) return users;
	}
	return null;
  }

async function blockUser(id, profileId){
	try{
		let output;
		if (id != null && profileId != null){
			let user1 = await sql.findId(id);
			let user2 = await sql.findId(profileId);

			if (user1 != null && user2 !=null){
				if (user1.BlockedUsers == null)
					user1.BlockedUsers = [];
				else 
					user1.BlockedUsers = JSON.parse(user1.BlockedUsers);
				//unblock user if already blocked
				if (user1.BlockedUsers.includes(profileId)){
					output = `${id} unblocked ${profileId}`;
					user1.BlockedUsers = user1.BlockedUsers.filter((e)=>e!=profileId)
				} else {
					output = `${id} blocked ${profileId}`;
					user1.BlockedUsers.push(profileId);
				}
				user1.BlockedUsers = JSON.stringify(user1.BlockedUsers);
				let request = `BlockedUsers=?`;
				let res = await sql.updateUser(id, request, [user1.BlockedUsers]);
				if (res == 1){
					console.log(output);
					return(1);
				}
			}
		}
		return (null);
	} catch (err){
	blockUser(1, 2);
	console.log(err);
	}
}

async function newAccessToken(id, token){
	try{
		if (id != null && token != null){
			let data = await sql.findId(id);
			if (data != null){
				let request = `AccessToken=?`;
				let res = sql.updateUser(id, request, [token]);
				if (res != null)
					return(1);
			}
			return (null);
		}
	} catch (err){
		console.log(err);
	}
}

async function verifyAccessToken(token){
	try {
		if (token == null)
			return(['Fields are not valid']);
		let res = await sql.findAccessToken(token);
		if (res != null && res.AccessToken != null)
			if (res.AccessToken === token)
				return (res);
		return (null);
	} catch (err){
		console.log(err);
	}
}

async function calculateUserFame(user){
	let fame = 0;
	if (user != null)
		if (user.ViewedBy != null && user.LikedBy != null)
			fame = (users.LikedBy.length/users.ViewedBy.length)*100;
	return (fame);
}

async function calculateUserAge(user){
	let today = moment().format("YYYY");
	let age;
	if (user != null){
		age = parseInt(today) - parseInt(moment(user.Birthdate).format("YYYY"));
		console.log (age);
	}
}

module.exports = {
	likeUser,
	deleteUser,
	changeUserPassword,
	resetUserPassword,
	updateUserProfile,
	viewUser,
	loginUser,
	registerUser,
	findIds,
	newAccessToken,
	verifyAccessToken,
	calculateUserFame
}