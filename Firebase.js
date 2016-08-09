var config = {
  apiKey: "AIzaSyAbBuLS3vhjefXrnrAmJDAC09TTVi6T8lo",
  authDomain: "ford-rsdl.firebaseapp.com",
  databaseURL: "https://ford-rsdl.firebaseio.com",
  storageBucket: "ford-rsdl.appspot.com",
};
firebase.initializeApp(config);

var globalCarKey = "";
var globalSecret = "";
var firstTime = true;
var savedPassengerKey = "";
var ACState = false;
var recircState = false;
var fanSpeedState = 1;
var tempState = 20;
var bandState = "FM";
var stationState = 1011;

function findCars(){
  var availableCars = false;

	firebase.database().ref('/cars/').once('value').then(function(snapshot) {
	  var cars = snapshot.val();

    document.getElementById("selectCars").setAttribute("style", "display:inline");
		// var selectElement = document.createElement("SELECT");
  //   	selectElement.setAttribute("id", "mySelect");
  //   	selectElement.setAttribute("class", "form-control");
  //   	document.getElementById("selectCars").appendChild(selectElement);

	  for (var key in cars){
	  	var carDict = cars[key];
	  	var z = document.createElement("option");

	    var str = carDict["name"] + ", " + carDict["car"];
	    if (carDict["available"] == true){
	    	str = str + ", " + "available";
        availableCars = true;
        z.setAttribute("value", key);
        var t = document.createTextNode(str);
        z.appendChild(t);
        document.getElementById("mySelect").appendChild(z);
        document.getElementById("mySelect").value = str;
	    }
	    else{
	    	str = str + ", " + "not available";
	    	z.setAttribute("disabled", true);
	    }
	  }

    if (availableCars){
         document.getElementById("carsHolder").setAttribute("style", "display:inline");
         document.getElementById("chooseCar").setAttribute("style", "display:inline");
         document.getElementById("findCar").setAttribute("style", "display:none");
         document.getElementById("name").setAttribute("style", "display:none");
      }
      else{
        document.getElementById("selectCars").innerHTML = "No available rides";
      }
	});
}

function chooseCar() {
    var selectedCarKey = document.getElementById("mySelect").value;
    var name = document.getElementById("nameInput").value;
    createCookie('carKey', selectedCarKey, 1);
    globalCarKey = selectedCarKey;

    var newPassengerKey = firebase.database().ref().child('cars/' + selectedCarKey + '/passengers').push().key;
    var postData = {
      passenger_name: name,
      passenger_type: "web"
    };
    var updates = {};
    updates['/cars/' + selectedCarKey + '/passengers/' + newPassengerKey] = postData;
    
    document.getElementById("login").setAttribute("style", "display:none");
    document.getElementById("feedback").appendChild(document.createElement("br"));
    document.getElementById("feedback").appendChild(document.createTextNode("Added new passenger, " + name));
    document.getElementById("feedback").appendChild(document.createElement("br"));
    document.getElementById("feedback").appendChild(document.createTextNode("Waiting for car to accept..."));
    document.getElementById("chooseCar").setAttribute("style", "display:none");
    document.getElementById("disconnectCar").setAttribute("style", "display:inline");

    startSettingsListener(selectedCarKey);
    startSecretListener(selectedCarKey);

    return firebase.database().ref().update(updates);
}

function startSettingsListener(carKey){
  //listener for secret

    firebase.database().ref('cars/' + carKey + '/settings').on('value', function(snapshot) {
        var settingsDict = snapshot.val();
        document.getElementById("temp").innerHTML = settingsDict["temp"];
        document.getElementById("fanSpeed").innerHTML = settingsDict["fanSpeed"] / 14;
        document.getElementById("station").innerHTML = settingsDict["radioStationInt"] + "." + settingsDict["radioStationFrac"];
        
        stationState = parseFloat(settingsDict["radioStationInt"] + settingsDict["radioStationFrac"] / 10) * 10;
        $('.btnBand').removeClass("active");
        bandState = settingsDict["radioBand"];
        if (bandState == "FM"){
          $("#btnFM").addClass("active");      
        }
        else if (bandState == "AM"){
          $("#btnAM").addClass("active");
        }
        else if (bandState == "XM")
        {
          $("#btnXM").addClass("active");
        }
        tempState = settingsDict["temp"];
        ACState = settingsDict["AC"];
        recircState = settingsDict["recirc"];
        fanSpeedState = settingsDict["fanSpeed"] / 14;

        if (ACState){
          $('.btnAC').addClass("active");
        }
        if (recircState){
          $('.btnRecirc').addClass("active");
        }
    });
}

function startSecretListener(carKey){
  //listener for secret

    firstTime = true;
    firebase.database().ref('cars/' + carKey + '/secret').on('value', function(snapshot) {
        createCookie("secret", snapshot.val(), 1);
        globalSecret = snapshot.val();
        document.getElementById("feedback").appendChild(document.createElement("br"));
        document.getElementById("feedback").appendChild(document.createTextNode("Car accepted!"));
        firebase.database().ref('cars/' + carKey + '/ready').set(true);
        document.getElementById("command").style = "display:inline";

    });

}

function sendFanspeed(direction){
 
  var fan;

  if (direction == 1 && fanSpeedState < 7){
    fan = fanSpeedState + 1
  }
  else if (direction == 0 && fanSpeedState > 1){
    fan = fanSpeedState - 1
  }
  else{
    return;
  }

  fanSpeedState = fan;
  document.getElementById("fanSpeed").innerHTML = fan;
 
  var postData = {};
  postData.fanSpeed = parseFloat(fan);
 
  var secretCookie = readCookie('secret');
  if (!secretCookie){
    secretCookie = globalSecret;
  }
  postData.secret = secretCookie;
 
  var carKeyCookie = readCookie('carKey');
  if (!carKeyCookie){
    carKeyCookie = globalCarKey;
  }
 
  // Get a key for a new climate command.
  var newPostKey = firebase.database().ref().child('cars/' + carKeyCookie + '/climate/').push().key;

  // Write the new post's data simultaneously in the posts list and the user's post list.
  var updates = {};
  updates['/cars/' + carKeyCookie + '/climate/' + newPostKey] = postData;
  //updates['/user-posts/' + uid + '/' + newPostKey] = postData;

  document.getElementById("feedback").appendChild(document.createElement("br"));
  document.getElementById("feedback").appendChild(document.createTextNode("Added new Fanspeed command"));

  if (firstTime){
    firstTime = false;
    firebase.database().ref('cars/' + globalCarKey + '/secret').off('value');
    firebase.database().ref('cars/' + globalCarKey + '/secret').remove();
  }

  return firebase.database().ref().update(updates);
}

function sendTemp(direction){
 
  var temp;

  if (direction == 1 && tempState < 30){
    temp = tempState + 0.5;
  }
  else if (direction == 0 && tempState > 16){
    temp = tempState - 0.5;
  }
  else{
    return;
  }

  tempState = temp;
  document.getElementById("temp").innerHTML = temp;

  var postData = {};
  postData.temperature = parseFloat(temp);
  
  var secretCookie = readCookie('secret');
  if (!secretCookie){
    secretCookie = globalSecret;
  }
  postData.secret = secretCookie;
  
  var carKeyCookie = readCookie('carKey');
  if (!carKeyCookie){
    carKeyCookie = globalCarKey;
  }
  
  // Get a key for a new climate command.
  var newPostKey = firebase.database().ref().child('cars/' + carKeyCookie + '/climate/').push().key;

  // Write the new post's data simultaneously in the posts list and the user's post list.
  var updates = {};
  updates['/cars/' + carKeyCookie + '/climate/' + newPostKey] = postData;
  //updates['/user-posts/' + uid + '/' + newPostKey] = postData;

  document.getElementById("feedback").appendChild(document.createElement("br"));
  document.getElementById("feedback").appendChild(document.createTextNode("Added new Temperature command"));

  if (firstTime){
    firstTime = false;
    firebase.database().ref('cars/' + globalCarKey + '/secret').off('value');
    firebase.database().ref('cars/' + globalCarKey + '/secret').remove();
  }
        
  return firebase.database().ref().update(updates);
}


function sendAC(){
  if (ACState == true){
    ACState = false;
    $('.btnAC').removeClass("active");  
  }
  else{
    ACState = true;
     $('.btnAC').addClass("active");
  }

  var postData = {};
  postData.acEnable = ACState;
  
  var secretCookie = readCookie('secret');
  if (!secretCookie){
    secretCookie = globalSecret;
  }
  postData.secret = secretCookie;
  
  var carKeyCookie = readCookie('carKey');
  if (!carKeyCookie){
    carKeyCookie = globalCarKey;
  }
    // Get a key for a new climate command.
  var newPostKey = firebase.database().ref().child('cars/' + carKeyCookie + '/climate/').push().key;

  // Write the new post's data simultaneously in the posts list and the user's post list.
  var updates = {};
  updates['/cars/' + carKeyCookie + '/climate/' + newPostKey] = postData;
  //updates['/user-posts/' + uid + '/' + newPostKey] = postData;

  document.getElementById("feedback").appendChild(document.createElement("br"));
  document.getElementById("feedback").appendChild(document.createTextNode("Set AC " + ACState));

  if (firstTime){
    firstTime = false;
    firebase.database().ref('cars/' + globalCarKey + '/secret').off('value');
    firebase.database().ref('cars/' + globalCarKey + '/secret').remove();
  }
        
  return firebase.database().ref().update(updates);
}


function sendRecirc(){
  if (recircState == true){
    recircState = false;
    $('.btnRecirc').removeClass("active");  
  }
  else{
    recircState = true;
     $('.btnRecirc').addClass("active");
  }

  var postData = {};
  postData.recirc = recircState;
  
  var secretCookie = readCookie('secret');
  if (!secretCookie){
    secretCookie = globalSecret;
  }
  postData.secret = secretCookie;
  
  var carKeyCookie = readCookie('carKey');
  if (!carKeyCookie){
    carKeyCookie = globalCarKey;
  }
    // Get a key for a new climate command.
  var newPostKey = firebase.database().ref().child('cars/' + carKeyCookie + '/climate/').push().key;

  // Write the new post's data simultaneously in the posts list and the user's post list.
  var updates = {};
  updates['/cars/' + carKeyCookie + '/climate/' + newPostKey] = postData;
  //updates['/user-posts/' + uid + '/' + newPostKey] = postData;

  document.getElementById("feedback").appendChild(document.createElement("br"));
  document.getElementById("feedback").appendChild(document.createTextNode("Set Recirc" + recircState));

  if (firstTime){
    firstTime = false;
    firebase.database().ref('cars/' + globalCarKey + '/secret').off('value');
    firebase.database().ref('cars/' + globalCarKey + '/secret').remove();
  }
        
  return firebase.database().ref().update(updates);
}


function sendBand(i){
  $('.btnBand').removeClass("active");

  var band = "FM";

  if (i == 1){
    band = "AM";
    $("#btnAM").addClass("active");
  }
  else if (i == 2){
    band = "FM";
    $("#btnFM").addClass("active");
  }
  else if (i == 3){
    band = "XM";
    $("#btnXM").addClass("active");
  }


  var postData = {};
  postData.band = band;
  
  var secretCookie = readCookie('secret');
  if (!secretCookie){
    secretCookie = globalSecret;
  }
  postData.secret = secretCookie;
  
  var carKeyCookie = readCookie('carKey');
  if (!carKeyCookie){
    carKeyCookie = globalCarKey;
  }
  
  // Get a key for a new climate command.
  var newPostKey = firebase.database().ref().child('cars/' + carKeyCookie + '/radio/').push().key;

  // Write the new post's data simultaneously in the posts list and the user's post list.
  var updates = {};
  updates['/cars/' + carKeyCookie + '/radio/' + newPostKey] = postData;
  //updates['/user-posts/' + uid + '/' + newPostKey] = postData;

  document.getElementById("feedback").appendChild(document.createElement("br"));
  document.getElementById("feedback").appendChild(document.createTextNode("Set radio band"));

  if (firstTime){
    firstTime = false;
    firebase.database().ref('cars/' + globalCarKey + '/secret').off('value');
    firebase.database().ref('cars/' + globalCarKey + '/secret').remove();
  }

  return firebase.database().ref().update(updates);
}


function sendStation(direction){

   if (bandState == "FM"){
      var station;
      if (direction == 1 && stationState < 1080){
        station = stationState + 2;
      }
      else if (direction == 0 && stationState > 880){
        station = stationState - 2;
      }
      else{
        station = direction * 10;
      }
      stationState = station;

      document.getElementById("station").innerHTML = station / 10;
      
      var postData = {};
      postData.station = (station / 10).toString();
      
      var secretCookie = readCookie('secret');
      if (!secretCookie){
        secretCookie = globalSecret;
      }
      postData.secret = secretCookie;
      
      var carKeyCookie = readCookie('carKey');
      if (!carKeyCookie){
        carKeyCookie = globalCarKey;
      }
      
      // Get a key for a new climate command.
      var newPostKey = firebase.database().ref().child('cars/' + carKeyCookie + '/radio/').push().key;

      // Write the new post's data simultaneously in the posts list and the user's post list.
      var updates = {};
      updates['/cars/' + carKeyCookie + '/radio/' + newPostKey] = postData;
      //updates['/user-posts/' + uid + '/' + newPostKey] = postData;

      document.getElementById("feedback").appendChild(document.createElement("br"));
      document.getElementById("feedback").appendChild(document.createTextNode("Set radio station"));

      if (firstTime){
        firstTime = false;
        firebase.database().ref('cars/' + globalCarKey + '/secret').off('value');
        firebase.database().ref('cars/' + globalCarKey + '/secret').remove();
      }

      return firebase.database().ref().update(updates);

    }
  }
  
function disconnectPassenger(){
  firebase.database().ref('cars/' + globalCarKey + '/secret').off('value');
  firebase.database().ref('cars/' + globalCarKey + '/secret').remove();
  firebase.database().ref('cars/' + globalCarKey + '/ready').remove();
  firebase.database().ref('cars/' + globalCarKey + '/passengers/' + savedPassengerKey).remove();
  firebase.database().ref('cars/' + globalCarKey + '/available').set(true);
  firebase.database().ref('cars/' + globalCarKey + '/climate').remove();
  firebase.database().ref('cars/' + globalCarKey + '/radio').remove();

  eraseCookie("carKey");
  eraseCookie("secret");
  globalSecret = ""
  globalCarKey = ""

  document.getElementById("name").setAttribute("style", "display:inline");
  document.getElementById("carsHolder").setAttribute("style", "display:none");
  document.getElementById("chooseCar").setAttribute("style", "display:none");
  document.getElementById("disconnectCar").setAttribute("style", "display:none");
  document.getElementById("findCar").setAttribute("style", "display:inline"); 
  document.getElementById("login").setAttribute("style", "display:inline"); 
  document.getElementById("command").style = "display:none";
  document.getElementById("feedback").innerHTML = "";

  document.getElementById("mySelect").innerHTML = "";
  document.getElementById("selectCars").setAttribute("style", "display:none");
  
}

function createCookie(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name + "=" + value + expires + "; path=/";
    // console.log("Cookie value for " + name + ": " + document.cookie);
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name,"",-1);
}