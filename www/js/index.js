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

let counter = 0

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

        /*Notification Permissions code. (Make sure to not alert(status) until splashscreen
        * has been hidden with navigator.splashscreen.hide() 
        * else alert might not show and your app seems to stall.)
        */
        let permissionPlugin = window.cordova.notifications_permission;
        let rationaleTitle = "Notification Permission";
        let rationaleMsg = "You really need to give permission!";
        let rationaleOkButton = "OK";
        let rationaleCancelButton = "Not now";
        let rationaleTheme = permissionPlugin.themes.Theme_DeviceDefault_Dialog_Alert;
        let lastResortTitle = "Notification Permission!";
        let lastResortMsg = "You really need to give permission! Now the only way left is through system settings.";
        let lastResortOkButton = "Settings";
        let lastResortCancelButton = "No thanks";
        let lastResortTheme = permissionPlugin.themes.Theme_DeviceDefault_Dialog_Alert;
        permissionPlugin.maybeAskPermission(
            function(status) {
                /* Permission is either granted, denied, or not needed. */
                switch(status){
                    case permissionPlugin.GRANTED_NEWLY_WITHOUT_RATIONALE:
                    case permissionPlugin.GRANTED_NEWLY_AFTER_RATIONALE:
                    case permissionPlugin.GRANTED_NEWLY_AFTER_SETTINGS:
                    case permissionPlugin.GRANTED_ALREADY:
                    case permissionPlugin.NOT_NEEDED:
                        /* Notification shows the same as it did before Android 13 (API Level 33). */
                        break;
                    case permissionPlugin.DENIED_NOT_PERMANENTLY_NEWLY:
                    case permissionPlugin.DENIED_PERMANENTLY_NEWLY:
                    case permissionPlugin.DENIED_NOT_PERMANENTLY_ALREADY:
                    case permissionPlugin.DENIED_PERMANENTLY_ALREADY:
                    case permissionPlugin.DENIED_PERMANENTLY_ALREADY_AFTER_SETTINGS:
                    case permissionPlugin.DENIED_THROUGH_RATIONALE_DIALOG:
                    case permissionPlugin.DENIED_THROUGH_LAST_RESORT_DIALOG:
                    case permissionPlugin.NOT_ANDROID:
                        /* The notification does not show. */
                        break;    
                    case permissionPlugin.ERROR:
                        /* See console for error message */
                        break;
                }
            },
            {
                show: true,
                title:rationaleTitle,
                msg: rationaleMsg,
                okButton: rationaleOkButton,
                cancelButton: rationaleCancelButton,
                theme: rationaleTheme
            },
            {
                show: true,
                title:lastResortTitle,
                msg: lastResortMsg,
                okButton: lastResortOkButton,
                cancelButton: lastResortCancelButton,
                theme: lastResortTheme
            }
        );
/* END OF Permissions code */
        
		var bg = window.cordova.plugins.backgroundMode;
		bg.setDefaults({
			text: 'HR Alarm is running in background',
			hidden: false,
			color: '0098D9',
			icon: 'power',
			allowClose: true,
			channelDescription: 'Keep the App running in the background',
			channelName: 'Keep running in background',
			subText: 'App Needs to run in background for Epilepsy alarm',
			showWhen: false
		});
		bg.enable();
		bg.on('activate', function () {
			bg.disableWebViewOptimizations();
            //rc.send(bg.isActive());
		});
		bg.disableBatteryOptimizations();
        bg.overrideBackButton();
		var updateCount = 0;
		setInterval(function () {
			++updateCount;
			bg.configure({
				subText: 'Has updated ' + updateCount + ' time' + (updateCount === 1 ? '' : 's'),
			});
		}, 10000);
        app.refreshDeviceList();
    },
    refreshDeviceList: function() {
		deviceList.innerHTML = ''; // empties the list
		ble.scan([heartRate.service], 5, app.onDiscoverDevice, app.onError); //scans for BLE devices
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
        app.status("Connecting to " + deviceId);
		//connect functions asks for the device id, a callback function for when succeeds and one error functions for when it fails
		ble.autoConnect(deviceId, app.onConnect, app.onError);
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
            counter++
            //Alarm if HRM above threshold for more than 5 samples
            if (counter > 5){
                navigator.notification.beep(5);
                counter = 0;
            }
        }
        else {counter = 0;
        }
        //if (bpm < lowerBPMSlider.value) {
        //    navigator.notification.beep(1);
        //}
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
        // navigator.notification.beep(5);
        //alert("There was an error " + reason);
        console.log(reason)
        app.status("Error: " + reason.errorMessage);
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


 