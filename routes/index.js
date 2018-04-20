var crypto = require('crypto');
var express = require('express');
var router = new express();
var bodyParser = require('body-parser');
var async = require('async');
var extend = require('../lib/extend');
var config = require('../lib/config');
var path = require('path');
var cookieParser = require('cookie-parser');

router.set('views', path.join(__dirname, '..', 'views'));
router.set('view engine', 'ejs');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));
router.use(cookieParser());
router.use(express.static(path.join(__dirname, '..', 'public')));

router.get('/', function(req, res) {
    res.render('index', { });
});

router.get('/settings', function(req, res, next) {
    // Documentation: https://github.com/auth0/extend/wiki/Auth0-Extend-User%27s-Guide#mapping-isolation-requirements-onto-webtask-tokens

    return async.waterfall([
        (cb) => extend.mapTenantToIsolationScope(req, cb),
        (webtaskContext, cb) => res.render('settings', { 
            webtaskContext: webtaskContext, 
            randomBytes: crypto.randomBytes(32).toString('hex')
        })
    ], next);
});

router.get('/settings-old', function(req, res, next) {
    return res.render('settings_old', {});
});

router.post('/api/leads', bodyParser.json(), function (req, res, next) {
    // Documentation: https://github.com/auth0/extend/wiki/Auth0-Extend-User%27s-Guide#invoking-extensions

    return async.waterfall([
        (cb) => extend.mapTenantToIsolationScope(req, cb),
        (webtaskContext, cb) => extend.discoverExtensions(webtaskContext, 'on-new-lead', cb),
        (extensions, cb) => extend.invokeExtension(extensions, req.body, cb),
        (result, cb) => {
            // This is the place where any application-specific processing of the 
            // augmented information about the new lead would be implemented. 
            // In this sample the new lead information is simply returned to the caller. 
            res.status(result.statusCode || 200).json(result);
        }
    ], next);
});

module.exports = router;
