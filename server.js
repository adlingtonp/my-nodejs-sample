// server.js
// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express'); 		// call express
var app        = express(); 				// define our app using express
var cookieParser = require('cookie-parser');
var session      = require('express-session');
var Q = require('q');
var fs = require("fs");
var Maximo = require('ibm-maximo-api');  // Reference to Maximo OSLC API
const minimist = require('minimist');

var port = process.env.PORT || 3000;  // set port,use 3000 for now

var ver = "v1"; // our API version

app.use(cookieParser());

app.use(session({
	secret: '&25653666%^',
	resave: true,
	saveUninitialized: true
}));

// Input arguments sent from command line
// Can change default so don't have to enter on command line every time
// hostname : 'ec2-3-106-127-28.ap-southeast-2.compute.amazonaws.com',
//hostname : 'maximo-demo75.mro.com',
let args = minimist(process.argv.slice(2), {
	string: [ 'hostname', 'port', 'user', 'password', 'authtype' ],
	integer: [ 'islean' ],
    alias: {
        h: 'hostname',
		    p: 'port',
		    u: 'user',
        w: 'password',
        l: 'islean',
        t: 'authtype'
    },
	default: {
        hostname : 'ec2-3-106-127-28.ap-southeast-2.compute.amazonaws.com',
		    port : '',
		    user : 'maxadmin',
		    password : 'maxadmin',
        islean : 1,
        authtype : 'maxauth'
  }
});

console.log('args:', args);  


// ROUTES FOR OUR API
// =============================================================================
// Create basics for maximo instance and router --------------------------------
var router = express.Router(); 				// get an instance of the express Router


// middleware to use for all requests
router.use(function(req, res, next)
{
	console.log('Request received by node middleware ...');
	next(); // make sure we go to the next routes and don't stop here
});

// Maximo connection details
var options = {
        protocol: 'http',
        hostname: args.hostname,
        port: args.port,
        user: args.user,
        password: args.password,
        auth_scheme: '/maximo',
        authtype: args.authtype,
		    islean: args.islean
    };

	
// -----------------------------------------------------------------------------

// Authentication for maximo instance ------------------------------------------
router.get('/authenticate', function(req, res)
{
      var maximo = new Maximo(options);
      maximo.authenticate()
            .then(function(setcookie)
            {
              jsondata = setcookie;
              req.session.authcookie = jsondata; // Set the cookie in the session so we can use it for future requests
              res.json(jsondata);
            })
            .fail(function (error)
            {
                  console.log('****** Error Code = '+error);
            });
});




//Read specific WO by WONUM ----------------------------------------------------
router.get('/read_a_WO/:woNum', function(req, res)
{
      var theWoNum = req.params.woNum;
      var maximo = new Maximo(options);
      maximo.resourceobject("MXWODETAIL")
          .select(["wonum","description","location","status"])
          .where("wonum").equal(theWoNum)
          .orderby('wonum','desc')
          .fetch()
          .then(function(resourceset)
              {
				jsondata = resourceset.thisResourceSet();
                res.json(jsondata);
				uri = jsondata[0]["href"];
              })
          .fail(function (error)
          {
                console.log('****** Error Code = '+error);
          });
});
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------

//Read specific WO by WONUM ----------------------------------------------------
router.get('/read_1_WO', function(req, res)
{
      var maximo = new Maximo(options);
      maximo.resourceobject("MXWODETAIL")
          .select(["wonum","description","location","status"])
          .where("wonum").equal("1018")
          .orderby('wonum','desc')
          .fetch()
          .then(function(resourceset)
              {
				jsondata = resourceset.thisResourceSet();
                res.json(jsondata);
				uri = jsondata[0]["href"];
              })
          .fail(function (error)
          {
                console.log('****** Error Code = '+error);
          });
});
// -----------------------------------------------------------------------------


// Creates a WOrkorder  --------------------------------------------------------
// In required section, fill in information about WO
router.get('/create_WO', function(req, res)
{
  var wo = '';
  var required =
  {
	"description": "Created from API",
	"siteid": "BEDFORD",
	"wonum": "A123A"
	}
  var authcookie = req.session.authcookie;
  var maximo = new Maximo(options,authcookie);

  maximo.resourceobject("MXWODETAIL")
        .create(required,["spi:wonum","spi:description"])
        .then(function(resource)
              {
                jsondata = resource.JSON();
                res.json(jsondata);
              })
          .fail(function (error)
          {
                console.log('****** Error Code = '+error);
          });
});
// -----------------------------------------------------------------------------

// Read first 20 WOs by descending WONUM at site BEDFORD -----------------------
router.get('/read_WOs', function(req, res)
{
      var maximo = new Maximo(options);
      maximo.resourceobject("MXWODETAIL")
          .select(["wonum","description","location","status"])
          .where("status").in(["WAPPR","APPR"])
		  .and("siteid").equal('BEDFORD')
          .orderby('wonum','desc')
          .pagesize(20)
          .fetch()
          .then(function(resourceset)
              {
                jsondata = resourceset.thisResourceSet();
                res.json(jsondata);
              })
          .fail(function (error)
          {
                console.log('****** Error Code = '+error);
          });
});
// -----------------------------------------------------------------------------

// Updates a WOrkorder ---------------------------------------------------------
// Run read_1_WO route with specific WONUM to get URI first
// Add updates to WO in updates section
router.get('/update_WO', function(req, res)
{
  var updates =
  {
      "spi:description":"Updated from Node API - test crudconnector"
  }

  var URI = uri;
  var authcookie = req.session.authcookie;
  var maximo = new Maximo(options,authcookie);
  
  
  maximo.resourceobject("MXWODETAIL")
        .resource(URI) //Pass the URI
        .update(updates,["spi:description"])
        .then(function(resource)
              {
                var jsondata = resource.JSON();
                res.json(jsondata);
              })
          .fail(function (error)
          {
                console.log('****** Error Code = '+error);
          });
});
// -----------------------------------------------------------------------------

// Deletes a WOrkorder ---------------------------------------------------------
// Run read_1_WO route with specific WONUM to get URI first
router.get('/delete_WO', function(req, res)
{
  var updates =
  {
  }

  var URI = uri;
  var authcookie = req.session.authcookie;
  var maximo = new Maximo(options);

  maximo.resourceobject("MXWODETAIL")
        .resource(URI) //Pass the URI
        .delete(updates,["spi:wonum","spi:description"])
        .then(function(resource)
              {
                var jsondata = resource.JSON();
                res.json(jsondata);
              })
          .fail(function (error)
          {
                console.log('****** Error Code = '+error);
          });
});
// -----------------------------------------------------------------------------



// REGISTER ROUTES -------------------------------------------------------------
// all routes will be prefixed with /api/ver/
// in this case, go to localhost:3000/api/v1/read_1_WO to start

app.use('/api/'+ver, router);
// -----------------------------------------------------------------------------

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Maximo Node API server is running on port ' + port);
console.log('API version is ' + ver);

function getFileBytes(path)
{
    var deferred = Q.defer();
    var fileSize = 0
    var buf = new Buffer(fileSize);
    // ******** Start buffering the file bytes **********************
    fs.stat(path, function (err, stats)
    {
        if (err)
        {
           return console.error(err);
        }
        console.log(stats.size);
        fileSize = stats.size;
        buf = new Buffer(fileSize);
        var actualBytes = 0;
        fs.open(path, 'r', function(err, fd)
        {
            if (err)
            {
               return console.error(err);
            }
            console.log("Reading ... ");
            fs.read(fd, buf, 0, buf.length, 0, function(err, bytes)
            {
                if (err)
                {
                   console.log(err);
                }
                console.log(bytes + " bytes read");
                console.log("Actual Buffer Size: "+buf.slice(0,bytes).length);
                deferred.resolve(buf.slice(0,bytes));
                //return buf.slice(0,bytes);
            });
            // Close the opened file.
            fs.close(fd, function(err)
            {
               if (err){
                  console.log(err);
               }
               console.log("File closed successfully.");
            });
        });
        //*******  End buffering file bytes ******
    });
    return deferred.promise;
}
