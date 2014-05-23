/*
 * ully
 * https://ully.in
 *
 * Copyright (c) 2014, EnyTC Corporation
 */

'use strict';

function NC(title, msg, body, buttons) {
    var opt = {
        type: 'basic',
        title: title,
        message: msg,
        iconUrl: '/icons/icon128quad.png'
    };
    if (body) {
        opt.contextMessage = body;
    }
    if (buttons) {
        opt.buttons = buttons;
    }
    //Send message
    chrome.notifications.create('UllyContextMessage', opt, function() {});
    chrome.notifications.clear('UllyContextMessage', function(wasCleared) {
        if (wasCleared) {
            console.log('was cleared!');
        }
    });
}

function isLogged() {
    var userData = JSON.parse(window.localStorage.ully || '{}');
    if (userData.hasOwnProperty('email') && userData.email.length > 1 && userData.hasOwnProperty('access_token') && userData.access_token.length > 1) {
        return true;
    } else {
        return false;
    }
}

function getAuth() {
    var userData = JSON.parse(window.localStorage.ully || '{}');
    if (userData.hasOwnProperty('email') && userData.email.length > 1 && userData.hasOwnProperty('access_token') && userData.access_token.length > 1) {
        return userData;
    } else {
        return {};
    }
}

function connectToBackend() {
    if (isLogged()) {
        window.socket = io.connect('http://localhost:22792/socket', {
            query: 'email=' + getAuth().email + '&access_token=' + getAuth().access_token
        });
    } else {
        console.info('You need to be logged!');
    }
}

//Start connection
connectToBackend();

//ClickAction
var clickHandler = function(info, tab) {
    var url = info.pageUrl;
    var urlData = {
        url: url,
        title: tab.title
    };

    if (info.linkUrl) {
        url = info.linkUrl;
        urlData = {
            url: url
        };
    }

    urlData.collectionSlug = 'favorites';
    //Save
    window.socket.emit('collections/save', urlData);
    window.socket.on('collections/saved', function(data) {
        if (!data.hasOwnProperty('error')) {
            NC('Success', data.msg);
        } else {
            NC('Error', data.error.message || data.error || 'Something went wrong. You are logged in using your Ully account?');
        }
    });
};

chrome.contextMenus.onClicked.addListener(clickHandler);

chrome.contextMenus.create({
    "id": "ullySaveLink",
    "title": "Save link to Ully",
    "contexts": ["link"]
});

chrome.contextMenus.create({
    "id": "ullySavePage",
    "title": "Save page to Ully",
    "contexts": ["page"]
});
