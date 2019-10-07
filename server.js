// Dependency setup
const express = require('express'),
      moment = require('moment'),
      {google} = require('googleapis'),
      config = require('./credentials'),
      timeslots = require('./timeslots'),
      fixedTimeSlots = timeslots.timeslots;

// Initialize
var app = express(),
    calendar = google.calendar('v3'),
    cred = config.credentials; // google credentials
    oAuthClient = new google.auth.OAuth2(cred.clientID, cred.clientSecret, cred.redirectURL),
    authorized = false,
    redirectUrl = '/';

// get avaibility of timeslots for each day in given month and year
app.get('/days', function(req, res) {
  var year = req.query.year;
  var month = req.query.month-1;
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

    console.log(`
    startDate: ${startDate}   
    enddate: ${endDate}
    iso.sartDate: ${new Date(startDate).toISOString()}
    iso.endDate: ${new Date(endDate).toISOString()}
    day: ${new Date().getDay()}  month: ${new Date().getMonth()}
    `)

    // Call google to fetch events for today on our calendar
    calendar.events.list({
      calendarId: '15suli79te2e0qfd533pcb8q4g@group.calendar.google.com',
      maxResults: 30,
      timeMin: new Date(startDate).toISOString(),
      timeMax: new Date(endDate).toISOString(),
      auth: oAuthClient,
      singleEvents: true,
      orderBy: 'startTime'
    }, function(err, response) {
      if(err) {
        console.log('Error fetching events');
        console.log(err);
      } else {
      // Send our JSON response back to the browser
        console.log('Successfully fetched events');
        console.log('Upcoming 10 events:');
        var events = response.data.items;
        
        // filter Canceled Events, Excludes Weekends, Excludes < 9am && > 6pm time slots 
        var filteredEvents = events.filter(data => 
                        data.status=='confirmed' &&
                        (new Date(data.start.dateTime).getUTCDay()!=0 && 
                        new Date(data.start.dateTime).getUTCDay()!=6)
                        && (moment(data.start.dateTime).utc().hours() > 8 
                        && moment(data.start.dateTime).utc().hours() < 20));
   
        // map through confirmed events
        filteredEvents.map((event, i) => {
          var start = event.start.dateTime || event.start.date;
          console.log(`${i+1}) ${start} - ${new Date(start).getUTCDate()} - ${new Date(start).getDay()} - ${moment(start).utc().hours()}hrs - ${event.summary}`);
        });

        var countAppointment = 0;
        const output = {"success": false, "days": []};
        for(i = 1; i <= totalNoOfDays; i++){
          countAppointment = 0;
          filteredEvents.map((event, c) => {
            var dateOnly = event.start.dateTime;
            dateOnly = dateOnly.substring(0, dateOnly.indexOf('T')+1);
            var start = event.start.dateTime || event.start.date;
            if(i == new Date(start).getUTCDate()){
              appTimeslots.forEach((d,c)=>{
                if(moment(dateOnly+d.start).isSame(start)){
                  countAppointment++;
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
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify(output, null, 2));
      } 
    });
  }
});

// get available timeslots for given day, month and year
app.get('/timeslots', function(req, res) {
  const year = req.query.year;
  const month = req.query.month-1;
  const day = req.query.day;
  redirectUrl = `/timeslots?year=${year}&month=${month+1}&day=${day}`;
  var startTime = new Date(year, month, day, 9, 30);
  var endTime =new Date(year, month + 1, day, 18, 30);
  
  if(!authorized){
     // Generate an OAuth URL and redirect there
     var url = oAuthClient.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/calendar.readonly'
    });
    res.redirect(url);
  }else{
    calendar.events.list({
      calendarId: '15suli79te2e0qfd533pcb8q4g@group.calendar.google.com',
      maxResults: 30,
      timeMin: new Date(startTime).toISOString(),
      timeMax: new Date(endTime).toISOString(),
      auth: oAuthClient,
      singleEvents: true,
      orderBy: 'startTime'
    }, function(err, response) {
      if(err) {
        console.log(`Error fetching events ${err}`);
      } else {
        console.log('Successfully fetched events');
        // reformat the fixed timeslots in ISO format
        // from 09:00:00.000Z to 2019-10-16T09:00:00.000Z
        fixedTimeSlots.forEach((d,c)=>{
          fixedTimeSlots[c].start = `${year}-${month+1}-${day}T${d.start}`;
          fixedTimeSlots[c].end = `${year}-${month+1}-${day}T${d.end}`;
        });

        var events = response.data.items; // get response from google calender api
        var output = {"success": false, "timeSlots": []};
        var bookedTimeSlots=[];

        // filter Canceled Events, Excludes Weekends, Excludes < 9am && > 6pm time slots 
        var bookedAppoinements = events.filter(data => 
          data.status=='confirmed' &&
          (new Date(data.start.dateTime).getUTCDay()!=0 && 
          new Date(data.start.dateTime).getUTCDay()!=6)
          && (moment(data.start.dateTime).utc().hours() > 8 
          && moment(data.start.dateTime).utc().hours() < 18));

          // map through bookedAppoinements to get start/end time of the booked appointments
          bookedAppoinements.map((appoinemnt, i) => {
          var start = appoinemnt.start.dateTime || appoinemnt.start.date;
          var end = appoinemnt.end.dateTime || appoinemnt.end.date;

          // make separate bookedTimeSlots array
          fixedTimeSlots.forEach((fixedTS,j)=>{
            if(moment(fixedTS.start).isSame(start)){
              bookedTimeSlots.push(fixedTS);
            }
          })
        });

        // get available timeslots by comparing fixed and booked timeslots
        var availableTimeSlots = fixedTimeSlots.filter(function(item) {
          return !bookedTimeSlots.includes(item);
        })

        // generate output data
        console.log(availableTimeSlots)
        output.success = true;
        output.timeSlots.push(availableTimeSlots);

        // Send JSON response back to the browser
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify(output, null, 2));
      }
    });
  }
});

// book appointment time for given time, day, month and year
app.post('/book', function(req, res) {
  const year = req.query.year;
  const month = req.query.month - 1;
  const day = req.query.day;
  const hour = req.query.hour;
  const minute = req.query.minute;
  redirectUrl = `/timeslots?year=${year}&month=${month+1}&day=${day}&hour=${hour}&minute=${minute}`;

  if(!authorized){
    // Generate an OAuth URL and redirect there
    var url = oAuthClient.generateAuthUrl({
     access_type: 'offline',
     scope: 'https://www.googleapis.com/auth/calendar.readonly'
   });
   res.redirect(url);
 }else{
    
 }
});

// Return point for oAuth flow, should match credentials.redirectURL
app.get('/oauth/callback', function(req, res) {
    var code = req.query.code;

    if(code) {
      // Get an access token based on our OAuth code
      oAuthClient.getToken(code, function(err, tokens) {
        if (err) {
          console.log(`Error authenticating ${err}`);
        } else {
          console.log('Successfully authenticated!!!!!');
          console.log(tokens);
          
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