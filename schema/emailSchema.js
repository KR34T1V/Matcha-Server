"use strict"
var nodemailer = require('nodemailer');


function verifyEmail(email, username, key){
	let from = '"Matcha" <Verify@matcha.com>';
	let to = email;
	let subject = `${username} Please Verify Your Email.`;
	//Text************************************************************************************
	let bodyText = `
	Dear ${username},
	Please use the following code to verify your Matcha account:
	
	${key}

	Regards,
	Matcha Team
	`;
	//HTML************************************************************************************
	let bodyHtml = `
	Dear <strong>${username}<strong>,
	<p>Please use the following code to verify your Matcha account:</p><br/>

	<h1>${key}</h1>

	<p>Regards,</p>
	<p>Matcha Team</p>
	`;
	//HTML Ends Here
	return (sendMail(from, to, subject, bodyText, bodyHtml));
}

function resetEmail(email, username, key){
	let from = '"Matcha" <Reset@matcha.com>';
	let to = email;
	let subject = `${username} Password Reset Key.`;
	//Text************************************************************************************
	let bodyText = `
	Dear ${username},
	Please use the following code to change your password:
	
	${key}

	Regards,
	Matcha Team
	`;
	//HTML************************************************************************************
	let bodyHtml = `
	Dear <strong>${username}<strong>,
	<p>Please use the following code to change your password:</p><br/>
	
	<h1>${key}</h1>

	<p>Regards,</p>
	<p>Matcha Team</p>
	`;
	//HTML Ends Here
	return (sendMail(from, to, subject, bodyText, bodyHtml));
}

/*
** SUBMODULES
*/
async function createTransporter(){
	let mailTransporter = nodemailer.createTransport({
		host: 'smtp.gmail.com',
		port: 587,
		secure: false, // true for 465, false for other ports
		auth: {
			user: 'm4dm0nk3y.za@gmail.com',
			pass: 'nevpwkbgoifsehep'
		}
	});
	return (mailTransporter);
}

async function sendMail(from, to, subject, bodyText, bodyHtml){
	let server = await createTransporter();
	let info = await server.sendMail({
		from: from,
		to: to,
		subject: subject,
		text: bodyText,
		html: bodyHtml
	});
	console.log('Message sent: %s', info.messageId);
	return (info);
}

module.exports = {
	verifyEmail,
	resetEmail
};