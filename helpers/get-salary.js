var Instructor = require('../models/instructor');
var Salary = require('../models/salary');

var getSalary = (instructorRecord, salary) => {
  return new Promise((resolve, reject) => {
    Instructor.findOne({'_id' : instructorRecord.instructor}, (err, foundInstructor) => {
      if (err) {
        console.log('Unable to fetch instructor code');
        reject();
      } else {
        Salary.findOne({
          'instructor' : foundInstructor.code,
          'course' : instructorRecord.course,
          'role' : instructorRecord.role
        }, (err, salaryInfo) => {
          if (err) {
            console.log('Unable to fetch salary');
            reject();
          } else {
            if (salaryInfo) {
              salary = salaryInfo.salary;
            }
            resolve(salary);
          }
        });
      }
    });
  });
}

module.exports = { getSalary };
