# booking-with-google-calender-api-and-nodejs
Appointment Scheduling with Google Calender API and Node JS

## App Installation:
npm install

## Start application:
npm start

## To use your own Google Calender API Credentials please change file below
> ./credentials.js

## To change port please refer to server.js file in bottom section
> port used currently: 8081

## Requirements:

- All appointments are 40 minutes long and have fixed times, starting from 9–9:40 am
- Ensure there is always a 5 minute break in between each appointment
- Appointments can only be booked during weekdays from 9 am to 6 pm
- Bookings can only be made at least 24 hours in advance
- Appointments cannot be booked in the past
- For simplicity, use UTC time for all bookings and days and ISO 8601 format for timeslots 


## Endpoints 

### GET bookable days
Requires a year and month. Note that months must not be zero-indexed.

> __GET__  /days?year=yyyy&month=mm

Returns an array of all days in the specified month, each of which has the field hasTimeSlots, which is false if there are no time slots available, based on the requirements listed above.

```
{
  "success": true,
  "days": [
    { "day": 1,  "hasTimeSlots": false },
    ...
    { "day": 31, "hasTimeSlots": true }
  ]
}
```

#### GET available time slots

Requires a year, month, and day.

> __GET__  /timeslots?year=yyyy&month=mm&day=dd

Returns a list of all 40-minute time slots available for that day as an array of objects that contain a startTime and endTime in ISO 8601 format.

```
{
  "success": true,
  "timeSlots": [
    {
      "startTime": "2019-09-04T09:00:00.000Z",
        "endTime": "2019-09-04T09:40:00.000Z"
    },
    {
      "startTime": "2019-09-04T09:45:00.000Z",
        "endTime": "2019-09-04T10:25:00.000Z"
    },
    ...
  ]
}
```

### POST book an appointment

Requires a year, month, day, hour, and minute.

> __POST__  /book?year=yyyy&month=MM&day=dd&hour=hh&minute=mm

Returns a boolean field success. If the booking was successful, also return startTime and endTime.

If not successful, return a message, a string for the error message.

```
// Success
{
    "success": true,
  "startTime": "2019-09-04T10:30:00.000Z",
    "endTime": "2019-09-04T11:10:00.000Z"
}

// Fail
{
    "success": false,
    "message": "Invalid time slot"
}
```

### Error messages for this POST request are:

- Invalid time slot: The time slot provided was not one of the time slots returned in the GET available time slots request
- Cannot book with less than 24 hours in advance
- Cannot book outside bookable timeframe: The time slot provided was not on a weekday between 9 am and 5 pm
- Cannot book time in the past

Error messages for ALL endpoints should be in this format:

```
{
    "success": false,
    "message": "Invalid time slot"
}

```

Where message contains the corresponding error message, such as Request is missing parameter: year
