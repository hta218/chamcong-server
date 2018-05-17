var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var { getSalary } = require('../helpers/get-salary');

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
  forcedSave: {
    type: Boolean,
    default: false
  },
  disabled: Boolean
});

instructorRecordSchema.statics.getTotalClassSession = function(course, classNo) {
  return new Promise((resolve, reject) => {
    this.count({course, classNo, role: 'instructor', disabled: false}, (err, total) => {
      if (err) {
        reject(err);
      } else {
        resolve(total);
      }
    });
  });
}

instructorRecordSchema.statics.saveAndGetSalary = function(record, res) {
  record.save((err, savedInstructorRecord) => {
    if (err) {
      res.json({success: 0, message: "Unable to save instructor-record: " + err});
    } else {
      var salary = 0;

      getSalary(record, salary).then((salary) => {
        res.json({
          success: 1,
          message: "Successfully save instructor-record",
          results: savedInstructorRecord,
          salary: salary
        });
      }).catch((err) => {
        res.json({
          success: 1,
          message: "Successfully save instructor-record",
          results: savedInstructorRecord,
          salary: salary
        });         
      });
    }
  });
}

module.exports = mongoose.model("instructorRecord", instructorRecordSchema);
