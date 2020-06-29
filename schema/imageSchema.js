const config = require('../config');
const cloudinary = require('cloudinary');
const { CLOUDINARY_CONNECTION } = require('../config');
const formidable = require('formidable');
cloudinary.config(CLOUDINARY_CONNECTION);


function filterImage(file){
	if (file == null)
		return (1);
	if (!file.originalname.match(config.IMAGE_FILTER)){
		return (1);
	} else return (true);
}
