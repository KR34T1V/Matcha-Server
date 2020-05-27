const Verify = function (req, res, next){
	if (req.session.data && req.session.data.Username && req.session.data.NewEmail && !req.session.data.Verified)
		return (res.redirect(`/users/verify?email=${req.session.data.NewEmail}`));
	else 
		next();
};

const Home = function (req, res, next){
	if (req.session.data && req.session.data.Username)
		return (res.redirect('/'));
	else
		next();
};

const Login = function (req, res, next){
	if (!req.session.data || !req.session.data.Username)
		return (res.redirect('/users/login'));
	else
		next();
};

module.exports = {
	Verify,
	Home,
	Login
};