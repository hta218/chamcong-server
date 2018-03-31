var express = require('express');
var router = express.Router();

// router.use('/payroll', require('./payroll'));

var Course = require('./../../models/course');

router.get('/', (req, res) => {
  Course.find({isActive: true}, (err, courses) => {
    if (err) {
      res.json({success: 0, message: 'Unable to load courses'})
    } else {
      res.json({success: 1, message: 'Fetch courses successfully', courses: courses});
    }
  });
});

router.post('/create', (req, res) => {
  var body = req.body;
  var name = body.name;
  var description = body.description;
  var isActive = true;

  var course = new Course({
    name,
    description,
    isActive
  });

  course.save((err, savedCourse) => {
    if (err) {
      res.json({success: 0, message: 'unable to save new course'});
    } else {
      res.json({success: 1, message: 'Saved course successfully', savedCourse});
    }
  });
});

router.post('/update', (req, res) => {
  var body = req.body;
  var courseId = body.courseId;
  var name = body.name;
  var description = body.description;

  // NOTE: use findOneAndUpdate() to return the updated document
  // ref: https://davidburgos.blog/return-updated-document-mongoose/

  Course.findOneAndUpdate(
    {
      "_id": courseId
    },
    {
      "name" : name,
      "description" : description
    },
    {
      new: true
    }, (err, courseUpdated) => {
      if (err) {
       res.json({success: 0, message: "Unale to update course"});
      } else {
       res.json({success: 1, message: "Updated successfully", courseUpdated});
      }
    }
  );
});

router.delete('/delete/:courseId', (req, res) => {
  const courseId = req.params.courseId;

  Course.findOne({"_id": courseId}, (err, foundCourse) => {
    if (err) {
      res.json({success: 0, message: "Unable to find course"});
    } else if(!foundCourse) {
      res.json({success: 0, message: "Course not found"});
    } else {
      Course.update({
        "_id" : courseId
      }, {
        "isActive" : false
      }, (err, foundCourse) => {});
      res.json({success: 1, message: "Deleted course: ", foundCourse});
    }
  });
});

module.exports = router;
