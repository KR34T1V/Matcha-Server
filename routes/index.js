const express = require("express");
const router = express.Router();
const profile = require(`../schema/profileSchema`);
const sql = require('../schema/SQLSchema');
const filter = require('../schema/filterSchema');

router.get('/home', async (req, res) => {
	let payload;
	//filter goes here
	//filter blocked;
	if (req.query.AccessToken != null){
		let user = await profile.verifyAccessToken(req.query.AccessToken);
		if (user != null && user.Id != null){
			let data = await sql.getAllActiveUsers();
			if (data != null)
				payload = await filter.preference(user, data);
			console.log(payload);
		}
	}
	const finalPayload = payload.map(val=>{
		let user = {};
		user.Id = val.Id;
		user.Username = val.Username;
		user.Firstname = val.Firstname;
		user.Lastname = val.Lastname;
		user.FameRating = profile.calculateUserFame(val);
		//age
		user.Biography = val.Biography;
		return user;
	})
	// console.log(req);
	//Id
	//Username
	//Firstname
	//Lastname
	//Fame
	//Age
	//Bio
	res.send(finalPayload);
});

router.post('/register', async (req, res) => {
	//security checks
	let data = await  profile.registerUser(req.body);
	if (data == null){
			data = await sql.findEmail(req.body.Email)
			console.log(data);
		if (data != null && data.Id != null){
			res.send(data);
		}
	} else 
		res.send(data);
});

router.post('/login', async (req, res) => {
	console.log(req.body);
	let data = await profile.loginUser(req.body)
	if (data != null && data.Id != null){
		console.log(data);
		res.send(data);
	}
	res.send(data);
});

router.get(``)

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

router.get('/resetUserPassword', async (req, res) => {
});

router.get('/changeUserPassword', async (req, res) => {
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