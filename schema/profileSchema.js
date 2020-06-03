const sql = require('./SQLSchema');
const verify = require('./verificationSchema');
const bcrypt = require('bcryptjs');
const mail = require('./emailSchema');

const user1 = {
	Id : 43,
	Username : "BOB",
	Firstname : "Bob",
	Lastname : "Nan",
	Birthdate : new Date(1997,08,29).toLocaleDateString(),
	Email : "Boban@dispostable.com",
	Gender : "Male",
	SexualPreference : "Bisexual",
	Password : "StaciesMom1!",
	RePassword : "StaciesMom1!"
}

const user2 = {
	Id : 44,
	Username : "bobby",
	Firstname : "user",
	Lastname : "user",
	Birthdate : new Date(1997,08,29).toLocaleDateString(),
	Email : "Bobnan@dispostable.com",
	Gender : "Male",
	SexualPreference : "Bisexual",
	Password : "StaciesMom1!",
	RePassword : "StaciesMom1!"
}
//test register
registerUser(user1)
// .then(res => console.log(res));
registerUser(user2)
// .then(res => console.log(res));
//test login
user2.Password = "ILikeApples123!";
loginUser(user2)
.then(val => {
	console.log(val);
	if (val != null && val.Id != null){
		console.log("login");
		resetUserPassword(val)
		.then(val=>{
		console.log(val);
			if (val != null && val.Id){
				console.log("password reset");
				changeUserPassword(val)
				.then(val=>{
					console.log(val);
					if (val != null && val.Id != null)
						console.log("password changed");
					
				})
			}
		})
	}
})
loginUser(user2)



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
			if (user.Username != null && verify.checkUserName(user.Username) &&
			 user.Usermame != data.Username){
				build.push('Username=?');
				form.push(user.Username);
			}
			if (user.Firstname != null && verify.checkNames(user.Firstname) &&
			user.Firstname != data.Firstname){
				build.push('Firstname=?');
				form.push(user.Firstname);
			}
			if (user.Lastname != null && verify.checkNames(user.Lastname) &&
			user.Lastname != data.Lastname){
				build.push('Lastname=?');
				form.push(user.Lastname);
			}
			if (user.Birthdate != null && verify.checkEmail(user.Birthdate) &&
			user.Birthdate != data.Birthdate){
				build.push('Birthdate=?');
				form.push(user.Birthdate);
			}
			if (user.Gender != null && verify.checkGender(user.Gender) &&
			user.Gender != data.Gender){
				build.push('Gender=?');
				form.push(user.Gender);
			}
			if (user.SexualPreference != null && verify.checkPreference(user.SexualPreference) &&
			user.SexualPreference != data.SexualPreference){
				build.push('SexualPreference=?')
				form.push(user.SexualPreference);
			}

			//EMAIL
			if (user.NewEmail != null && verify.checkEmail(user.NewEmail) &&
			user.NewEmail != data.Email){
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

			//PASSWORD
			console.log(user.Password);
			if (! await bcrypt.compare(user.Password, data.Password) &&
			verify.checkPassword(user.Password) &&
			verify.checkRePassword(user.Password, user.RePassword)){
				user.Password = await bcrypt.hash(user.Password, 6);
				build.push('Password=?');
				form.push(user.Password);
			}

			request = await sql.buildQuery(build);
			if (await sql.updateUser(user, request, form))
				return user;
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
			data = sql.updateUser(user, request, [hash, null])
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
					let res = await sql.updateUser(user, request, new Date().toLocaleDateString());
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

async function likeUser(user, profileId){
	if (user == null || user.Id == null || profileId == null)
		return (['Fields are not valid']);
	let data1 = await sql.findId(user.Id);
	let data2 = await sql.findId(profileId);

	if (data1 != null && data1.LikedBy != null &&
	data2 != null && data2.Liked != null){
		//Unlike if already liked
		if (data1.Liked.find(profileId))
			console.log(data1.Liked.find(profileId));
		if (data2.LikedBy.find(user.Id))
			console.log(data2.LikedBy.find(user.Id));
		//Like
		let request = `Liked=?`
		data1.Liked = data1.Liked.some((value) => {return(value != data2.Id)});
		console.log(data1.Liked);
		data1 = await sql.updateUser(data1, request, [data1.Liked]);
	}
}
