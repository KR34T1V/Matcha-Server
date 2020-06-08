const express = require("express");
const router = express.Router();
const profile = require(`../schema/profileSchema`);
const sql = require('../schema/SQLSchema');
const filter = require('../schema/filterSchema');

router.get('/home', async (req, res) => {
	try {
		let errors = [];
		let payload;
		//filter goes here
		if (req.query.AccessToken != null){	
			let user = await profile.verifyAccessToken(req.query.AccessToken);
			if (user != null && user.Id != null){
				let data = await sql.getAllActiveUsers();
				if (data != null){
					payload = await filter.preference(user, data);
					//hide users with no avatar
					payload = payload.filter(e=> e.Avatar != null);
					//hide users that are blocked
					if (user.Blocked != null && user.Blocked.length > 0)
						payload = payload.filter(e=> !user.BlockedUsers.includes(e))
				} else errors.push("Failed to get users");
			} else errors.push("Invalid access token");
		} else errors.push("Access token missing");
		//build response
		if (payload != null && errors.length > 0){
			const finalPayload = await Promise.all(
				payload.map(async val=>{
					let user = {};
					user.Id = val.Id;
					user.Username = val.Username;
					user.Firstname = val.Firstname;
					user.Lastname = val.Lastname;
					user.Avatar = val.Avatar;
					user.FameRating = await profile.calculateUserFame(val);
					user.Age = await profile.calculateUserAge(val);
					user.Biography = val.Biography;
					return user;
				})
			)
			res.send(finalPayload);
		} 
		res.send(errors);
	} catch (err){
		console.log(err);
	}
});

router.post('/register', async (req, res) => {
	//security checks
	let data = await  profile.registerUser(req.body);
	if (data == null){
			data = await sql.findEmail(req.body.Email)
		if (data != null && data.Id != null){
			console.log(`${data.Id} registered`);
			res.send(data);
		}
	} else 
		res.send(data);
});

router.get('/verifyEmail', async (req, res)=> {
	if (req.query.Id != null && req.query.VerifyKey != null){
		let result = await profile.verifyUserEmail(req.query.Id, req.query.VerifyKey);
		if (result == 1){
			res.send("Success");
		}
		//return errors;
		res.send(result);
	} else res.send(["Oops, we had a little accident"]);
})

router.post('/login', async (req, res) => {
	console.log(req.body);
	let data = await profile.loginUser(req.body)
	if (data != null && data.Id != null){
		res.send(data.AccessToken);
	} else {
		res.send(data);
	}
});

router.post('/updateUserProfile', async (req, res) => {
	try {
	}catch(err){
		console.log (err);
	}
});

router.post('/viewUser'), async (req, res) => {
	console.log(req.body);
	console.log(await profile.viewUser(1, 2));
}

router.get('/getProfileViews', async (req, res)=>{
	console.log(req.body);
	console.log(await profile.findIds([]));
})

router.get('/resetPassword', async (req, res) => {
	console.log(req.query);
	if (req.query != null && req.query.Email != null){
		let result = await profile.resetUserPassword(req.query.Email);
		//success
		if (result == null)
			res.send("Success");
		else
			res.send(result);
	}
});

router.get('/changePassword', async (req, res) => {
	let input = req.query;
	let result = await profile.changeUserPassword(input.Id,
		input.Password, input.RePassword, input.VerifyKey);
	if (result ==null)
		res.send("Success");
	else
		res.send(result);
});

router.get('/deleteUser', async (req, res) => {
	let userData = req.body;
	let data;

	if (userData != null)
		data = await profile.deleteUser(userData);
		if (data == null)
			res.send({'user': null});
		else 
			res.send({'errors': data})
});

router.get('/likeUser', async (req, res) => {
	let userData = req.body;
	let data;

	if (userData != null)
		data = await profile.likeUser(userData);
		if (data != null && data.Id != null)
			res.send({'user': data});
		else 
			res.send({'errors': data})
});

module.exports = router;