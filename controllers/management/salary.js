var express = require('express');
var router = express.Router();

var moment = require('moment');
var mtz = require('moment-timezone');

var Instructor = require('./../../models/instructor');
var Salary = require('./../../models/salary');
var Course = require('./../../models/course');

// GET instructor salary
router.get('/', (req, res) => {
  var instructorCode = req.query.code || 'undefined instructor code';
  Instructor.aggregate([
    {
      '$match' : {
        'code' : instructorCode
      }
    },
    {
      '$lookup' : {
        'from' : 'salary',
        'localField' : 'code',
        'foreignField' : 'instructor',
        'as' : 'salaries'
      }
    }
  ]).exec((err, result) => {
    if (err) {
      res.json({success: 0, message: 'Unable to fetch instructor salary'})
    } else {
      Course.find({}, (err, allCourses) => {
        if (err) {
          res.json({success: 0, message: 'Unable to fetch course info'})
        } else {
          res.json({
            success: 1,
            message: 'Fetch instructor salary successfully',
            instructor: result[0],
            allCourses: allCourses
          });
        }
      });
    }
  });
});

router.post('/', (req, res) => {
  var body = req.body
  var instructor = body.instructor;
  var course = body.course;
  var role = body.role;
  var salary = body.salary;

  var newSalary = new Salary({
    instructor,
    course,
    role,
    salary
  });

  newSalary.save((err, savedSalary) => {
    if (err) {
      res.json({success: 0, message: "Unable to save new instructor-salary"});
    } else {
      res.json({success: 1, message: 'Saved succesfully', savedSalary: savedSalary});
    }
  });
});

// update instructor salary
router.post('/update', (req, res) => {
  var instructorCode = req.query.code || 'undefined instructor code';
  var salaries = req.body.salaries;

  var updateStatus = false;

  var updateSalary = (salaries) => {
    return new Promise((resolve, reject) => {
      salaries.forEach((salary) => {
        var course = salary.course;
        var role = salary.role;
        var salary = salary.salary;
        Salary.update(
          {
            'instructor' : instructorCode,
            'course' : course,
            'role' : role
          },
          {
            '$set' : {'salary' : salary}
          },
          (err, results) => {
          if (err) {
            updateStatus = false;
            reject();
          } else {
            updateStatus = true;
            resolve(results);
          }
        })
      })
    });
  }

  updateSalary(salaries).then((response) => {
    if (updateStatus) {
      res.json({success: 1, message: 'Update ok'});
    } else {
      res.json({success: 0, message: 'Update failed'});
    }
  }).catch((err) => {
    res.json({success: 0, message: 'Update failed'});
  });
});

module.exports = router;
