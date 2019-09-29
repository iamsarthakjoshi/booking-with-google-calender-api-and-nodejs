// Dependency setup
const express = require('express'),
      moment = require('moment'),
      {google} = require('googleapis')
      config = require('./credentials');

// Initialization
var app = express(),
    calendar = google.calendar('v3'),
    credentials = config.credentials;
    oAuthClient = new google.auth.OAuth2(
                      credentials.clientID, 
                      credentials.clientSecret, 
                      credentials.redirectURL),
    authorized = false;

// Response for localhost:
app.get('/', function(req, res) {
  // If we're not authenticated, fire off the OAuth flow
  if (!authorized) {
    // Generate an OAuth URL and redirect there
    var url = oAuthClient.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/calendar.readonly'
    });
    res.redirect(url);
  } 
  else {
    // Call google to fetch events for today on our calendar
    calendar.events.list({
      calendarId: 'primary',
      maxResults: 20,
      timeMin: '2019-09-01T00:00:00.000Z',
      timeMax: '2019-09-30T00:00:00.000Z',
      auth: oAuthClient
    }, function(err, response) {
      if(err) 
        console.log(`Error fetching events: ${err}`);
      else 
      {
        // Send our JSON response back to the browser
        console.log(`Successfully fetched events`);

        // for debugging
        if (response.length) {
          console.log(`Upcoming 10 events:`);
          const events = response.data.items;
          events.map((event, i) => {
            const start = event.start.dateTime || event.start.date;
            console.log(`${start} - ${event.summary}`);
          });
        }

        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify(response.data.items, null, 2));
      } 
    });
  }
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
          authorized = true;
          res.redirect('/');
        }
      });
    } 
});

if (module === require.main) {
  // Start the server
  const server = app.listen(process.env.PORT || 8081, () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
}