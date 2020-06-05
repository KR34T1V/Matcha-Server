const express = require("express");
const router = express.Router();
const profile = require(`../schema/profileSchema`)

router.post('/register', async (req, res) => {
	console.log(req.body);
	let data = profile.registerUser(req.body);
	if (data != null){
		console.log(data);
	}
	res.send("Hello Homie")
});

router.post('/login', async (req, res) => {
	console.log(req.body);
	let data = profile.loginUser(req.body)
	if (data != null){
		console.log(data);
	}
	res.send("Hello WOrk");
});

router.get('/updateUserProfile', async (req, res) => {
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