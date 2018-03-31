var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
  displayName: String,
  role: String,
  username: String,
  password: String,
  email: String,
  instructor: String,
  sent: Boolean
});

module.exports = mongoose.model("user", userSchema);
