var express = require('express');
var router = express.Router();

router.use('/management', require('./management'));
router.use('/user', require('./user'));
router.use('/instructor', require('./instructor'));
router.use('/course', require('./course'));
router.use('/team', require('./team'));

module.exports = router;
