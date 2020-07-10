"use strict"
const express = require("express");
const router = express.Router();
const profile = require(`../schema/profileSchema`);
const sql = require('../schema/SQLSchema');
const filter = require('../schema/filterSchema');
const g = require('../schema/generalSchema');
const config = require('../config');
const msg = require('../schema/messageSchema');
const notify = require('../schema/notificationSchema');
const multer = require("multer");
const { verifyAccessToken } = require("../schema/profileSchema");
const storage = multer.diskStorage({
	destination: function (req, file, cb){
		cb(null, `${__dirname}/../public/uploads/`);
	},
	filename: function (req, file, cb){
		const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9)
		cb(null, uniquePrefix + '-' + file.originalname);
	}
})
const imageFilter = (req, file, cb) => {
	if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg'){
		cb(null, true);
	} else cb (new Error('File is not of type image'), false);
}
const upload = multer({
	fileFilter: imageFilter,
	storage: storage
});


router.get('/home', async (req, res) => {
	try {
		let errors = [];
		let payload;
		//filter goes here
		if (req.query.AccessToken != null){	
			let user = await profile.verifyAccessToken(req.query.AccessToken);
			if (user != null && user.Id != null){
				if (user.Avatar != null){
					let data = await sql.getAllActiveUsers();
					if (data != null){
						//match sexual preference
						payload = await filter.preference(user, data);
						//hide users with no avatar
						payload = payload.filter(e=> e.Avatar != null);
						//hide users that are blocked
						user.BlockedUsers = user.BlockedUsers == null ? [] : JSON.parse(user.BlockedUsers);
						if (user.BlockedUsers != null && user.BlockedUsers.length > 0)
							payload = payload.filter((e) => {
								return user.BlockedUsers.includes(e.Id) ? null : e
							})
					} else errors.push("Failed to get users");
				} else errors.push("Please complete your profile before searching other users");
			} else errors = user;
		} else errors.push("Access token missing");
		//sort goes here
		if (payload != null && errors.length == 0){
		}
		//age
		//location
		//fame
		//iterest tags
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
			res.send(JSON.stringify({ data:
				{ 
					res: "Success",
					People: finalPayload
				}
			}));
		} else 
			res.send(JSON.stringify({ data:{
				res: "Error",
				errors: errors 
			}
			}));
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
		}
		}));
	}
});

router.post('/register', async (req, res) => {
	try{
		//security checks
		let data = await  profile.registerUser(req.body);
		if (data == null){
				data = await sql.findEmail(req.body.Email)
			if (data != null && data.Id != null){
				console.log(`${data.Id} registered`);
				res.send(JSON.stringify({data: {
					res: "Success",
					msg: "You successfully registered"
				}}));
			}
		} else 
			res.send(JSON.stringify({data:
				{
					res: "Error",
					errors: data
				}
			}));
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
});

router.post('/user/verifyEmail', async (req, res)=> {
	try{
		if (req.body != null && req.body.Email != null && req.body.VerifyKey != null){
			let result = await profile.verifyUserEmail(req.body.Email, req.body.VerifyKey);
			if (result == null){
				res.send(JSON.stringify({data:
					{
					res: "Success",
					msg: "Email successfully verified" 
					}
				}));
			} else {
				res.send(JSON.stringify({data:
					{
						res: "Error",
						errors: result
					}
				}));
			}
		} else res.send(JSON.stringify({data:
			{
				res: "Error",
				errors: [config.MSG_FORM_INVALID]
			}
		}));
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
})

router.post('/user/verifyEmail/email', async (req, res) => {
	try{
		if (req.body != null && req.body.Email != null){
			let result = await profile.resendVerifyEmail(req.body.Email);
			if (result == 'Success'){
				res.send(JSON.stringify({data:
					{
					res: "Success",
					msg: "Email sent"
					}
				}));
			} else res.send(JSON.stringify({data:
				{
					res: "Error",
					errors: result
				}
			}))
		} else {
			res.send(JSON.stringify({data:
				{
					res: "Error",
					errors: ["Well, I think we messed up if you see this, please continue like this never happened"]
				}
			}))
		}
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
				res: "Error",
				errors: ["Oops pretend you did not see this"]
			}
		}));
	}
})

router.post('/login', async (req, res) => {
	try{
		let data = await profile.loginUser(req.body)
		if (data != null && data.Id != null){
			res.send(JSON.stringify({data:
				{
					res: "Success",
					msg: "You logged in successfully",
					AccessToken: data.AccessToken,
					Verified: data.DateVerified != null ? true : false
				}
			}));
		} else {
			res.send(JSON.stringify({ data:
				{
					res: "Error",
					errors: data
				}
			}));
		}
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
});

router.get('/logout', async (req, res) => {
	try {
		let data = req.query;
		if (await profile.logoutUser(data.AccessToken)){
			res.send(JSON.stringify({data:
				{
					res: "Success",
					msg: "Successfully logged out"
				}
			}));
		}
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
})

router.get('/user/profile', async (req, res) => {
	try{
		let user = await profile.verifyAccessToken(req.query.AccessToken);
		if (user != null && user.Id != null){
			res.send(JSON.stringify({data:
				{
					res: "Success",
					Profile: {
						Username: user.Username,
						Firstname: user.Firstname,
						Lastname: user.Lastname,
						Email: user.Email,
						Gender: user.Gender,
						SexualPreference: user.SexualPreference,
						Avatar: user.Avatar,
						Images: JSON.parse(user.Images),
						Interests: JSON.parse(user.Interests),
						Biography: user.Biography
					}
				}
			}))
		} else res.send(JSON.stringify({data:
			{
				res:"Error",
				errors: user
			}
		}))
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
})

router.get('/user/chat', async (req, res) => {
	try{
		if (req.query != null && req.query.AccessToken != null && req.query.Id != null){
			let user1 = await verifyAccessToken(req.query.AccessToken);
			let user2 = await sql.findId(req.query.Id);
			if (user1 != null && user1.Id != null && user2 != null){
				let chat = await msg.readChat(user1.Id, req.query.Id);
				res.send(JSON.stringify({data:
					{
						res:'Success',
						msg: "Chat retrieved",
						Username: user2.Username,
						Chat: chat
					}
				}))
			} else res.send(JSON.stringify({data: {
				res: 'Error',
				errors: ["Invalid User Id"]
			}}))
		} else res.send(JSON.stringify({data: {
			res: 'Error',
			errors: [config.MSG_FORM_INVALID]
		}}))
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
})

router.get('/user/notifications', async (req, res) => {
	try{
		let user = await profile.verifyAccessToken(req.query.AccessToken);
		if (user != null && user.Id != null){
			let other = await notify.readNotifications(user.Id);
			let chats = await msg.checkNewChatMessages(user.Id);
			let notifications = []
			if (other != null)
				notifications = notifications.concat(other);
			if (chats != null)
				notifications = notifications.concat(chats);
			user.BlockedUsers = user.BlockedUsers == null ? [] : JSON.parse(user.BlockedUsers);
			notifications = notifications.filter((e)=>{
				if (!user.BlockedUsers.includes(e.Id))
					return(e);
			})
			if (notifications != null){
				res.send(JSON.stringify({data:{
					res:"Success",
					notifications
				}}));
			} else res.send(JSON.stringify({ data:
				{
					res: "Error",
					errors: ["Oops we did not expect this to ever happen"]
				}
			}));
		}
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
	
});

router.get('/user/connexions', async (req, res) => {
	try{
		if (req.query != null && req.query.AccessToken != null){
			let connexions = await profile.getUserConnexions(req.query.AccessToken);
			res.send(JSON.stringify({data:
				{
					res: 'Success',
					Connexions: connexions
				}
			}));
		} else res.send(JSON.stringify({data:{
			res: 'Error',
			errors: [config.MSG_FORM_INVALID]
		}}));
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
});

router.post('/user/chat/new', async (req, res) => {
	try{
		if (req.body != null && req.body.AccessToken != null && req.body.To != null 
		&& req.body.Message != null){
		let user = await profile.verifyAccessToken(req.body.AccessToken);
		if (user != null && user.Id != null){
			await msg.sendChatMessage(req.body.AccessToken, req.body.To, req.body.Message);
			let chat = await msg.readChat(user.Id, req.body.To);
			res.send(JSON.stringify({data:
				{
					res: "Success",
					Messages: chat
				}
			}))
		} else res.send(JSON.stringify({data:
			{
				res: "Error",
				errors: user,
			}
		}));
	} else res.send(JSON.stringify({data:
		{
			res: "Error",
			errors: [config.MSG_FORM_INVALID],
		}
	}));
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
});

router.post('/user/locationUpdate', async (req, res) => {
	try {
		let input = req.body;
		let result = await profile.locationUpdate(input.AccessToken, input.Lat, input.Long);
		console.log(result);
		if (result === 'Success'){
			res.send(JSON.stringify({data:
				{
					res: 'Success',
					msg: 'Location Updated'
				}
			}));
		} else {
			res.send(JSON.stringify({data:
				{
					res: "Error",
					errors: result
				}
			}))
		}
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
		{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
		}
		}));
	}
});

router.post('/user/updateProfile', async (req, res) => {
	try {
		let input = req.body;
		let result = await profile.userUpdateProfile(input);
		if (result === 'Success'){
			res.send(JSON.stringify({data:
				{
					res: 'Success',
					msg: 'Profile Saved'
				}
			}));
		} else {
			res.send(JSON.stringify({data:
				{
					res: "Error",
					errors: result
				}
			}))
		}
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
});

router.post('/user/updateProfile/avatar', upload.single('Avatar'), async (req, res) => {
	try{
		let user = await profile.verifyAccessToken(req.body.AccessToken);
		if (user != null && user.Id != null){
			if (req.file != null){
				let avatar = await profile.userUpdateAvatar(user.Id, req.file.filename);
				res.send(JSON.stringify({data: {
					res: 'Success',
					msg: 'Avatar updated',
					Avatar: avatar
				}}))
			} else res.send(JSON.stringify({data: {
				res: 'Error',
				errors: ["Invalid file type"]
			}}))
		} else res.send(JSON.stringify({data: {
			res: 'Error',
			errors: user
		}}))
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
})

router.post('/user/updateProfile/gallery', upload.single('Image'), async (req, res) => {
	try{
		let user = await profile.verifyAccessToken(req.body.AccessToken);
		if (user != null && user.Id != null){
			if (req.file != null && req.body.Key != null){
				if (user.Images == null)
					user.Images = [];
				else user.Images = JSON.parse(user.Images);
				let result = await profile.userUpdateGallery(user.Id, req.file.filename, user.Images, req.body.Key);
				if (result != null)
					res.send(JSON.stringify({data:
						{
							res: 'Success',
							msg: 'Gallery updated',
							Images: result
						}
					}))
			} else res.send(JSON.stringify({data:
				{
					res:'Error',
					errors: ['File of invalid type']
				}
			}))
		} else res.send(JSON.stringify({data:
			{
				res:'Error',
				errors: user
			}
		}))
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
});

router.post('/user/passwordChange', async (req, res) => {
	try{
		let input = req.body;
		if (input != null){
			let result = await profile.userPasswordChange(input.AccessToken, input.Password,
				input.NewPassword, input.RePassword);
			if (result == null){
				res.send(JSON.stringify({data:
					{
						res: 'Success',
						msg: "Password changed"
					}
				}));
			} else {
				res.send(JSON.stringify({data: 
					{
						res: 'Error',
						errors: result
					}
				}));
			}
		}

	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
})

router.post('/user/profile/delete', async (req, res)=>{
	try{
		let res = await profile.deleteUser(req.body.AccessToken, req.body.Password);
		if (res != null){
			res.send(JSON.stringify({ data: {
				res: "Error",
				errors: res
			}}))
		} else res.send(JSON.stringify({data:
			{
				res: 'Success',
				msg: 'Profile deleted',
			}
		}))
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
})

router.get('/view/profile', async (req, res) => {
	try{
		let AccessToken = req.query.AccessToken;
		let ProfileId = req.query.ProfileId;
		let user = await profile.verifyAccessToken(AccessToken);
		if (user != null && user.Id != null){
			let result = await profile.viewProfile(user.Id, ProfileId);
			if (result != null && result.Id != null){
				res.send(JSON.stringify({data:
				{
					res: "Success",
					user:{
						Username: result.Username,
						Firstname: result.Firstname,
						Lastname: result.Lastname,
						Gender: result.Gender,
						SexualPreference: result.SexualPreference,
						Age: await profile.calculateUserAge(result),
						Biography: result. Biography,
						Interests: JSON.parse(result.Interests),
						Location: JSON.parse(result.Location),
						Fame: await profile.calculateUserFame(result),
						Avatar: result.Avatar,
						Images: JSON.parse(result.Images),
						AccessTime: result.AccessTime,
						Liked: result.LikedBy != null ? (result.LikedBy.includes(user.Id) ? true : false) : false,
						Blocked: user.BlockedUsers != null ? (user.BlockedUsers.includes(result.Id) ? true : false) : false
					}
				}}));
			} else res.send(JSON.stringify({data:
				{
					res: "Error",
					errors: user
				}
			}))
		} else res.send(JSON.stringify({data:
			{
				res: "Error",
				errors: ['Failed to retrieve profile.']
			}
		}))
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
})

router.get('/getProfileViews', async (req, res)=>{
	try {
		let data = req.query;
		let tmp;
		let payload = [];
		if (data != null && data.AccessToken != null){
			let ret = await profile.verifyAccessToken(data.AccessToken);
			if (ret != null && ret.Id != null){
				let views = JSON.parse(ret.ViewedBy);
				if (views != null && views.length > 0){
					ret.BlockedUsers = ret.BlockedUsers == null ? [] : JSON.parse(ret.BlockedUsers);
					await g.asyncForEach(views, async (val)=>{
						if (!ret.BlockedUsers.includes(val)){
							let tmp_user = {};
							tmp = await sql.findId(val);
							if (tmp != null && tmp.Id != null && ret.BlockedUsers){
								tmp_user.Id = tmp.Id;
								tmp_user.Username = tmp.Username;
								tmp_user.Fame = await profile.calculateUserFame(tmp);
								payload.push(tmp_user);
							}
						}
					});
				}
				res.send({data:
					{
						res: "Success",
						Viewers: payload
					}
				});
			} else res.send({data:
				{
					res: "Error",
					errors: ret
				}
			});
		} else res.send({data:
			{	
				res: "Error",
				errors: [config.MSG_FORM_INVALID]
			}
		});
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
})

router.get('/getProfileBlocked', async (req, res)=>{
	try{
		let user = await profile.verifyAccessToken(req.query.AccessToken);
		let blocked = [];
		let tmp;
		if (user != null && user.Id != null){
			let ids = (user.BlockedUsers == null ? [] : JSON.parse(user.BlockedUsers));
			await g.asyncForEach(ids, async (val)=>{
				let tmp_user = {};
				tmp = await sql.findId(val);
				if (tmp != null && tmp.Id != null){
					tmp_user.Id = tmp.Id;
					tmp_user.Username = tmp.Username;
					tmp_user.Fame = await profile.calculateUserFame(tmp);
					blocked.push(tmp_user);
				}
			})
		}
		res.send(JSON.stringify({data:
			{
				res: "Success",
				Blocked: blocked
			}
		}));
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
})

router.get('/getProfileLikes', async (req, res)=>{
	try{
		let data = req.query;
		let tmp;
		let payload = [];
		if (data != null && data.AccessToken != null){
			let ret = await profile.verifyAccessToken(data.AccessToken);
			if (ret != null && ret.Id != null){
				let likes = JSON.parse(ret.LikedBy);
				if (likes != null && likes.length > 0){
					ret.BlockedUsers = ret.BlockedUsers == null ? [] : JSON.parse(ret.BlockedUsers);
					await g.asyncForEach(likes, async (val)=>{
						if (!ret.BlockedUsers.includes(val)){
							let tmp_user = {};
							tmp = await sql.findId(val);
							if (tmp != null && tmp.Id != null){
								tmp_user.Id = tmp.Id;
								tmp_user.Username = tmp.Username;
								tmp_user.Fame = await profile.calculateUserFame(tmp);
								payload.push(tmp_user);
							}
						}
					})
				}
				res.send(JSON.stringify({data:
					{
						res: "Success",
						Likers: payload
					}
				}));
			} else res.send(JSON.stringify({data:
				{
					res: "Error",
					errors: ret
				}
			}));
		} else res.send(JSON.stringify({data:
			{
				res: "Error",
				errors: [config.MSG_FORM_INVALID]
			}
		}));
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
})

router.post('/user/passwordReset', async (req, res) => {
	try {
		let bod = req.body
		if (bod != null){
			let result = await profile.resetUserPassword(bod.Email, 
				bod.Password, bod.RePassword, bod.VerifyKey);
			//success
			if (result === 'Success')
				res.send(JSON.stringify({ data:
					{
					res: "Success",
					msg: "Password reset"
					}
				}));
			else
			res.send(JSON.stringify({ data:
				{
				res: "Error",
				errors: result
				}
			}));
		} else res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: [config.MSG_FORM_INVALID]
			}
		}));
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
});

router.post('/user/passwordReset/email', async (req, res) => {
	try {
		if (req.body != null && req.body.Email != null){
			const email = req.body.Email;
			let data = await profile.resetPasswordEmail(email);
			if (data == null){
				res.send(JSON.stringify({ data:
					{
					res: "Success",
					msg: "Email Sent"
					}
				}));
			} else {
				res.send(JSON.stringify({ data:
					{
					res: "Error",
					errors: data
					}
				}));
			}
		} else {
			res.send(JSON.stringify({ data:
				{
				res: "Error",
				errors: [config.MSG_FORM_INVALID]
				}
			}));
		}
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
})

router.post('/user/delete', async (req, res) => {
	try{
		let result = await profile.deleteUser(req.body.AccessToken, req.body.Password);
		if (result === 'Success'){
			res.send(JSON.stringify({ data:
				{
				res: "Success",
				msg: "Account deleted"
				}
			}));
		} else {
			res.send(JSON.stringify({ data:
				{
				res: "Error",
				errors: result
				}
			}));
		}
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
});

router.post('/user/like', async (req, res) => {
	try{
		let userData = req.body;
		let data;
		let user = await profile.verifyAccessToken(userData.AccessToken);
		if (user != null && user.Id != null && userData.profileId != null){
			data = await profile.likeUser(user.Id, Number(userData.profileId));
			if (data === 1){
				res.send(JSON.stringify({data:{
					res: "Success",
					msg: "Liked User"
				}}));
			} else if (data === -1){
				res.send(JSON.stringify({data:{
					res: "Success",
					msg: "Disliked User"
				}}));
			} else res.send(JSON.stringify({data:
				{
					res: "Error",
					errors: ["Oops something went Wrong"]
				}
			}));
		} else res.send(JSON.stringify({data:
			{
				res: "Error",
				errors: user
			}
		}));
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
});

router.post('/user/block', async (req, res) => {
	try{
		let userData = req.body;
		let data;
		let user = await profile.verifyAccessToken(userData.AccessToken);
		if (user != null && user.Id != null && userData.profileId != null){
			data = await profile.blockUser(user.Id, Number(userData.profileId));
			if (data === 1){
				res.send(JSON.stringify({data:{
					res: "Success",
					msg: "Blocked User"
				}}));
			} else if (data === -1){
				res.send(JSON.stringify({data:{
					res: "Success",
					msg: "Unblocked User"
				}}));
			} else res.send(JSON.stringify({data:
				{
					res: "Error",
					errors: ["Oops something went Wrong"]
				}
			}));
		} else res.send(JSON.stringify({data: 
			{
				res: "Error",
				errors: user
			}
		}));
	} catch (err){
		console.log(err);
		res.send(JSON.stringify({ data:
			{
			res: "Error",
			errors: ["Oops pretend you did not see this"]
			}
		}));
	}
});

module.exports = router;