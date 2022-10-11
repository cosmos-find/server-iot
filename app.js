var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);
var aWss = expressWs.getWss('/');
const hostname = '0.0.0.0'
const port = 9002;
var cors = require('cors');

app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
    console.log('middleware');
    req.testing = 'testing';
    return next();
});

const ID_ROOM_0 = "ROOM0";
const ID_ROOM_1 = "ROOM1";
const ID_ROOM_2 = "ROOM2";
const ID_ROOM_3 = "ROOM3";
const ACN_MODE_COOLING = "COOLING";
const ACN_MODE_HEATING = "HEATING";

let users = [
]

let devices = [
    {
        "deviceId" : "LED000",
        "deviceType" : "led",
        "status" : true,
        "brightness" : 255,
        "colorMode": false,
        "location" : ID_ROOM_0,
    },
    {
        "deviceId" : "LED001",
        "deviceType" : "led",
        "status" : true,
        "brightness" : 255,
        "colorMode": false,
        "location" : ID_ROOM_1,
    },
    {
        "deviceId" : "LED002",
        "deviceType" : "led",
        "status" : true,
        "brightness" : 255,
        "colorMode": false,
        "location" : ID_ROOM_2,
    },
    {
        "deviceId" : "LED003",
        "deviceType" : "led",
        "status" : true,
        "brightness" : 255,
        "colorMode": false,
        "location" : ID_ROOM_3,
    },
    {
        "deviceId" : "ACN000",
        "deviceType" : "aircon",
        "status" : false,
        "targetTemp" : 23.5,
        "currentTemp": 24.5,
        "mode" : ACN_MODE_COOLING,
        "power" : 255,
        "location" : ID_ROOM_0,
    },
    {
        "deviceId" : "ACL000",
        "deviceType" : "aircleaner",
        "status" : false,
        "colorR" : 255,
        "colorG" : 255,
        "colorB" : 255,
        "power" : 255,
        "location" : ID_ROOM_0,
    }
]

app.get('/User', (req, res)=>{
    console.log('GET /User');
    res.send(JSON.stringify(users));
});

app.post('/User', (req, res)=>{
    console.log('POST /User', req.body);
    let data = req.body;
    if(typeof(data) == 'string') {
        data = JSON.parse(data);
    }

    let userId = "USR" + ("000" + users.length).slice(-3);
    users.push(
        {
            "userId" : userId,
            "userName" : data.userName,
            "userContext" : {            
                "isExercising": false,
                "isSleeping" : false,
                "location" : ID_ROOM_0,
            },
            "contextSetting" : {
                "ROOM0" : {
                    "trainingModeBrightness" : 255,
                    "trainingModeTemperature" : 22.5,
                    "trainingModeAirCleanerStatus" : true,
                    "sleepingModeBrightness" : 50,
                    "sleepingModeTemperature" : 24.5,
                    "sleepingModeAirCleanerStatus" : false,
                },
                "ROOM1" : {
                    "trainingModeBrightness" : 255,
                    "trainingModeTemperature" : 22.5,
                    "trainingModeAirCleanerStatus" : true,
                    "sleepingModeBrightness" : 50,
                    "sleepingModeTemperature" : 24.5,
                    "sleepingModeAirCleanerStatus" : false,
                },
                "ROOM2" : {
                    "trainingModeBrightness" : 255,
                    "trainingModeTemperature" : 22.5,
                    "trainingModeAirCleanerStatus" : true,
                    "sleepingModeBrightness" : 50,
                    "sleepingModeTemperature" : 24.5,
                    "sleepingModeAirCleanerStatus" : false,
                },
                "ROOM3" : {
                    "trainingModeBrightness" : 255,
                    "trainingModeTemperature" : 22.5,
                    "trainingModeAirCleanerStatus" : true,
                    "sleepingModeBrightness" : 50,
                    "sleepingModeTemperature" : 24.5,
                    "sleepingModeAirCleanerStatus" : false,
                },
            }
        }
    );
    res.send(users.find(user=>user.userId==userId));
});

app.put('/User', (req, res)=>{
    console.log('PUT /User', req.body);
    let data = req.body;
    if(typeof(data) == 'string') {
        data = JSON.parse(data);
    }

    let index = users.findIndex(user => user.userId == data.userId);
    users[index] = data;
    res.send(users[index]);
});

app.patch('/UserContext', (req, res)=>{
    console.log('PATCH /UserContext', req.body);
    let data = req.body;
    if(typeof(data) == 'string') {
        data = JSON.parse(data);
    }

    let user = users.find(user => user.userId == data.userId);
    if(!user.userContext.isExercising && data.userContext.isExercising) {
        console.log(`${user.userId} : has started exercising.`);
        let aircon = devices.find(device => {device.location == data.userContext.location && device.deviceType == 'aircon'});
        if(aircon) {
            aircon.status = true;
            broadCastMessage(aircon);
        }

        let aircleaner = devices.find(device => {device.location == data.userContext.location && device.deviceType == 'aircleaner'});
        if(aircleaner && user.contextSetting[data.userContext.location].trainingMode.airCleanerStatus) {
            aircleaner.status = true;
            broadCastMessage(aircleaner);
        }
    }

    if(!user.userContext.isSleeping && data.userContext.isSleeping) {
        console.log(`${user.userId} : has started sleeping.`);
        let led = devices.find(device => {device.location == data.userContext.location && device.deviceType == 'led'});
        if(led) {
            led.status = false;
            broadCastMessage();
        }
    }

    user.userContext.isExercising = data.userContext.isExercising;
    user.userContext.isSleeping = data.userContext.isSleeping;
    user.userContext.location = data.userContext.location;
    res.send(user);
});

app.ws('/', (ws, req) => {
    console.log('WS: Someone connected');
    ws.on('message', handleMessage);
});

const handleMessage = (message) => {
    console.log('Websocket Req:', message);

    // let res = {};
    // if(message === "on") {
    // broadCastMessage(JSON.stringify(res));
    // console.log('Broadcast', res);
};

const broadCastMessage = (message) => {
    if(message.status) {
        message.status = 'on';
    }
    else {
        message.status = 'off';
    }
    message = JSON.stringify(message);
    aWss.clients.forEach(function (client) {
        client.send(message);
    });
};

console.log(`Server is running on http://${hostname}:${port}/`);
app.listen(port, hostname);