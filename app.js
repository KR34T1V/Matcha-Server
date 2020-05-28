const express = require('express');
const sql = require('./schema/SQLSchema');
const profile = require('./schema/profileSchema');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
	res.send('Hello World!');
});

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));