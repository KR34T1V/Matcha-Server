async function preference(user, userArray){
	if (user != null && user.Id != null && userArray != null){
		//remove self from feedback
		userArray = userArray.filter(e => e.Id != user.Id);
		//filter sexuality
		const filteredUsers = userArray.map((val)=>{
			if (user.Gender === 'Male'){
				if (user.SexualPreference === 'Heterosexual'){
					if (val.Gender != 'Male' && val.SexualPreference != 'Homosexual')
						return (val);
				} else if (user.SexualPreference === 'Homosexual'){
					if (val.Gender != 'Female' && val.SexualPreference != 'Heterosexual')
						return (val);
				} else if (user.SexualPreference === 'Bisexual'){
					if (val.Gender === 'Male' && val.SexualPreference !== 'Heterosexual')
						return (val);
					if (val.Gender === 'Female' && val.SexualPreference !== 'Homosexual')
						return (val);
				}
			} else if (user.Gender === 'Female'){
				if (user.SexualPreference === 'Heterosexual'){
					if (val.Gender != 'Female' && val.SexualPreference != 'Homosexual')
						return (val);
				} else if (user.SexualPreference === 'Homosexual'){
					if (val.Gender != 'Male' && val.SexualPreference != 'Heterosexual')
						return (val);
				} else if (user.SexualPreference === 'Bisexual'){
					if (val.Gender === 'Female' && val.SexualPreference !== 'Heterosexual')
						return (val);
					if (val.Gender === 'Male' && val.SexualPreference !== 'Homosexual')
						return (val);
				}
			}
		})
	return (filteredUsers.filter(e => e != null));
	}
	return (null);
}
//filter blocked

module.exports = {
	preference
}