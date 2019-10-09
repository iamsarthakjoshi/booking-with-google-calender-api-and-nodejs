/*
  Author: Sarthak Joshi
  Email: iamsarthakjoshi@gmail.com
*/

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
    redirectUrl = '/',
    availableTimeSlots= [];

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
      scope: 'https://www.googleapis.com/auth/calendar'
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
      maxResults: 30,
      timeMin: new Date(startDate).toISOString(),
      timeMax: new Date(endDate).toISOString(),
      auth: oAuthClient,
      singleEvents: true,
      orderBy: 'startTime'
    }, function(err, response) {
      if(err) {
        console.log(`Error fetching appointments: ${err}`);
      } else {
      // Send our JSON response back to the browser
        console.log('Successfully fetched appointments');
        var events = response.data.items; // get response from google calender api
        var countAppointment = 0;
        var output = {"success": false, "days": []};

        // filter Canceled Events, Excludes Weekends, Excludes < 9am && > 6pm time slots 
        var bookedAppoinements = events.filter(data => 
                        data.status=='confirmed' &&
                        (new Date(data.start.dateTime).getUTCDay()!=0 && 
                        new Date(data.start.dateTime).getUTCDay()!=6)
                        && (moment(data.start.dateTime).utc().hours() > 8 
                        && moment(data.start.dateTime).utc().hours() < 20));
  
        
        for(i = 1; i <= totalNoOfDays; i++){ // loop through all days of that month
          countAppointment = 0; // re-setting count to 0 to exclude unmatched datetimes
          bookedAppoinements.map((event, c) => { // map through filtered events/appointments
            var dateOnly = event.start.dateTime;
            dateOnly = dateOnly.substring(0, dateOnly.indexOf('T')+1); // get date with yyyy-mm-ddT iso format
            var start = event.start.dateTime || event.start.date;
            if(i == new Date(start).getUTCDate()){ // check if dates match with filtered event's datetimes
              fixedTimeSlots.forEach((d,c)=>{ // loop through given fixed timeslots
                if(moment(dateOnly+d.start).isSame(start)){ // if fixed timeslots matches with filtered datetimes
                  countAppointment++;
                }
              });
            }
          });

          // push timeslot avaibility in output object
          if(countAppointment < 12)
            output.days.push({"day": i, "hasTimeSlots": true});
          else
            output.days.push({"day": i, "hasTimeSlots": false});
        }

        // set output data
        output.success = true;

        // Send JSON response back to the browser
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
      scope: 'https://www.googleapis.com/auth/calendar'
    });

    // reformat the fixed timeslots in ISO format
    // from 09:00:00.000Z to 2019-10-16T09:00:00.000Z
    fixedTimeSlots.forEach((d,c)=>{
      fixedTimeSlots[c].start = `${year}-${month+1}-${day}T${d.start}`;
      fixedTimeSlots[c].end = `${year}-${month+1}-${day}T${d.end}`;
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
        console.log(`Error fetching available timeslots: ${err}`);
      } else {
        console.log('Successfully fetched available timeslots');
        var events = response.data.items; // get response from google calender api
        var output = {"success": false};
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
            if(moment(fixedTS.start).isSame(start))
              bookedTimeSlots.push(fixedTS);
          })
        });

        // get available timeslots by comparing fixed and booked timeslots
        availableTimeSlots = fixedTimeSlots.filter(function(item) {
          return !bookedTimeSlots.includes(item);
        })

        // generate output data
        console.log(availableTimeSlots)
        output.success = true;
        output.timeSlots = availableTimeSlots;

        // Send JSON response back to the browser
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify(output, null, 2));
      }
    });
  }
});

// book appointment time for given time, day, month and year
app.get('/book', function(req, res) {
  const year = req.query.year,
        mm = req.query.month,
        month = (mm.toString().length < 2 ? '0': '') + mm,
        day = (req.query.day.length < 2 ? '0': '') + req.query.day,
        hour = (req.query.hour.length < 2 ? '0': '') + req.query.hour,
        minute = (req.query.minute.length < 2 ? '0': '') + req.query.minute,
        fullDateTime = `${hour}:${minute} ${day}/${month}/${year}`,
        reqDateTimeISO = moment(`${year}-${month}-${day}T${hour}:${minute}:00.000Z`); // requested datetime in ISO
  var output = {'success': false};
  redirectUrl = `/book?year=${year}&month=${month}&day=${day}&hour=${hour}&minute=${minute}`;

  if(!authorized){
    // Generate an OAuth URL and redirect there
    var url = oAuthClient.generateAuthUrl({
     access_type: 'offline',
     scope: 'https://www.googleapis.com/auth/calendar'
   });
   res.redirect(url);
  }else{
    // var a = availableTimeSlots.includes(availableTimeSlots.find(slot=>moment(slot.start).isSame(reqDateTimeISO)));

    // check if request booking time matches with available time slots
    var isValidTimeSlot = availableTimeSlots.some(slot=>moment(slot.start).isSame(reqDateTimeISO));
    // get first and last appointment's starting time - *Note: please navigation to bottom line
    var firstAppST = moment(fixedTimeSlots[0].start);
    var lastAppST = moment(fixedTimeSlots[11].start);
    
    // declare error message for POST requests
    const invalidTime = 'Invalid time slot';
          pastTime = 'Cannot book time in the past';
          lessThan24hr = 'Cannot book with less than 24 hours in advance';
          isBetween = 'Cannot book outside bookable timeframe: The time slot '+
                      'provided was not on a weekday between 9 am and 6 pm';

    // check every given conditions and set corresponding error messages
    if(reqDateTimeISO.isBefore(moment()))
      output.message = pastTime;
    else if(moment.duration(reqDateTimeISO.diff(moment())).asHours() < 24)
      output.message = lessThan24hr;
    else if(!reqDateTimeISO.isBetween(firstAppST, lastAppST, 'hours', '[]'))
      output.message = isBetween;
    else if(!isValidTimeSlot)
      output.message = invalidTime;
    else {
      // get available time for requested date-time
      var availableTimeSlot = availableTimeSlots.filter(slot => moment(slot.start).isSame(reqDateTimeISO));

      var startTime = availableTimeSlot[0].start; // start-time of appointment
      var endTime = availableTimeSlot[0].end; // end-time of appointment
      
      // set data for new appointment
      var newAppointment = {
        'summary' : `Appoinment for Mr/Ms Zz at ${fullDateTime}`,
        'location' : `zzDigitalzz zzAngelszz, Sydney, Australia`,
        'description' : '',
        'start' : {'dateTime': startTime},
        'end' : {'dateTime': endTime}
      }

      // wait until new appointment time is inserted in google calendar
      var insertPromise = new Promise((reslove, reject) => {
        // insert new appointment time in bookings google calendar
        calendar.events.insert({
          calendarId: '15suli79te2e0qfd533pcb8q4g@group.calendar.google.com',
          auth: oAuthClient,
          resource: newAppointment,
        }, (err, response) => {
          if(err) {
            output.message = `There was an error contacting the Calendar service: ${err}`;
            console.log(err);
            reject('Error booking new appointment.')
          } else {
            reslove('New appointment booked.')
            // set output data
            output.success = true;
            output.startTime = startTime;
            output.endTime = endTime;
          }
        }); 
      });

      // display output when insertPromise process is completed
      insertPromise.then(()=>{
        // Send JSON response back to the browser
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify(output, null, 2));
      });
    }
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

/* Note: As per the requirement 
"Invalid time slot: The time slot provided was not one of the -
time slots returned in the GET available time slots request", 
I have used fixedTimeSlots object values which only gets 
ISOFormatted after user search for available timeslots.
So, it does not work as expected before hitting timeslots avaibility request. 

Also, availableTimeSlots object is populated during timeslots avaibility request, 
which is then and also used while booking appoinment.

If these object shouldn't be tightly coupled, then fixedTimeSlots and 
availableTimeSlots should be populated during booking appoinments, 
which is of course doable.
 */