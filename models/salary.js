var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var salarySchema = new Schema({
  instructor: String,
  course: {
    type: Schema.Types.ObjectId,
    ref: 'course'
  },
  role: String,
  salary: Number
});

module.exports = mongoose.model("salary", salarySchema, "salary");
