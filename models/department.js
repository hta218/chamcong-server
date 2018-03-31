var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var departmentSchema = new Schema({
  name: String,
  displayName: String,
  contactPoint: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  }
});

module.exports = mongoose.model("department", departmentSchema);
