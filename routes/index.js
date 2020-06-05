const express = require("express");
const router = express.Router();
const profile = require(`../schema/profileSchema`);
const sql = require('../schema/SQLSchema');

router.post('/home'), async (req, res) => {
	let data = await sql.getAllActiveUsers();
	console.log(data);
	if (data != null)
		res.send(data);
}

router.post('/register', async (req, res) => {
	console.log(req.body);
	let data = profile.registerUser(req.body);
	if (data != null && data.Id != null){
		res.send(data);
	}
	res.send(data)
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

router.post('/updateUserProfile', async (req, res) => {
	try {
	}catch(err){
		console.log (err);
	}
});

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