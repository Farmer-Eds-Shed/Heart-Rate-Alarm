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

//initialize slider states from browser storage
if (window.localStorage.getItem('lower_bpm_slider') != null) {
        stored = window.localStorage.getItem('lower_bpm_slider')
        document.getElementById("lower_bpm_slider").value = stored;
    }
if (window.localStorage.getItem('upper_bpm_slider') != null) {
        stored = window.localStorage.getItem('upper_bpm_slider')
        document.getElementById("upper_bpm_slider").value = stored;
    }  

//define sliders
let lowerBPMSlider = document.getElementById("lower_bpm_slider");
let lowerBPMOutput = document.getElementById("lower_bpm_value");
lowerBPMOutput.innerHTML = document.getElementById("lower_bpm_slider").value

let upperBPMSlider = document.getElementById("upper_bpm_slider");
let upperBPMOutput = document.getElementById("upper_bpm_value");
upperBPMOutput.innerHTML = document.getElementById("upper_bpm_slider").value

//listen for slider changes
lowerBPMSlider.oninput = function() {
    lowerBPMOutput.innerHTML = this.value;
    window.localStorage.setItem('lower_bpm_slider', this.value);
}
upperBPMSlider.oninput = function() {
    upperBPMOutput.innerHTML = this.value;
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
        if (bpm > upperBPMSlider.value) {
            navigator.notification.beep(1);
        }
        if (bpm < lowerBPMSlider.value) {
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

//HTML Tabs
document.getElementById("defaultOpen").click();
function openTab(evt, cityName) {
    // Declare all variables
    var i, tabcontent, tablinks;
  
    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }
  
    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
  
    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(cityName).style.display = "block";
    evt.currentTarget.className += " active";
  }
