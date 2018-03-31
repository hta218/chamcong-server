var express = require('express');
var router = express.Router();

router.use('/summary', require('./summary'));
router.use('/payroll', require('./payroll'));
router.use('/salary', require('./salary'));
router.use('/department', require('./department'));
router.use('/feedback', require('./feedback'));

module.exports = router;
