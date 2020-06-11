"use strict"
const config = require('../config');

/**
 * Check for Speial Characters
**/
function testSpecial (string) {
	if (!string)
		return (false);
		
	var regexp = new RegExp('[!@#$%^&*=+-]+');

	return regexp.test(string);
}

/**
 * Check for Uppercase Alpha
**/
function testUpperAlpha (string) {
	if (!string)
		return (false);

	var regexp = new RegExp('[A-Z]+');

	return regexp.test(string).valueOf();
}

/**
 * Check for Lowercase Alpha
**/
function testLowerAlpha (string) {
	if (!string)
		return (false);

	var regexp = new RegExp('[A-Z]+');

	return regexp.test(string).valueOf();
}

/**
 * Check for Numerics
**/
function testNumeric (string) {
	if (!string)
		return (false);

	var regexp = new RegExp('[0-9]+');

	return regexp.test(string).valueOf();
}

/**
 * Check Username
**/
function checkUserName (userName) {
	if (!userName)
		return (false);
	var regexp = new RegExp('^[A-Za-z0-9]+$');

	return regexp.test(userName).valueOf();
}

/**
 * Check Names
**/
function checkNames (name) {
	if (!name)
		return (false);

	var regexp = new RegExp('^[A-Za-z]+$');

	return regexp.test(name).valueOf();
}

/**
 * Check Email
**/
function checkEmail (email) {
	if (!email)
		return (false);

	var regexp = new RegExp('^([a-zA-Z0-9_.-]+)@([a-zA-Z0-9_.-]+).([a-zA-Z]{2,5})$');

	return regexp.test(email).valueOf();
}

/**
 * Check Password
**/
function checkPassword (password) {
	if (!password || password.length < config.PASSWORD_LENGTH || !testLowerAlpha(password) ||
		!testUpperAlpha(password) || !testSpecial(password) || !testNumeric(password))
		return (false);
	else
		return(true);
}

/**
 * Check Re-Password
**/
function checkRePassword (password, rePassword) {
	if (!password || !rePassword)
		return (false);
	
		
	return (password == rePassword);
}

/**
 * Check Birth
**/
function checkBirth (birth) {
	if (!birth)
		return (false);
		
	var regexp = new RegExp('^[0-9]{4}-[0-9]{2}-[0-9]{2}$');

	return regexp.test(birth).valueOf();
}

/**
 * Check Gender
**/
function checkGender (gender) {
	if (gender != 'Male' && gender != 'Female')
		return false;
	else 
		return true;
}

/**
 * Check Sexual Preference
**/
function checkPreference (pref) {	
	if (pref != 'Heterosexual' && pref != 'Homosexual' && pref != 'Bisexual')
		return false;
	else
		return true;
}

module.exports = {
	testSpecial,
	testUpperAlpha,
	testLowerAlpha,
	testNumeric,
	checkUserName,
	checkNames,
	checkEmail,
	checkPassword,
	checkRePassword,
	checkBirth,
	checkGender,
	checkPreference
};