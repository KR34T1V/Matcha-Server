"use strict"
const express = require("express");
const router = express.Router();
const profile = require(`../schema/profileSchema`);
const sql = require('../schema/SQLSchema');
const filter = require('../schema/filterSchema');
const g = require('../schema/generalSchema');

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
		//sort goes here
		if (payload != null && errors.length == 0){
		}
		//age
		//location
		//fame
		//iterest ltags
		//build response
		if (payload != null && errors.length == 0){
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
			res.send(JSON.stringify({ data: finalPayload}));
		} else 
			res.send(JSON.stringify({ errors: errors }));
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
			res.send(JSON.stringify({data: {
				Result: "Success"
			}}));
		}
	} else 
		res.send(JSON.stringify({errors: data}));
});

router.get('/verify/email', async (req, res)=> {
	if (req.query.Id != null && req.query.VerifyKey != null){
		let result = await profile.verifyUserEmail(req.query.Id, req.query.VerifyKey);
		if (result == null){
			res.send("Success");
		}
		res.send(result);
	} else res.send(["Oops, we had a little accident"]);
})

router.post('/login', async (req, res) => {
	let data = await profile.loginUser(req.body)
	if (data != null && data.Id != null){
		
		res.send(JSON.stringify({
			data:{
				AccessToken: data.AccessToken
			}
		}));
	} else {
		res.send(JSON.stringify({
			errors: data
		}));
	}
});

router.get('/logout', async (req, res) => {
	try {
		let data = req.query;
		if (await profile.logoutUser(data.AccessToken)){
			res.send(JSON.stringify({
				data:{
					Result: "Success"
				}
			}));
		}
	} catch (err){
		console.log(err);
	}
})

router.get('/user/profile', async (req, res) => {
	try{
		if (req.query != null && req.query.AccessToken != null){
			let user = await profile.verifyAccessToken(req.query.AccessToken);
			if (user != null && user.Id != null){
				res.send(JSON.stringify({
					data: {
						Username: user.Username,
						Firstname: user.Firstname,
						Lastname: user.Lastname,
						Email: user.Email,
						Gender: user.Gender,
						SexualPreference: user.SexualPreference,
						Avatar: user.Avatar,
						Images: JSON.parse(user.Images),
						Interests: user.Interests
					}
				}))
				console.log(JSON.parse(user.Images));
			} else 
			res.send(JSON.stringify({
				errors: ["Access Token Expired"]
			}))
		}
	} catch(err){
		console.log(err);
	}
})

router.post('/user/updateProfile', async (req, res) => {
	try {
	}catch(err){
		console.log (err);
	}
});

router.post('/view/Profile'), async (req, res) => {
	console.log(req.body);
	console.log(await profile.viewProfile(1, 2));
}

router.get('/getProfileViews', async (req, res)=>{
	let data = req.query;
	let tmp;
	let payload = [];
	if (data != null && data.AccessToken != null){
		let ret = await profile.verifyAccessToken(data.AccessToken);
		if (ret != null && ret.Id != null){
			let views = JSON.parse(ret.ViewedBy);
			if (views != null && views.length > 0){
				await g.asyncForEach(views, async (val)=>{
					let tmp_user = {};
					tmp = await sql.findId(val);
					if (tmp != null && tmp.Id != null){
						tmp_user.Id = tmp.Id;
						tmp_user.Username = tmp.Username;
						tmp_user.Fame = await profile.calculateUserFame(tmp);
						payload.push(tmp_user);
					}
				});
			}
			res.send({data:payload});
		} else res.send({errors: ["Invalid Access Token"]});
	} else res.send({errors: ["Invalid Form"]});
})

router.get('/getProfileLikes', async (req, res)=>{
	let data = req.query;
	let tmp;
	let payload = [];
	if (data != null && data.AccessToken != null){
		let ret = await profile.verifyAccessToken(data.AccessToken);
		if (ret != null && ret.Id != null){
			let likes = JSON.parse(ret.LikedBy);
			if (likes != null && likes.length > 0){
				await g.asyncForEach(likes, async (val)=>{
					let tmp_user = {};
					tmp = await sql.findId(val);
					if (tmp != null && tmp.Id != null){
						tmp_user.Id = tmp.Id;
						tmp_user.Username = tmp.Username;
						tmp_user.Fame = await profile.calculateUserFame(tmp);
						payload.push(tmp_user);
					}
				})
			}
			res.send(JSON.stringify({data:payload}));
		} else res.send(JSON.stringify({errors: ["Invalid Access Token"]}));
	} else res.send(JSON.stringify({errors: ["Invalid Form"]}));
})

router.get('/user/resetPassword', async (req, res) => {
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

router.get('/user/changePassword', async (req, res) => {
	let input = req.query;
	let result = await profile.changeUserPassword(input.Id,
		input.Password, input.RePassword, input.VerifyKey);
	if (result ==null)
		res.send("Success");
	else
		res.send(result);
});

router.get('/user/delete', async (req, res) => {
	let userData = req.body;
	let data;

	if (userData != null)
		data = await profile.deleteUser(userData);
		if (data == null)
			res.send({'user': null});
		else 
			res.send({'errors': data})
});

router.get('/user/like', async (req, res) => {
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