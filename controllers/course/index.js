var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();

var { managerFilter } = require('../auth-filter');
var Course = require('./../../models/course');
var ClassInfo = require('./../../models/class');

router.use(managerFilter);

router.get('/', (req, res) => {
  Course.aggregate([
    {
      '$match': {
        'isActive': true
      }
    },
    {
      '$lookup': {
        'from': 'classinfos',
        'localField': '_id',
        'foreignField': 'course',
        'as': 'classes'
      }
    },
    {
      '$unwind': {
        'path': '$classes',
        'preserveNullAndEmptyArrays': true
      }
    },
    {
      '$group': {
        '_id': {
          '_id': '$_id',
          'name': '$name',
          'description': '$description',
          'isActive': '$isActive',
        },
        'maxSession': {'$max': '$classes.maxSession'}
      }
    },
    {
      '$project': {
        '_id': '$_id._id',
        "name": '$_id.name',
        "description": "$_id.description",
        "isActive": '$_id.isActive',
        'maxSession': 1
      }
    }
  ]).exec((err, courses) => {
    if (err) {
      res.json({success: 0, message: 'Unable to load courses'});
    } else {
      res.json({success: 1, message: 'Fetch courses successfully', courses: courses});
    }
  });
});

router.get('/:id', (req, res) => {
  Course.aggregate([
    {
      '$match': {
        _id: mongoose.Types.ObjectId(req.params.id)
      }
    }, 
    {
      '$lookup': {
        'from': 'classinfos',
        'localField': "_id",
        'foreignField': 'course',
        'as': 'classes'
      }
    }
  ]).exec((err, course) => {
    if (err) {
      res.json({success: 0, message: "Get course failed", err});
    } else {
      res.json({success: 1, message: "Get course ok", course});
    }
  })
});

router.post('/', (req, res) => {
  var body = req.body;
  var name = body.name;
  var description = body.description;
  var maxClass = body.maxClass;
  var isActive = true;

  var course = new Course({
    name,
    description,
    maxClass,
    isActive
  });

  course.save((err, savedCourse) => {
    if (err) {
      res.json({success: 0, message: 'unable to save new course', err});
    } else {
      res.json({success: 1, message: 'Saved course successfully', savedCourse});
    }
  });
});

router.patch('/:id', (req, res) => {
  var body = req.body;
  var courseId = req.params.id;

  var name = body.name;
  var description = body.description;

  // NOTE: use findOneAndUpdate() to return the updated document
  // ref: https://davidburgos.blog/return-updated-document-mongoose/

  var updateMaxSession, maxSession, fromClassNo;

  updateMaxSession = body.updateMaxSession;
  fromClassNo = body.fromClassNo;
  maxSession = body.maxSession;

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
        res.json({success: 0, message: "Unable to update course", err});
      } else {
        if (updateMaxSession) {
          ClassInfo.updateClassMaxSession(courseId, fromClassNo, maxSession).then(data => {
            res.json({success: 1, message: "Updated successfully", courseUpdated, data});
          }).catch(err => {
            res.json({success: 0, message: "Unable to update class max session", err});
          });
        } else {
          res.json({success: 1, message: "Updated successfully", courseUpdated});
        }
      }
    }
  );
});

router.delete('/:id', (req, res) => {
  const id = req.params.id;

  Course.findOne({"_id": id}, (err, foundCourse) => {
    if (err) {
      res.json({success: 0, message: "Unable to find course"});
    } else if(!foundCourse) {
      res.json({success: 0, message: "Course not found"});
    } else {
      Course.update({
        "_id" : id
      }, {
        "isActive" : false
      }, (err, foundCourse) => {});
      res.json({success: 1, message: "Deleted course: ", foundCourse});
    }
  });
});

router.use('/class', require('./class'));

module.exports = router;
