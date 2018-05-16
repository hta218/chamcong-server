var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var instructorSchema = new Schema({
  firstName: String,
  lastName: String,
  searchName: String,
  image: String,
  code: String,
  email: String,
  courses: [{
    type: Schema.Types.ObjectId,
    ref: "course"
  }],
  paidTime: {
    startDate: Date,
    endDate: Date
  }
});

instructorSchema.index({searchName: "text"});

module.exports = mongoose.model("instructor", instructorSchema);
