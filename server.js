// Google OAuth Configuration
var googleConfig = {
  clientID: '200692833635-6dir4ef3c15fhuphe8jnq76ldcjttq32.apps.googleusercontent.com',
  clientSecret: 'QS_SmuC2lHqcjGId1FB8FYJs',
  project_id: 'ma-nodejs-1569312384727',
  redirectURL: 'http://localhost:8081/myauth'
};

// Dependency setup
const express = require('express'),
  moment = require('moment'),
  {google} = require('googleapis');

// Initialization
var app = express(),
  calendar = google.calendar('v3'),
  oAuthClient = new google.auth.OAuth2(googleConfig.clientID, googleConfig.clientSecret, googleConfig.redirectURL),
  authed = false;

// Response for localhost:2002/
app.get('/', function(req, res) {
  res.send("hello there world!");
});

// Return point for oAuth flow, should match googleConfig.redirectURL
app.get('/myauth', function(req, res) {

    var code = req.param('code');

    if(code) {
      // Get an access token based on our OAuth code
      oAuthClient.getToken(code, function(err, tokens) {

        if (err) {
          console.log('Error authenticating')
          console.log(err);
        } else {
          console.log('Successfully authenticated!!!!!');
          console.log(tokens);
          
          // Store our credentials and redirect back to our main page
          oAuthClient.setCredentials(tokens);
          authed = true;
          res.redirect('/');
        }
      });
    } 
});

if (module === require.main) {
  // [START server]
  // Start the server
  const server = app.listen(process.env.PORT || 8081, () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
  // [END server]
}