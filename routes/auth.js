var jwt   = require('jwt-simple');
var async = require('async');

var auth  = {

  login: function(req, res, netx) {
    login(req, res, netx);
  },

  logout: function(req, res, netx) {
    logout(req, res, netx);
  }

};

function login(req, res, netx) {
  logger.info('---auth.login START---');

  var appId       = (req.params && req.params.appId) || (req.body && req.body.appId) || (req.query && req.query.appId) || req.headers['appId'];
  var userId      = (req.params && req.params.userId) || (req.body && req.body.userId) || (req.query && req.query.userId) || req.headers['userId'];
  var loginType   = (req.params && req.params.loginType) || (req.body && req.body.loginType) || (req.query && req.query.loginType) || req.headers['loginType'];

  var rtnValue    = (req.param && req.param.rtnValue);
  var secretKey   = rtnValue.secretKey;

  if (!appId || !userId) {
    var errorMessage = 'appId, userId required.';
    logger.error(errorMessage);
    return next(errorMessage);
  }

  logger.debug('<<<loginType:' + loginType);

  if (!loginType || loginType === '')
    loginType = 'A';

  var conn;

  async.waterfall(
  [
    function(callback) {
      if (!secretKey) {
        callback('Invalid appId (no secretKey)');
        return;
      }

      var getUser = 'SELECT userId, userName, appId FROM user WHERE userId=\'' + userId + '\' AND appId=\'' + appId + '\'';

      conn = createConnection();

      conn.query(getUser, function(err, results) {
        if (err) { conn.end(); return callback(err); }

        if (results.length < 1) {
          var err = register(req, res);
          if (err) { conn.end(); return callback(err); }
        }

        conn.end();

        callback(null, secretKey);
      });
    },

    function(secretKey, callback) {
      var moment = require('moment');
      var regDate = moment().format('YYYY-MM-DD HH:mm:ss.SSS');

      var payload = {
        'appId' 	: appId,
        'userId'	: userId,
        'exp'		  : expiresIn(1),
        'regDate'	: regDate
      };

      var token = getToken(payload, secretKey);
      logger.debug('generated token >>> %j', token);

      // record user_loginlog
      var setUserLogin = 'INSERT INTO user_loginlog SET ?';

      var userLoginInfo = {
        'loginToken'	: token,
        'userId' 		  : userId,
        'logindate'		: regDate,
        'expiredYN'		: 'N',
        'loginType'   : loginType,
        'UserIp'      : '0.0.0.0',
        'appId'			  : appId,
        'accCountry'  : '',
        'accCity'     : ''
      };

      conn = createConnection();

      conn.query(setUserLogin, userLoginInfo, function(err, results) {
        if (err) { conn.end(); return callback(err); }

        conn.end();

        callback(null, token);
      });
    }
  ],

    function (err, token) {
      logger.info('---auth.login END---');
      if(err) {
          logger.error('err>>>'+err);
          //console.log('err>>>'+err);
          res.status(500);
          res.json({
              "message": "Oops something went wrong",
              "error": err
          });

          return;
      }

      res.status(200);
      res.json({
        'message' : 'succeed to login.',
        "token"   : token
      });

      return;
    }

  ); // end waterfall}
}

function logout(req, res, next) {
  logger.info('---auth.logout START---');

  var appId     = (req.params && req.params.appId) || (req.body && req.body.appId) || (req.query && req.query.appId) || req.headers['appId'];
  var userId    = (req.params && req.params.userId) || (req.body && req.body.userId) || (req.query && req.query.userId) || req.headers['userId'];

  var rtnValue  = (req.param && req.param.rtnValue);
  var secretKey = rtnValue.secretKey;
  var token     = rtnValue.token;

  if (!appId || !userId) {
    errorMessage = 'appId, userId required';
    logger.info(errorMessage);
    return next(errorMessage);
  }

  var conn;

  async.waterfall(
  [
    function(callback) {

      var getUserToken = 'SELECT loginToken, expiredYN, loginDate FROM user_loginlog WHERE expiredYN=\'N\' AND userId=? AND appId=? ORDER BY logindate DESC';

      conn = createConnection();

      conn.query(getUserToken, [userId, appId], function(err, results) {
        if (err) {
          conn.end();
          return callback(err);
        }

        if (results.length > 0) {
          rtnValue.token     = results[0].loginToken;
          rtnValue.expiredYN = results[0].expiredYN;

          callback(null, rtnValue);
        } else {
          callback('Token does not existed.');
        }

        conn.end();
      });
    },

    function(rtnValue, callback) {
      if (rtnValue.token) {

        var updateToken = 'UPDATE user_loginlog SET expiredYN=\'Y\' WHERE loginToken=\'' + rtnValue.token + '\'';

        conn = createConnection();

        conn.query(updateToken, function(err, results) {
          if (err) {
            conn.end();
            return callback(err);
          }

          conn.end();

          callback(null, rtnValue);
        });
      } else {
        callback(null, rtnValue);
      }
    }
  ],

    function(err, rtnValue) {
      logger.info('---auth.logout END---');

      if(err) {
        logger.error('logout err >>> %j', err);
        res.status(500);
        res.json({
          "message" : "Oops something went wrong.",
          "error"   : err
        });

        return;
      }

      res.status(200);
      res.json({
        'message' : 'succeed to logout.'
      });

      return;

    }
  ); // end async.waterfall();
}

function register(req, res) {
  logger.info('---auth.register START---');
  var appId     = (req.params && req.params.appId) || (req.body && req.body.appId) || (req.query && req.query.appId) || req.headers['appId'];
  var userId    = (req.params && req.params.userId) || (req.body && req.body.userId) || (req.query && req.query.userId) || req.headers['userId'];
  var joinRoute = (req.params && req.params.loginType) || (req.body && req.body.loginType) || (req.query && req.query.loginType) || req.headers['loginType'];

  var conn;

  logger.debug('<<<joinRoute:' + joinRoute);

  if (!joinRoute || joinRoute === '')
    joinRoute = 'A';

  var moment  = require('moment');
  var regDate = moment().format('YYYY-MM-DD HH:mm:ss.SSS');

  var setUser = 'INSERT INTO user SET ?';

  var newUserInfo = {
    'userId'				: userId,
    'appId' 				: appId,
    'userName' 			: userId,
    'regiYHS'				: regDate,
    'possessBadges'	: 0,
    'userPoint'			: 0,
    'joinRoute'     : joinRoute,
    'userIP'				: '0.0.0.0',
    'accCountry'		: '',
    'accCity'				: ''
  };

  conn = createConnection();

  conn.query(setUser, newUserInfo, function(err, results) {
    if (err) { conn.end(); return err; }

    conn.end();
  });

  logger.info('---auth.register END---');

  return;
}

// private method
function getToken(payload, secret) {
  return jwt.encode(payload, secret);
}

function expiresIn(numDays) {
  var dateObj = new Date();
  return dateObj.setDate(dateObj.getDate() + numDays);
}

function createConnection() {
  var mysql = require('mysql');

  return mysql.createConnection(config.mysql_live);
}

module.exports = auth;