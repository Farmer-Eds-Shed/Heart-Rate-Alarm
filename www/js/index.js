// (c) 2015 Don Coleman
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* global ble, statusDiv, beatsPerMinute */
/* jshint browser: true , devel: true*/

// See BLE heart rate service http://goo.gl/wKH3X7

//hard coded a web socket for test/debug of app

// ws create the websocket and returns it
function autoReconnect(ws_create){
    let ws = ws_create();
    function startReconnecting(){
        let interval = setInterval(()=>{
            console.log('trying')
            ws = ws_create();
            ws.onopen = () => {
                console.log('stop');
                ws.onclose = startReconnecting;
                clearInterval(interval);
            }
        }, 3000);
    }
    ws.onclose = startReconnecting;
}

let rc;
autoReconnect(()=>{
    rc = new WebSocket(
        'ws://192.168.1.22:1880/ws/hrm')
    return rc;
});



var heartRate = {
    service: '180d',
    measurement: '2a37'
};
let bpm;

//initialize slider from browser storage
if (window.localStorage.getItem('upper_bpm_slider') != null) {
        stored = window.localStorage.getItem('upper_bpm_slider')
        document.getElementById("upper_bpm_slider").value = stored;
    } 

//define slider
let slider = document.getElementById("upper_bpm_slider");
let output = document.getElementById("upper_bpm_value");
output.innerHTML = document.getElementById("upper_bpm_slider").value

//listen for slider changes
slider.oninput = function() {
    output.innerHTML = this.value;
    window.localStorage.setItem('upper_bpm_slider', this.value);
}


var app = {
    initialize: function() {
        this.bindEvents();
        connectedPage.hidden = true; //hides the HTML elements for the second page
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        refreshButton.addEventListener('touchstart', this.refreshDeviceList, false); //on touch of the Refresh button, runs refreshDeviceList function
		deviceList.addEventListener('touchstart', this.connect, false); //on touch of device list, connect to device
		//sendButton.addEventListener('touchstart', this.sendData, false);
		disconnectButton.addEventListener('touchstart', this.disconnect, false);


    },
    onDeviceReady: function() {
        app.refreshDeviceList();
        cordova.plugins.backgroundMode.enable();
    },
    refreshDeviceList: function() {
		deviceList.innerHTML = ''; // empties the list
		ble.scan([], 5, app.onDiscoverDevice, app.onError); //scans for BLE devices
	},
    onDiscoverDevice: function(device) {
		//only shows connectable devices 
		if(device.connectable === true) {
			//creates a HTML element to display in the app
			var listItem = document.createElement('li'),
			html = device.name + ' | ' +	device.id;
			listItem.innerHTML = html;
			listItem.dataset.deviceId = device.id;         //save the device ID in the DOM element
			listItem.setAttribute("class", "result");      //give the element a class for css purposes
			deviceList.appendChild(listItem);  //attach it in the HTML element called deviceList
        }

	},
    connect: function(e) {
        //cordova.plugins.backgroundMode.enable();
		//get the device ID from the DOM element
        deviceId = e.target.dataset.deviceId,

		//connect functions asks for the device id, a callback function for when succeeds and one error functions for when it fails
		ble.connect(deviceId, app.onConnect, app.onError);
        console.log(cordova.plugins.backgroundMode.isActive())
	},
    onConnect: function(peripheral) {
        app.status("Connected to " + peripheral.id);
        ble.startNotification(peripheral.id, heartRate.service, heartRate.measurement, app.onData, app.onError);
        app.showConnectPage();
    },
    disconnect: function(event) {
		ble.disconnect(deviceId, app.showStartPage, app.onError);
        app.onDisconnect(" by user")
	},
    onDisconnect: function(reason) {
        navigator.notification.beep(5);
        alert("Disconnected " + reason);
        beatsPerMinute.innerHTML = "...";
        app.status("Disconnected");
    },
    onData: function(buffer) {
        // assuming heart rate measurement is Uint8 format, real code should check the flags
        // See the characteristic specs http://goo.gl/N7S5ZS
        var data = new Uint8Array(buffer);
        beatsPerMinute.innerHTML = data[1];
        bpm = data[1];
        if (bpm > slider.value) {
            navigator.notification.beep(1);
        }
        rc.send(bpm);
        //BPM();
    },
    showStartPage: function() {
		startPage.hidden = false;
		connectedPage.hidden = true;
	},
	showConnectPage: function() {
        startPage.hidden = true;
		connectedPage.hidden = false;
	},
    onError: function(reason) {
        navigator.notification.beep(10);
        alert("There was an error " + reason);
    },
    status: function(message) {
        console.log(message);
        statusDiv.innerHTML = message;
    },


};

/*function BPM() {
    console.log(bpm);
}*/


app.initialize();
