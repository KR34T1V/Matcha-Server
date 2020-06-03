const express = require('express');
const bodyParser = require("body-parser");
const cors = require("cors");
const sql = require('./schema/SQLSchema');
const profile = require('./schema/profileSchema');
const app = express();
const indexRouter = require('./routes/index');
const port = 3030;


app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', indexRouter);

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));