/*
 * ully
 * https://ully.in
 *
 * Copyright (c) 2014, EnyTC Corporation
 */

'use strict';

var ULLY_URI = 'http://localhost';

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
            console.log('Notification was cleared!');
        }
    });
}

function isLogged() {
    var userData = JSON.parse(window.localStorage.ully || '{}');
    if (userData.hasOwnProperty('access_token') && userData.access_token.length > 1) {
        return true;
    } else {
        return false;
    }
}

function getAuth() {
    var userData = JSON.parse(window.localStorage.ully || '{}');
    if (userData.hasOwnProperty('access_token') && userData.access_token.length > 1) {
        return userData;
    } else {
        return {};
    }
}

function connectToBackend() {
    if (isLogged()) {
        return window.socket = io.connect(ULLY_URI, {
            query: 'access_token=' + getAuth().access_token
        });
    } else {
        console.info('You need to be logged!');
    }
}
