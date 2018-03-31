var express = require('express');
var router = express.Router();

var SendAccount = require('../../helpers/send-instructor-account');

var User = require('../../models/user');

router.get('/', (req, res) => {
  User.findOne({
    'role' : 'instructor',
    'sent' : false
  }, (err, user) => {
    if (err) {
      console.log('Unable to find user');
    } else {
      SendAccount.send(user.username, (err, info) => {
        if (err) {
          res.json({success: 0, message: 'Unable to send mail'});
        } else {
          User.update({'_id' : user._id}, {
            '$set' : {
              'sent' : true
            }
          }, (err, userUpdated) => {
            if (err) {
              console.log('Unable to update user info');
            } else {
              console.log('User updated: ', userUpdated);
            }
          })
          res.send({success: 1, message: 'Mail send ok'});
        }
      });
    }
  })
});

module.exports = router;
