"use strict"
const sql = require('./SQLSchema');
const verify = require('./verificationSchema');
const bcrypt = require('bcryptjs');
const mail = require('./emailSchema');
const gen = require('./generatorSchema');
const moment = require('moment');
const config = require('../config');

start();

async function start(){
	// await gen.generateUsers(25);
	// likeAlot(50, 27);
	// viewAlot(50, 27);
	// console.log(await findIds([1,2,3,4,5,6]));
	// console.log(await viewUser(1, 6));

}

//generates 'n' amount of likes between ids, 0 and maxUsers
async function likeAlot(n, maxUsers){
	let i = 0;
	while (i++ <= n){
		let user = gen.getRandomInt(1, maxUsers);
		let profileId = gen.getRandomInt(1, maxUsers);
		if (user != profileId)
			await likeUser(user, profileId);
	}
}

async function viewAlot(n, maxUsers){
	let i = 0;
	while (i++ <= n){
		let user = `${gen.getRandomInt(1, maxUsers)}`;
		let profileId = `${gen.getRandomInt(1, maxUsers)}`;
		if (user != profileId)
			await viewProfile(user, profileId);
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
			return([config.MSG_FORM_INVALID]);
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
		else if (await sql.findEmail(user.Email) != null){
			errors.push('Email address already in use');
		}
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
			form.NewEmail = user.Email;
			form.Password = await bcrypt.hash(user.Password, 6);
			form.VerifyKey = gen.getRandomInt(10000, 99999);

			await sql.newUser(form);
			result = await sql.findEmail(form.NewEmail);
			if (result != null && result.Id != null){
				mail.verifyEmail(result.NewEmail, result.Username, result.VerifyKey);
				return (null);
			} else errors.push('Email is already in use');
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

	var location = {"Latitude" : Number(user.Lat),
					"Longitude" : Number(user.Long)};

	try {
		if (user == null || user.Email == null || user.Password == null)
			return([config.MSG_FORM_INVALID]);
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
						console.log(data.Id);
						console.log(sql.updateUser(data.Id, "Location=?", [ JSON.stringify(location) ]));
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

//returns 1 on success 0 on failure
async function logoutUser(token){
	return(await destroyAccessToken(token));
}

//returns null on success, array of errors on failure
async function verifyUserEmail(email, key){
	let res;
	let errors = [];
	if (email == null || key == null)
		return([config.MSG_FORM_INVALID]);
	let data = await sql.findEmail(email);
	if (data.DateVerified != null)
		return (null);
	if (data != null && data.VerifyKey != null){
		//verify
		if (key == data.VerifyKey && data.NewEmail != null){
			data.VerifyKey = null;
			data.DateVerified = new Date();
			data.Email = data.NewEmail;
			data.NewEmail = null;
			let request = `Email=?, NewEmail=?, VerifyKey=?, DateVerified=?`
			res = await sql.updateUser(data.Id, request,
			[data.Email, data.NewEmail, data.VerifyKey, data.DateVerified] );
			if (res == 1){
				console.log(`${email} verified email`);
				return(null);
			} else errors.push("Failed to verify");
		} else errors.push("Key mismatch");
	} else errors.push("An error occured, please retry the verification proccess");
	return (errors);
}

async function resendVerifyEmail(email){
	if (email != null && email.length < 1)
		return([config.MSG_FORM_INVALID]);
	let user = await sql.findEmail(email);
	if (user != null && user.Id != null){
		if (user.DateVerified == null){
			await mail.verifyEmail(email, user.Username, user.VerifyKey)
			return ('Success');
		} else {
			return (["Account already verified"]);
		} 
	} else return(["Account not found"]);
}

//returns null on success, array of errors on failure
async function resetPasswordEmail(email){
	try {
		let errors = [];
		if (email == null)
			return([config.MSG_FORM_INVALID]);
		let user = await sql.findEmail(email);
		if (user != null && user.Id != null){
			let key = gen.getRandomInt(10000, 99999);
			let request = `VerifyKey=?`;
			let data = await sql.updateUser(user.Id, request, [ key ]);
			if (!data)
				errors.push('Failed to reset password');
			else {
				user.VerifyKey = key;
				mail.resetEmail(email, user.Username, key);
			}
			if (errors.length == 0){
				return (null);
			}
			else
				return (errors);
		} else {
			errors.push('Account not found');
			return (errors);
		}
	} catch (err){
		console.log(err);
		//mail error
		errors = ['An Unexpected Error Occured Please Try Again Later...'];
		return (errors);
	}
}

//returns null on success, array of errors on failure
async function resetUserPassword(email, password, repassword, key){
	let errors = [];
	try {
		if ( email == null || password == null || repassword == null || key == null)
			return([config.MSG_FORM_INVALID]);						
		if (!verify.checkPassword(password))
			errors.push('Password must contain: \'uppercase\', \'lowercase\', \'numeric\', \'special\' & at least 8 characters');
		if (!verify.checkRePassword(password, repassword))
			errors.push('Passwords do not match');
		//check verification key
		let data  = await sql.findEmail(email);
		if (data != null){
			if (data.VerifyKey != key)
				errors.push("Key mismatch");
		} else{
			errors.push("Unknown User");
		}
		//set password
		if (errors.length == 0){
			let hash = await bcrypt.hash(password, 6);
			let request = `Password=?, VerifyKey=?`
			data = sql.updateUser(data.Id, request, [hash, null])
			if (data != null){
				password = hash;
				console.log(`${email} changed password`);
				return(null);
			} else {
				return(['An unexpected error occured please try again later...']);
			}
		} else {
			return (errors);
		}
	} catch (err){
		console.log(err);
		//mail error
		errors = ['An Unexpected Error Occured Please Try Again Later...'];
		return (errors);
	}
}

async function userPasswordChange(token, oldPwd, newPwd, rePwd){
	let errors = [];
	if (token == null || oldPwd == null || newPwd == null || rePwd == null)
		return ([config.MSG_FORM_INVALID]);
	if(!verify.checkPassword(newPwd)){
		errors.push('Password must contain: \'uppercase\', \'lowercase\', \'numeric\', \'special\' characters');		
	}
	if(!verify.checkRePassword(newPwd,rePwd)){
		errors.push('Passwords do not match');
	}
	let user = await verifyAccessToken(token);
	if (user != null && user.Id != null){
		if(await bcrypt.compare(oldPwd, user.Password)){
			if (errors.length == 0){
				let hash = await bcrypt.hash(newPwd, 6);
				let request = 'Password=?'
				if (await sql.updateUser(user.Id, request, [hash])){
					return (null);
				} else errors.push('Failed to update Password');
			}
		} else errors.push('Password Incorrect')
	} else errors = user;

	if (errors != null && errors.length > 0){
		return(errors)
	}
}

//returns null on success, array of errors on failure
async function userUpdateProfile(user){
	let errors = [];
	let build = [];
	let form = [];
	let request;
	try{
		if (user == null || user.AccessToken == null)
			return([config.MSG_FORM_INVALID]);
			let data = await verifyAccessToken(user.AccessToken);
			if (data == null || data.Id == null)
				return (['Invalid Access Token']);
			if (user.Username != null && user.Username != data.Username){
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
					build.push('SexualPreference=?');
					form.push(user.SexualPreference);
				}
			}
			if (user.Biography != data.Biography){
				let bio =  await sql.stripHTML(user.Biography);
				build.push('Biography=?');
				form.push(bio);
			}
			if (user.Interests != null){
				user.Interests.forEach((e)=>{
					if (!config.INTEREST_FILTER.includes(e))
						errors.push("Invalid Interest Tag ");
				})
			} else user.Interests = [];

			//EMAIL
			if (user.NewEmail != null && user.NewEmail != data.Email){
				if (!verify.checkEmail(user.NewEmail))
					errors.push('Invalid Email address');
				else {
					//Create new key
					user.VerifyKey = gen.getRandomInt(10000, 99999);
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
			// console.log(user.Password);
			// if (! await bcrypt.compare(user.Password, data.Password)){
			// 	if (!verify.checkPassword(user.Password)){
			// 		errors.push('Password must contain: \'uppercase\', \'lowercase\', \'numeric\', \'special\' characters');
			// 		if (!verify.checkRePassword(user.Password, user.RePassword))
			// 			errors.push('Passwords do not match');
			// 		else {
			// 			user.Password = await bcrypt.hash(user.Password, 6);
			// 			build.push('Password=?');
			// 			form.push(user.Password);
			// 		}
			// 	}
			// }
			if (errors.length == 0){
				build.push("Interests=?");
				form.push(JSON.stringify(user.Interests));
				request = await sql.buildQuery(build, ', ');
				if (await sql.updateUser(data.Id, request, form))
					return (null);
				errors.push('An Unexpected Error Occured Please Try Again Later...');
			}
			return(errors);
	} catch(err){
		console.log(err);
		return (['An Unexpected Error Occured Please Try Again Later...'])
	}
}

// returns image file path
async function userUpdateAvatar(id, path){
	let qry = `Avatar=?`
	path = `http://${config.SERVER_ADDRESS}/uploads/${path}`;
	await sql.updateUser(id, qry, [path]);
	return (path);
}

async function userUpdateGallery(id, path, oldGallery, key){
	try{
		let qry = `Images=?`
		let imgPath = `http://${config.SERVER_ADDRESS}/uploads/${path}`;
		let newGallery = oldGallery;
		newGallery[key] = imgPath;
		await sql.updateUser(id, qry, [JSON.stringify(newGallery)]);
		return (newGallery);
	} catch (err){
		console.log(err);
	}
}
//Returns null on success, array of errors on failure
async function deleteUser(accessToken, pwd){
	try {
		console.log("here");
		let errors = [];
		if (accessToken == null || pwd == null )
			return([config.MSG_FORM_INVALID]);
		let user = await verifyAccessToken(accessToken);
		if (user != null && user.Id != null){
			if (await bcrypt.compare(pwd, user.Password)){
				let request = `DateDeleted=?`
				let res = await sql.updateUser(user.Id, request, [new Date().toLocaleDateString()]);
				if (res){
					destroyAccessToken(accessToken);
					return ('Success');
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
	let msg;
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
				if (user1.Liked.includes(profileId) && user2.LikedBy.includes(id)){
					console.log(`${id} disliked ${profileId}`);
					user1.Liked = user1.Liked.filter(e => e != profileId);
					user2.LikedBy = user2.LikedBy.filter(e => e != id);
					rtn = -1;
					msg = `${user1.Username} broke your conexion :(`;
					sql.newUserNorification(user1.Id, user2.Id, msg);
				} else {
					if (user1.LikedBy != null && user2.LikedBy != null &&
					user1.LikedBy.includes(user2.Id) && user2.LikedBy.includes(user1.Id)){
						let msg1 = `You have been matched with ${user2.Username}`;
						let msg2 = `You have been matched with ${user1.Username}`;
						sql.newUserNorification(user1.Id, user2.Id, msg1);
						sql.newUserNorification(user2.Id, user1.Id, msg2);
					}
					console.log(`${id} liked ${profileId}`);
					user1.Liked.push(profileId);
					user2.LikedBy.push(id);
				}
				let request = `Liked=?`;
				let data1 = await sql.updateUser(id, request, [JSON.stringify(user1.Liked)])
				request = `LikedBy=?`;
				let data2 = await sql.updateUser(profileId, request, [JSON.stringify(user2.LikedBy)]);
				if (data1 == 1 && data2 == 1){
					if (rtn != -1){
						msg = `${user1.Username} just liked you`
						sql.newUserNorification(user1.Id, user2.Id, msg)
					}
					return(rtn);
				}
				return (0);
			}
		}
	} catch (err){
		console.log(err);
	}
}

//returns user matching profileId, or null
async function viewProfile(id, profileId){
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
				if (res == 1){
					let msg = `${data.Username} just viewed your profile.`
					sql.newUserNorification(id, profileId, msg);
					console.log(`${id} viewed ${profileId}`);
					return (data);
				}
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
	  if (users.length > 0) return users;
	}
	return null;
  }

//Returns 1 on Liked -1 on Disliked,and 0 on error;
async function blockUser(id, profileId){
	try{
		let output;
		let ret;
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
					ret = -1;
				} else {
					output = `${id} blocked ${profileId}`;
					user1.BlockedUsers.push(profileId);
					ret = 1;
				}
				user1.BlockedUsers = JSON.stringify(user1.BlockedUsers);
				let request = `BlockedUsers=?`;
				let res = await sql.updateUser(id, request, [user1.BlockedUsers]);
				if (res == 1){
					console.log(output);
					return(ret);
				}
			}
		}
		return (0);
	} catch (err){
	console.log(err);
	}
}

async function newAccessToken(id, token){
	try{
		if (id != null && token != null){
			let data = await sql.findId(id);
			if (data != null){
				let date = new Date();
				let request = `AccessToken=?, AccessTime=?`;
				let res = sql.updateUser(id, request, [token, date]);
				if (res != null)
					return(1);
			}
			return (null);
		}
	} catch (err){
		console.log(err);
	}
}

//returns userdata or an array of errors.
async function verifyAccessToken(token){
	try {
		if (token == null)
			return(['Fields are not valid']);
		let res = await sql.findAccessToken(token);
		if (res != null && res.AccessToken != null){
			if (res.AccessToken === token){
				//check this date test
				if (await calculateDateDifference(new Date(), res.AccessTime) < config.ACCESS_EXPIRY){
					await renewAccessToken(res.Id)
					return (res);
				}
				return (['AccessToken Expired']);
			} 
		}
		return (null);
	} catch (err){
		console.log(err);
	}
}

async function renewAccessToken(id){
	try{
		if (id == null)
			return(['Fields are not valid']);
		let date = new Date();
		let req = `AccessTime=?`;
		let res = await sql.updateUser(id, req, [date]);
		if (res == 1)
			return (1);
		return (0);
	} catch (err){
		console.log(err);
	}
}

async function destroyAccessToken(token){
	try{
		if (token == null)
			return(['Fields are not valid']);
		let res = await sql.findAccessToken(token);
		if (res != null && res.AccessToken != null){
			let request = `AccessToken=?`
			res = await sql.updateUser(res.Id, request, [null])
			if (res == 1)
				return (1);
		}
		return (0);
	}catch (err){
		console.log(err);
	}
}

async function calculateUserFame(user){
	let fame = 0;
	if (user != null)
		if (user.ViewedBy != null && user.LikedBy != null)
			fame = (JSON.parse(user.LikedBy).length/JSON.parse(user.ViewedBy).length)*100;
	return (Math.round(fame));
}

async function calculateUserAge(user){
	let today = moment().format("YYYY");
	let age = 0;
	if (user != null){
		age = parseInt(today) - parseInt(moment(user.Birthdate).format("YYYY"));
	}
	return(age);
}

async function calculateDateDifference(future, past){
	var ms = moment(future,"DD/MM/YYYY HH:mm:ss").diff(moment(past,"DD/MM/YYYY HH:mm:ss"));
	var d = moment.duration(ms).asSeconds();
	return (d);
}

async function calculateDistance(to, from){
	if (from !== null && to !== null && to.Latitude !== null &&
		 to.Longitude !== null && from.Latitude !== null &&
		  from.Longitude !== null) {
		const lat1 = parseFloat(to.Latitude);
		const lat2 = parseFloat(from.Latitude);
		const lon1 = parseFloat(to.Longitude);
		const lon2 = parseFloat(from.Longitude);

		const R = 6371e3; // metres
		const q = lat1 * Math.PI/180; // φ, λ in radians
		const p = lat2 * Math.PI/180;
		const s = (lat2-lat1) * Math.PI/180;
		const t = (lon2-lon1) * Math.PI/180;

		const a = Math.sin(s/2) * Math.sin(s/2) +
				Math.cos(q) * Math.cos(p) *
				Math.sin(t/2) * Math.sin(t/2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

		const d = R * c; // in metres
		return(d);
	} else {
		return("many ")
	}
}

async function getUserConnexions(accessToken){
	let payload = [];
	let user = await verifyAccessToken(accessToken);
	if (user != null && user.Id != null && user.LikedBy != null){
		user.BlockedUsers = user.BlockedUsers === null ? [] : JSON.parse(user.BlockedUsers);
		for (const e of JSON.parse(user.LikedBy)){
			if (JSON.parse(user.Liked).includes(e) && !user.BlockedUsers.includes(e)){
				let res = await sql.getConnexion(e)
				if (res != null && res.length > 0){
					payload.push(res[0]);
				}
			}
		}
		return(payload)
	} return([]);
}

module.exports = {
	likeUser,
	deleteUser,
	resetUserPassword,
	resetPasswordEmail,
	userUpdateProfile,
	viewProfile,
	loginUser,
	logoutUser,
	registerUser,
	verifyUserEmail,
	resendVerifyEmail,
	findIds,
	blockUser,
	newAccessToken,
	verifyAccessToken,
	calculateUserFame,
	calculateUserAge,
	calculateDateDifference,
	calculateDistance,
	userPasswordChange,
	userUpdateAvatar,
	userUpdateGallery,
	getUserConnexions
}