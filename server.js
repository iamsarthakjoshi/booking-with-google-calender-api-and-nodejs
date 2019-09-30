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
    redirectUrl = '/';

// Response for localhost:
app.get('/days', function(req, res) {
  const year = req.query.year;
  const month = req.query.month-1;
  redirectUrl = `/days?year=${year}&month=${month+1}`;

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
    var startDate = new Date(year, month, 1).toUTCString();
    var endDate =new Date(year, month + 1, 0).toUTCString();


    // Call google to fetch events for today on our calendar
    calendar.events.list({
      calendarId: 'primary',
      maxResults: 20,
      timeMin: new Date(startDate).toISOString(),
      timeMax: new Date(endDate).toISOString(),
      auth: oAuthClient
    }, function(err, response) {
      if(err) 
        console.log(`Error fetching events: ${err}`);
      else 
      {
        console.log(`Successfully fetched events`);

        const events = response.data.items;

        // filter Canceled Events, Excludes Weekends, Excludes < 9am && > 6pm time slots 
        const filteredEvents = events.filter(data => data.status=='confirmed' &&
                              (new Date(data.start.dateTime).getDay()!=0 && 
                              new Date(data.start.dateTime).getDay()!=6)
                              && (new Date(data.start.dateTime).getHours() > 8 
                              && new Date(data.start.dateTime).getHours() < 18));

        // filter events which exists between 9am - 6pm incl.

        // map through confirmed events
        filteredEvents.map((event, i) => {
          const start = event.start.dateTime || event.start.date;
          console.log(`${i}) ${start} - ${new Date(start).getDay()} - ${new Date(start).getHours()}hrs - ${event.summary}`);
        });
        
        // Send JSON response back to the browser
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify(filteredEvents, null, 2));
      } 
    });
  }
});

// Return point for oAuth flow, should match googleConfig.redirectURL
app.get('/oauth/callback', function(req, res) {

    var code = req.param('code');

    if(code) {
      // Get an access token based on our OAuth code
      oAuthClient.getToken(code, function(err, tokens) {

        if (err) {
          console.log(`Error authenticating: ${err}`);
        } else {
          console.log('Successfully authenticated!!!!!');
          
          // Store our credentials and redirect back to our main page
          oAuthClient.setCredentials(tokens);
          authorized = true;
          res.redirect(redirectUrl);
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