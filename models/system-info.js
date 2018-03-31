var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var systemInfoSchema = new Schema({
  code: String,
  infos: {}
});

module.exports = mongoose.model("systemInfo", systemInfoSchema, "systemInfo");
