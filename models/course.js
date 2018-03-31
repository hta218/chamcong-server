var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var courseSchema = new Schema({
  name: String,
  description: String,
  isActive: Boolean
});

module.exports = mongoose.model("course", courseSchema);
