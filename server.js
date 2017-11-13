var express      = require('express')
  , redirect     = require('express-redirect');
var bodyParser   = require('body-parser');
var cookieParser = require('cookie-parser');

var log4js       = require('log4js');

//var $depth = 9; // node v0.12.2
var $depth = 10; // node v4.2.x above

var log_config = {
  appenders: [
    {
      type: "dateFile",
      filename: "logs/kiki_svr.log",
      pattern: ".yyyy-MM-dd",
      maxLogSize: 10485760,
      numBackups: 7,
      layout: {
        type    : "pattern",
        pattern : "%d %p {%x{ln}} -\t%m",
        tokens: {
          ln : function() {
            return (new Error).stack.split("\n")[$depth]
            .replace(/^\s+at\s+(\S+)\s\((.+?)([^\/]+):(\d+):\d+\)$/, function (){
                return arguments[1] +' '+ arguments[3] +' line '+ arguments[4];
            });
          }
        }
      }
    },
    {
      type: "console",
      layout: {
        type    : "pattern",
        pattern : "%d %p {%x{ln}} -\t%m",
        tokens: {
          ln : function() {
            return (new Error).stack.split("\n")[$depth]
            // Just the namespace, filename, line:
            .replace(/^\s+at\s+(\S+)\s\((.+?)([^\/]+):(\d+):\d+\)$/, function (){
                return arguments[1] +' '+ arguments[3] +' line '+ arguments[4];
            });
          }
        }
      }
    }
  ]
};

log4js.configure(log_config);

global.logger   = log4js.getLogger('kiki_svr');

global.config = require('./config.json');
global.errorcode = require('./errorcode.json');

logger.setLevel(config.loglevel);

var app = express();
redirect(app);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.all('/*', function(req, res, next) {
  // CORS headers
  res.header('Access-Control-Allow-Origin', '*'); // restrict it to the required domain
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  // Set custom headers for CORS
  res.header('Access-Control-Allow-Headers', 'Origin,Accept,X-Requested-With,Content-Type,Access-Control-Request-Method,Access-Control-Request-Headers,Authorization');
  if (req.method == 'OPTIONS') {
    res.status(200).end();
  } else {
    next();
  }
});

// Auth Middleware - This will check if the token is valid
app.all('/*', [require('./middlewares/validateRequest')]);

app.use('/', require('./routes'));

app.use(function(err, req, res, next) {
  if (err) {
    logger.error('err:::%j',err);
    res.status(412)
    res.json({
      "message" : err
    });
    return;
  } else next();
});

// If no route is matched by now, it must be a 404
app.use(function(req, res, next) {
  var errorMessage = 'Not Found(undefined api check your request for get/post)';
  logger.error(errorMessage);
  res.status(404);
  res.json({
    "message": errorMessage
  });
  return;
});
 
// Start the server
app.set('port', process.env.PORT || config.app.port);
 
var server = app.listen(app.get('port'), function() {
  logger.info(config.app.title + ' listening on port ' + server.address().port);
});