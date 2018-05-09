var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var teamSchema = new Schema({
  name: String,
  code: String,
  maxNo: Number
});

module.exports = mongoose.model("team", teamSchema);
