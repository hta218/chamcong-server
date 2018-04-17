var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var instructorRecordSchema = new Schema({
  instructor: {
    type: Schema.Types.ObjectId,
    ref: 'instructor'
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: 'course'
  },
  className: String,
  classNo: Number,
  role: String,
  recordDate: Date,
  addedDate: Date,
  disabled: Boolean
});

module.exports = mongoose.model("instructorRecord", instructorRecordSchema);
