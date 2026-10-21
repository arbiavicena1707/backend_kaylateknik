// Entry point untuk cPanel / Passenger
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
module.exports = require('./src/index.js');
