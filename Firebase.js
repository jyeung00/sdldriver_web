var config = {
  apiKey: "AIzaSyDMMY64ZePflRsGtT4h9oMp72joQ4dM4LA",
  authDomain: "ford-translate.firebaseapp.com",
  databaseURL: "https://ford-translate.firebaseio.com",
  storageBucket: "ford-translate.appspot.com",
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
var availableCars = false;

function findCars(){

	firebase.database().ref('/cars/').once('value').then(function(snapshot) {
    availableCars = false;
	  var cars = snapshot.val();

    var i;
    
    document.getElementById("selectCars").setAttribute("style", "display:inline");

    var selectedString = "";
	  for (var key in cars){
	  	var carDict = cars[key];
	  	var z = document.createElement("option");

	    var str = carDict["name"] + ", " + carDict["car"];
	    if (carDict["available"] == true){

	    	str = str + ", " + "available";
        z.setAttribute("value", key);
        var t = document.createTextNode(str);
        z.appendChild(t);
        document.getElementById("mySelect").appendChild(z);
        document.getElementById("mySelect").value = str;
        if (availableCars == false){
            availableCars = true;
            selectedString = str;
            z.setAttribute("id", "selectMe");
        }
	    }
	    else{
	    	str = str + ", " + "not available";
	    	z.setAttribute("disabled", true);
	    }
	  }

    if (availableCars){
         document.getElementById("selectMe").setAttribute("selected", true);
         var span = document.createElement("span");
         var text = document.createTextNode(selectedString);
         span.appendChild(text);
         document.getElementById("mySelect-button").appendChild(span);

         document.getElementById("carsHolder").setAttribute("style", "display:inline");
         document.getElementById("chooseCar").setAttribute("style", "display:inline");
         document.getElementById("findCar").setAttribute("style", "display:none");
         document.getElementById("name").setAttribute("style", "display:none");
      }
      else{
        document.getElementById("carsHolder").setAttribute("style", "display:none");
        document.getElementById("chooseCar").setAttribute("style", "display:none");
        document.getElementById("findCar").setAttribute("style", "display:inline");
        document.getElementById("name").setAttribute("style", "display:inline");

      }
	});
}

function chooseCar(myKey = "") {
    var selectedCarKey = "";
    if (myKey != ""){
        selectedCarKey = myKey;
    }
    else{
        selectedCarKey = document.getElementById("mySelect").value;
    }
    if (selectedCarKey != ""){ 
        if (document.getElementById("nameInput") == true){
          var name = document.getElementById("nameeInput").value;
        }
        else{
          var name = "passenger";
        }

        createCookie('carKey', selectedCarKey, 1);
        globalCarKey = selectedCarKey;

        var newPassengerKey = firebase.database().ref().child('cars/' + selectedCarKey + '/passengers').push().key;
        var postData = {
          passenger_name: name,
          passenger_type: "web"
        };
        var updates = {};
        updates['/cars/' + selectedCarKey + '/passengers/' + newPassengerKey] = postData;
        
        // document.getElementById("login").setAttribute("style", "display:none");
        // document.getElementById("chooseCar").setAttribute("style", "display:none");

        startSettingsListener(selectedCarKey);
        startSecretListener(selectedCarKey);
        startChatListener(selectedCarKey);

        return firebase.database().ref().update(updates);
    }
}

function startSettingsListener(carKey){
  //listener for secret

    firebase.database().ref('cars/' + carKey + '/settings').on('value', function(snapshot) {
        var settingsDict = snapshot.val();
        if (snapshot.val() != null){
            document.getElementById("temp").innerHTML = settingsDict["temp"] + "°C";
            document.getElementById("fanSpeed").innerHTML = "Fan: " + settingsDict["fanSpeed"] / 14;
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
        }
    });
}

function startSecretListener(carKey){
  //listener for secret

    firstTime = true;
    firebase.database().ref('cars/' + carKey + '/secret').on('value', function(snapshot) {

        createCookie("secret", snapshot.val(), 1);
        globalSecret = snapshot.val();
        // document.getElementById("waiting").setAttribute("style", "display:inline");
        if (globalSecret != null){
            document.getElementById("waiting").setAttribute("style", "display:none");
            firebase.database().ref('cars/' + carKey + '/ready').set(true);
            firebase.database().ref('cars/' + carKey + '/available').set(false);
            document.getElementById("command").setAttribute("style", "display:inline");
            document.getElementById("chat").setAttribute("style", "display:inline");
        }

    });
}

function startChatListener(carKey){

    var secretCookie = readCookie('secret');
    if (!secretCookie){
      secretCookie = globalSecret;
    }

    firebase.database().ref('cars/' + carKey + '/replies').on('value', function(snapshot) {
        var dict = snapshot.val();
        if (snapshot.val() != null){
            if (dict["secret"] == secretCookie){
                var message = dict["text"];

                postToChatbox(message, "left");
            }
        }
    });
}

function postToChatbox(message, alignment){
    if (alignment == "left"){
        var table = document.getElementById("chatTable");
        var row = table.insertRow(0);
        var cell1 = row.insertCell(0);
        cell1.innerHTML = message;
        cell1.align = "left";
    }
    else{
        var table = document.getElementById("chatTable");
        var row = table.insertRow(0);
        var cell1 = row.insertCell(0);
        cell1.innerHTML = message;
        cell1.align = "right";
    }
}

function sendChat(){
    var chatbox = document.getElementById("chatbox");
    var message = chatbox.value;
    chatbox.value = "";

    var postData = {};
    postData.sender = "passenger";
    postData.text = message;
    
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
    var newPostKey = firebase.database().ref().child('cars/' + carKeyCookie + '/chat/').push().key;

    // Write the new post's data simultaneously in the posts list and the user's post list.
    var updates = {};
    updates['/cars/' + carKeyCookie + '/chat/' + newPostKey] = postData;

    if (firstTime){
      firstTime = false;
      firebase.database().ref('cars/' + globalCarKey + '/secret').off('value');
      firebase.database().ref('cars/' + globalCarKey + '/secret').remove();
    }

    postToChatbox(message, "right");

    return firebase.database().ref().update(updates);

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
  document.getElementById("fanSpeed").innerHTML = "Fan: " + fan;
 
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
  document.getElementById("temp").innerHTML = temp + "°C";

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

  if (firstTime){
    firstTime = false;
    firebase.database().ref('cars/' + globalCarKey + '/secret').off('value');
    firebase.database().ref('cars/' + globalCarKey + '/secret').remove();
  }
        
  return firebase.database().ref().update(updates);
}


// function sendRecirc(){
//   if (recircState == true){
//     recircState = false;
//     $('.btnRecirc').removeClass("active");  
//   }
//   else{
//     recircState = true;
//      $('.btnRecirc').addClass("active");
//   }

//   var postData = {};
//   postData.recirc = recircState;
  
//   var secretCookie = readCookie('secret');
//   if (!secretCookie){
//     secretCookie = globalSecret;
//   }
//   postData.secret = secretCookie;
  
//   var carKeyCookie = readCookie('carKey');
//   if (!carKeyCookie){
//     carKeyCookie = globalCarKey;
//   }
//     // Get a key for a new climate command.
//   var newPostKey = firebase.database().ref().child('cars/' + carKeyCookie + '/climate/').push().key;

//   // Write the new post's data simultaneously in the posts list and the user's post list.
//   var updates = {};
//   updates['/cars/' + carKeyCookie + '/climate/' + newPostKey] = postData;
 
//   if (firstTime){
//     firstTime = false;
//     firebase.database().ref('cars/' + globalCarKey + '/secret').off('value');
//     firebase.database().ref('cars/' + globalCarKey + '/secret').remove();
//   }
        
//   return firebase.database().ref().update(updates);
// }


// function sendBand(i){
//   $('.btnBand').removeClass("active");

//   var band = "FM";

//   if (i == 1){
//     band = "AM";
//     $("#btnAM").addClass("active");
//   }
//   else if (i == 2){
//     band = "FM";
//     $("#btnFM").addClass("active");
//   }
//   else if (i == 3){
//     band = "XM";
//     $("#btnXM").addClass("active");
//   }


//   var postData = {};
//   postData.band = band;
  
//   var secretCookie = readCookie('secret');
//   if (!secretCookie){
//     secretCookie = globalSecret;
//   }
//   postData.secret = secretCookie;
  
//   var carKeyCookie = readCookie('carKey');
//   if (!carKeyCookie){
//     carKeyCookie = globalCarKey;
//   }
  
//   // Get a key for a new climate command.
//   var newPostKey = firebase.database().ref().child('cars/' + carKeyCookie + '/radio/').push().key;

//   // Write the new post's data simultaneously in the posts list and the user's post list.
//   var updates = {};
//   updates['/cars/' + carKeyCookie + '/radio/' + newPostKey] = postData;
//   //updates['/user-posts/' + uid + '/' + newPostKey] = postData;

//   // document.getElementById("feedback").appendChild(document.createElement("br"));
//   // document.getElementById("feedback").appendChild(document.createTextNode("Set radio band"));

//   if (firstTime){
//     firstTime = false;
//     firebase.database().ref('cars/' + globalCarKey + '/secret').off('value');
//     firebase.database().ref('cars/' + globalCarKey + '/secret').remove();
//   }

//   return firebase.database().ref().update(updates);
// }


// function sendStation(direction){

//    if (bandState == "FM"){
//       var station;
//       if (direction == 1 && stationState < 1080){
//         station = stationState + 2;
//       }
//       else if (direction == 0 && stationState > 880){
//         station = stationState - 2;
//       }
//       else{
//         station = direction * 10;
//       }
//       stationState = station;

//       document.getElementById("station").innerHTML = station / 10;
      
//       var postData = {};
//       postData.station = (station / 10).toString();
      
//       var secretCookie = readCookie('secret');
//       if (!secretCookie){
//         secretCookie = globalSecret;
//       }
//       postData.secret = secretCookie;
      
//       var carKeyCookie = readCookie('carKey');
//       if (!carKeyCookie){
//         carKeyCookie = globalCarKey;
//       }
      
//       // Get a key for a new climate command.
//       var newPostKey = firebase.database().ref().child('cars/' + carKeyCookie + '/radio/').push().key;

//       // Write the new post's data simultaneously in the posts list and the user's post list.
//       var updates = {};
//       updates['/cars/' + carKeyCookie + '/radio/' + newPostKey] = postData;

//       if (firstTime){
//         firstTime = false;
//         firebase.database().ref('cars/' + globalCarKey + '/secret').off('value');
//         firebase.database().ref('cars/' + globalCarKey + '/secret').remove();
//       }

//       return firebase.database().ref().update(updates);

//     }
//   }
  
function disconnectPassenger(){
  firebase.database().ref('cars/' + globalCarKey + '/secret').off('value');
  firebase.database().ref('cars/' + globalCarKey + '/secret').remove();
  firebase.database().ref('cars/' + globalCarKey + '/ready').remove();
  firebase.database().ref('cars/' + globalCarKey + '/passengers/' + savedPassengerKey).remove();
  firebase.database().ref('cars/' + globalCarKey + '/climate').remove();
  firebase.database().ref('cars/' + globalCarKey + '/radio').remove();

  eraseCookie("carKey");
  eraseCookie("secret");
  globalSecret = ""
  globalCarKey = ""

  document.getElementById("name").setAttribute("style", "display:inline");
  document.getElementById("carsHolder").setAttribute("style", "display:none");
  document.getElementById("chooseCar").setAttribute("style", "display:none");
  document.getElementById("findCar").setAttribute("style", "display:inline"); 
  document.getElementById("login").setAttribute("style", "display:inline"); 
  document.getElementById("command").setAttribute("style", "display:none");
  document.getElementById("chat").setAttribute("style", "display:none");

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
