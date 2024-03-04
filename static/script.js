// Constants to easily refer to pages
const SPLASH = document.querySelector(".splash");
const PROFILE = document.querySelector(".profile");
const LOGIN = document.querySelector(".login");
const ROOM = document.querySelector(".room");

const API_ENDPOINTS = {
  MESSAGES_URL: "/api/room/messages",
  SEND_MESSAGE_URL: "/api/room/post",
  USERNAME_UPDATE_URL: "/api/username/change",
  PASSWORD_UPDATE_URL: "/api/password/change",
  ROOM_NAME_UPDATE_URL: "/api/room/name/change",
  SIGNUP_URL: "/api/signup",
  SIGNUP_DETAILS_URL: "/api/signup/details",
  LOGIN_URL: "/api/login",
  CREATE_NEW_ROOM_URL: "/api/rooms/new",
  ROOMS_URL: "/api/rooms",
  ERROR_URL: "/api/error"
}

let rooms = {};
let currentPath = '';
let currentRoomID = 0;

let loginDict = {
  userName: '',
  password: ''
};

let getAllMsgsRequest = {
  room_id: 0
};

let postRequest = {
  room_id: 0,
  body: ''
};

let postUpdateNameRequest = {
  user_name: ''
};

let postUpdatePassRequest = {
  Password: ''
};

let postUpdateRoomRequest = {
  name: '',
  room_id: 0
};

let signUpDetails = {
  userName: '',
  Password: ''
};

// Custom validation on the password reset fields
const passwordField = document.querySelector(".profile input[name=password]");
const repeatPasswordField = document.querySelector(".profile input[name=repeatPassword]");
const repeatPasswordMatches = () => {
  const p = document.querySelector(".profile input[name=password]").value;
  const r = repeatPassword.value;
  return p == r;
};



const checkPasswordRepeat = () => {
  const passwordField = document.querySelector(".profile input[name=password]");
  if(passwordField.value == repeatPasswordField.value) {
    repeatPasswordField.setCustomValidity("");
    return;
  } else {
    repeatPasswordField.setCustomValidity("Password doesn't match");
  }
}


passwordField.addEventListener("input", checkPasswordRepeat);
repeatPasswordField.addEventListener("input", checkPasswordRepeat);

async function performRequest(endPoint, requestBody, requestHeader, endType){
  let url = endPoint + (Object.keys(requestBody).length > 0 
                        ? ("?" + Object.keys(requestBody).map((key) => key+"="+encodeURIComponent(requestBody[key])).join("&")) 
                        : "");

  let urlHeaders = new Headers();
  urlHeaders.append("Accept", "application/json");
  urlHeaders.append("Content-Type", "application/json");
  urlHeaders.append("Api-Key", localStorage.getItem('API-KEY'));
  urlHeaders.append("User-Id", localStorage.getItem('User-Id'));

  Object.keys(requestHeader).forEach(function(key) {
    urlHeaders.append(key, requestHeader[key]);
  });

  const myInit = {
    method: endType,
    headers: urlHeaders,
  };

  data = await fetch(url, myInit);
  jsonForm = await data.json();
  return jsonForm
}

function showThisElement(elementToShow) {
  const sections = [SPLASH, PROFILE, LOGIN, ROOM];

  sections.forEach(section => {
    section.classList.add("hide");
  });

  elementToShow.classList.remove("hide");

  if (elementToShow !== ROOM) {
    currentRoomID = 0;
  }
}

function toggleElementVisibility(selector, shouldBeVisible) {
  const element = document.querySelector(selector);
  if (shouldBeVisible) {
    element.classList.remove("hide");
  } else {
    element.classList.add("hide");
  }
}

function loginPost() {
  toggleElementVisibility(".loginHeader .loggedOut", false);
  toggleElementVisibility(".signup", false);
  toggleElementVisibility(".loginHeader .loggedIn", true);
  toggleElementVisibility(".create", true);

  const userName = localStorage.getItem('User-Name');
  document.querySelectorAll('.username').forEach(usernameSpan => {
    const commonInnerHTML = `<a onclick="updateDetails()" style="text-decoration: underline; cursor: pointer; color: blue;">${userName}</a>! <a class="logout" onclick="logoutUser()" style="text-decoration: underline; cursor: pointer;">(logout)</a>`;
    usernameSpan.innerHTML = usernameSpan.innerHTML.includes("Welcome") ? `Welcome back, ${commonInnerHTML}` : commonInnerHTML;
  });

  const usernameInput = document.querySelector('input[name="username"]');
  if (usernameInput) usernameInput.value = userName;
}

function logoutPost() {
  toggleElementVisibility(".loginHeader .loggedIn", false);
  toggleElementVisibility(".create", false);
  toggleElementVisibility(".loginHeader .loggedOut", true);
  toggleElementVisibility(".signup", true);
}

function hideByDefault() {
  toggleElementVisibility('.editRoomName', false);
  toggleElementVisibility('.displayRoomName', true);
}

function hidebyCls() {
  document.querySelector('.login .failed').style.display = 'none';
}

function LoadURL(url) {
  window.history.pushState({}, '', '/' + url);
  router();
}


async function signUP() {
  try {
    const response = await performRequest(API_ENDPOINTS.SIGNUP_URL, {}, {}, 'POST');
    if (response) {
      localStorage.setItem('API-KEY', response.api_key);
      localStorage.setItem('User-Id', response.user_id);
      localStorage.setItem('User-Name', response.user_name);
      LoadURL('');
    } else {
      console.error('Signup failed: No response from server');
    }
  } catch (error) {
    console.error('Signup error:', error);
  }
}

async function signUPWithDetails() {
  try {
    signUpDetails.userName = document.getElementById('username').value;
    signUpDetails.Password = document.getElementById('password').value;
    const response = await performRequest(API_ENDPOINTS.SIGNUP_DETAILS_URL, {}, signUpDetails, 'POST');
    if (response) {
      localStorage.setItem('API-KEY', response.api_key);
      localStorage.setItem('User-Id', response.user_id);
      localStorage.setItem('User-Name', response.user_name);
      LoadURL('');
    } else {
      console.error('Signup with details failed: No response from server');
    }
  } catch (error) {
    console.error('Signup with details error:', error);
  }
}

function logoutUser() {
  localStorage.removeItem('API-KEY');
  localStorage.removeItem('User-Id');
  localStorage.removeItem('User-Name');
  rooms = {};
  document.querySelector(".roomList").innerHTML = '';
  document.querySelector('.noRooms').style.display = "block";
  LoadURL('');
}

async function loginUser() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const response = await performRequest(API_ENDPOINTS.LOGIN_URL, {}, { userName: username, password: password }, 'POST');
  
  if (response && response.api_key) {
    localStorage.setItem('API-KEY', response.api_key);
    localStorage.setItem('User-Id', response.user_id);
    localStorage.setItem('User-Name', response.user_name);
    LoadURL(currentPath
    
     ? currentPath
    
     : '/');
  } else {
    document.querySelector('.login .failed').style.display = 'flex';
  }
}

async function updateUsername() {
  const newUsername = document.querySelector('input[name="username"]').value;
  const response = await performRequest(API_ENDPOINTS.USERNAME_UPDATE_URL, { user_name: newUsername }, {}, 'POST');
  if (response && response.name) {
    localStorage.setItem('User-Name', response.name);
    loginPost();
  }
}

async function updatePassword() {
  const newPassword = document.querySelector('input[name="password"]').value;
  const repeatPassword = document.querySelector('input[name="repeatPassword"]').value;
  if (newPassword === repeatPassword) {
    const response = await performRequest(API_ENDPOINTS.PASSWORD_UPDATE_URL, { password: newPassword }, {}, 'POST');
    if (response) {
      loginPost();
    }
  } else {
    console.error("Passwords do not match.");
  }
}

async function createNewRoom() {
  const response = await performRequest(API_ENDPOINTS.CREATE_NEW_ROOM_URL, {}, {}, 'POST');
  LoadURL('room/' + response.room_id);
}

async function postMessage(body) {
  const response = await performRequest(API_ENDPOINTS.SEND_MESSAGE_URL, { room_id: currentRoomID, body: body }, {}, 'POST');
  if (response) {
    document.getElementById("commentTA").value = '';
  }
}

function loadRoom(roomId) {
  LoadURL("room/" + roomId);
}

function toggleEditMode() {
  document.querySelector('.displayRoomName').classList.add('hide');
  document.querySelector('.editRoomName').classList.remove('hide');
}

async function populateRooms() {
  rooms = await performRequest(API_ENDPOINTS.ROOMS_URL, {}, {}, 'GET');
  const roomsDiv = document.querySelector(".roomList");
  roomsDiv.innerHTML = ''; // Clear existing rooms

  const noRoomsDiv = document.querySelector('.noRooms');
  noRoomsDiv.style.display = rooms && Object.keys(rooms).length > 0 ? "none" : "block";

  if (rooms) {
    Object.entries(rooms).forEach(([roomId, roomDetails]) => {
      const roomLink = document.createElement("a");
      roomLink.href = "#";
      roomLink.innerHTML = `${roomId}: <strong>${roomDetails.name}</strong>`;
      roomLink.addEventListener('click', (e) => {
        e.preventDefault();
        loadRoom(roomId);
      });
      roomsDiv.appendChild(roomLink);
    });
  }
}

async function saveRoomName() {
  const roomName = document.querySelector('#roomNameInput').value;
  await performRequest(API_ENDPOINTS.ROOM_NAME_UPDATE_URL, { name: roomName, room_id: currentRoomID }, {}, 'POST');
  document.querySelector('.displayRoomName strong').textContent = roomName;
  document.querySelector('.editRoomName').classList.add('hide');
  document.querySelector('.displayRoomName').classList.remove('hide');
}

async function updateDetails() {
  LoadURL('profile');
}

let router = async () => {
  let path = window.location.pathname;
  if(localStorage.getItem('API-KEY') == null){
    logoutPost();
    if(path != "/" && path.length > 1){
      splitted = path.split('/');
      currentPath
    
     = splitted[1];
      for(var j = 2; j < splitted.length; j++){
        currentPath
      
       += '/' + splitted[j];
      }
      window.history.pushState(null, null, '/login');
      path = '/login';
    }
  }
  else{
    loginPost();

    if(path == "/login"){
      window.history.pushState(null, null, '/');
      path = '/';
    }
  }
  hideByDefault();
  hidebyCls();

  if(path == "/" || path == "/room") {
    document.title = 'Home';
    showThisElement(SPLASH);
    if(localStorage.getItem('API-KEY') != null){
      await populateRooms();
    }
  }
  else if(path == "/profile"){
    document.title = 'Signup and Update';
    showThisElement(PROFILE);
  }
  else if(path.startsWith("/room/")) {
    document.title = 'Rooms';
    showThisElement(ROOM);

    currentRoomID = path.split('/')[2];
    document.title = 'Room ' + currentRoomID;
    await populateRooms();
    document.querySelector('.displayRoomName strong').innerHTML = rooms[currentRoomID]['name'];
    document.querySelector('#roomNameInput').value = rooms[currentRoomID]['name'];
    document.querySelector('.roomDetail #roomId').innerHTML = '/rooms/' + currentRoomID;
  }
  else if(path == "/login") {
    document.title = 'Login';
    showThisElement(LOGIN);
  } 
  else {
    await performRequest(API_ENDPOINTS.ERROR_URL, {}, {}, 'POST');
  }
}
window.addEventListener("DOMContentLoaded", router);
window.addEventListener("popstate", router);

async function startMessagePolling() {
  setInterval(async () => {
    if (currentRoomID === 0) return;
    
    getAllMsgsRequest.room_id = currentRoomID;
    let messages = await performRequest(API_ENDPOINTS.MESSAGES_URL, getAllMsgsRequest, {}, 'GET');
    let messagesDiv = document.body.querySelector(".messages");
    
    while (messagesDiv.firstChild) {
      messagesDiv.removeChild(messagesDiv.firstChild);
    }
  
    Object.entries(messages).forEach(([key, messageInfo]) => {
      let messageElement = document.createElement("message");
      let authorElement = document.createElement("author");
      authorElement.innerHTML = messageInfo.name;
      let contentElement = document.createElement("content");
      contentElement.innerHTML = messageInfo.body;
      messageElement.appendChild(authorElement);
      messageElement.appendChild(contentElement);
      messagesDiv.append(messageElement);
    });
  }, 500);
  return;
}

