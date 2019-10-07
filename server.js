// Dependency setup
const express = require('express'),
      moment = require('moment'),
      {google} = require('googleapis'),
      config = require('./credentials'),
      timeslots = require('./timeslots'),
      appTimeslots = timeslots.timeslots;

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
    var startDate = new Date(year, month, 1);
    var endDate =new Date(year, month + 1, 0);
    var totalNoOfDays = endDate.getDate();

    // Call google to fetch events for today on our calendar
    calendar.events.list({
      calendarId: '15suli79te2e0qfd533pcb8q4g@group.calendar.google.com',
      maxResults: 20,
      timeMin: new Date(startDate).toISOString(),
      timeMax: new Date(endDate).toISOString(),
      auth: oAuthClient,
      singleEvents: true,
      orderBy: 'startTime'
    }, function(err, response) {
      if(err) 
        console.log(`Error fetching events: ${err}`);
      else 
      {
        console.log(`Successfully fetched events`);

        const events = response.data.items;

        // filter Canceled Events, Excludes Weekends, Excludes < 9am && > 6pm time slots 
        var filteredEvents = events.filter(
            data => data.status=='confirmed' &&
            (new Date(data.start.dateTime).getUTCDay()!=0 && 
            new Date(data.start.dateTime).getUTCDay()!=6)
            && (moment(data.start.dateTime).utc().hours() > 8 
            && moment(data.start.dateTime).utc().hours() < 20)
          );

        // map through confirmed events
        // filteredEvents.map((event, i) => {
        //   const start = event.start.dateTime || event.start.date;
        //   console.log(`${i}) ${start} - ${new Date(start).getDay()} - ${new Date(start).getHours()}hrs - ${event.summary}`);
        // });

        var countAppointment = 0;
        const output = {"success": false, "days": []};
        for(i = 1; i <= totalNoOfDays; i++){ // loop through all days of that month
          countAppointment = 0;
          filteredEvents.map((event, c) => { // map through filtered events
            var dateOnly = event.start.dateTime;
            dateOnly = dateOnly.substring(0, dateOnly.indexOf('T')+1); // get date with yyyy-mm-ddT iso format
            var start = event.start.dateTime || event.start.date;
            if(i == new Date(start).getUTCDate()){ // check if dates match with filtered event's date
              appTimeslots.forEach((d,c)=>{ // loop through given timeslots
                if(moment(dateOnly + d.start).isSame(start)){ // if fixed timeslots matches with filtered times
                  countAppointment++; // increase appointment count
                }
              });
            }
          });
          console.log(`day ${i} slots ${countAppointment}`)

          if(countAppointment < 12)
            output.days.push({"day": i, "hasTimeSlots": true});
          else
            output.days.push({"day": i, "hasTimeSlots": false});
        }
        output.success = true;
        
        // Send JSON response back to the browser
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify(output, null, 2));
        // res.send(JSON.stringify(output, null, 2));
      } 
    });
  }
});


app.get('/timeslots', function(req, res) {
  const year = req.query.year;
  const month = req.query.month-1;
  const day = req.query.day;
  redirectUrl = `/days?year=${year}&month=${month+1}&day=${day}`;


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


function authorizeCred() {
  
}


if (module === require.main) {
  // Start the server
  const server = app.listen(process.env.PORT || 8081, () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
}