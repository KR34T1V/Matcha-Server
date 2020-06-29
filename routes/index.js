"use strict"
const express = require("express");
const router = express.Router();
const profile = require(`../schema/profileSchema`);
const sql = require('../schema/SQLSchema');
const filter = require('../schema/filterSchema');
const g = require('../schema/generalSchema');
const config = require('../config');
const formidable = require('formidable');


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

router.post('/user/verifyEmail', async (req, res)=> {
	if (req.body != null && req.body.Email != null && req.body.VerifyKey != null){
		let result = await profile.verifyUserEmail(req.body.Email, req.body.VerifyKey);
		if (result == null){
			res.send(JSON.stringify({data:{
				result : "Success"}}));
		} else {
			res.send(JSON.stringify(result));
		}
	} else res.send(JSON.stringify({data:{
		errors: [config.MSG_FORM_INVALID]
	}}));
})

router.post('/user/verifyEmail/email', async (req, res) => {
	if (req.body != null && req.body.Email != null){
		await profile.resendVerifyEmail(req.body.Email);
		res.send(JSON.stringify({data:{
			result: "Success" }}));
	} else {
		res.send(JSON.stringify({data:{
			errors: ["Well, I think we messed up if you see this, please continue like this never happened"]
		}}))
	}
})

router.post('/login', async (req, res) => {
	let data = await profile.loginUser(req.body)
	if (data != null && data.Id != null){
		res.send(JSON.stringify({
			data:{
				AccessToken: data.AccessToken,
				Verified: data.DateVerified != null ? true : false
			}
		}));
	} else {
		res.send(JSON.stringify({ data: {
			errors: data
		}}));
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
		let input = req.body;
		let result = await profile.userUpdateProfile(input);
		if (result === null){
			res.send(JSON.stringify({data:{
				result: 'Success',
				msg: 'Profile Saved'
			}}));
		} else {
			res.send(JSON.stringify({data:{
				errors: result
			}}))
		}
	}catch(err){
		console.log (err);
	}
});

router.post('/user/updateProfile/avatar',async (req, res) => {
	console.log(req.files);
	console.log(req.file);
	const form = new formidable.IncomingForm();
	form.parse(req, (err, fields, files)=>{
		console.log(files);
	})
})

router.post('/user/passwordChange', async (req, res) => {
	try{
		let input = req.body;
		if (input != null){
			let result = await profile.userPasswordChange(input.AccessToken, input.Password,
				input.NewPassword, input.RePassword);
			if (result == null){
				res.send(JSON.stringify({data:{
					result: 'Success'
				}}));
			} else {
				res.send(JSON.stringify({data: {
					errors: result
				}}));
			}
		}

	}catch(err){
		console.log(err);
	}
})

router.get('/view/profile', async (req, res) => {
	let AccessToken = req.query.AccessToken;
	let ProfileId = req.query.ProfileId;
	let user = await profile.verifyAccessToken(AccessToken);
	if (user != null && user.Id != null){
		let result = await profile.viewProfile(user.Id, ProfileId);
		if (result != null && result.Id != null){
			res.send(JSON.stringify({data:
			{
				Username: result.Username,
				Firstname: result.Firstname,
				Lastname: result.Lastname,
				Gender: result.Gender,
				SexualPreference: result.SexualPreference,
				Age: profile.calculateUserAge(result),
				Biography: result.Biography,
				Interests: result.Interests,
				Location: JSON.parse(result.Location),
				Fame: profile.calculateUserFame(result),
				Avatar: result.Avatar,
				Images: JSON.parse(result.Images),
				LastOnline: result.AccessTime
			}}));
		}
	}
})

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

router.post('/user/passwordReset', async (req, res) => {
	let bod = req.body
	if (bod != null){
		let result = await profile.resetUserPassword(bod.Email, 
			bod.Password, bod.RePassword, bod.VerifyKey);
		//success
		if (result == null)
			res.send("Success");
		else
			res.send(result);
	}
});

router.post('/user/passwordReset/email', async (req, res) => {
	try {
		if (req.body != null && req.body.Email != null){
			const email = req.body.Email;
			let data = await profile.resetPasswordEmail(email);
			if (data == null){
				res.send(JSON.stringify({ data: {
					result: "Success",
				}}));
			} else {
				res.send(JSON.stringify({ data: {
					errors: data 
				}}))
			}
		} else {
			res.send(JSON.stringify({ data: {
				errors: ["Oops something went wrong!"],
			}}));
		}
	} catch (err){
		console.log(err);
	}
})

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