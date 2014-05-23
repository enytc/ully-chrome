/*
 * ully
 * https://ully.in
 *
 * Copyright (c) 2014, EnyTC Corporation
 */

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

chrome.runtime.onInstalled.addListener(function() {
    //ClickAction
    var clickHandler = function(e) {
        var url = e.pageUrl;
        var urlData = {
            url: url
        };

        if (e.linkUrl) {
            url = e.linkUrl;
            urlData = {
                url: url
            };
        }

        var newUrl = {
            url: urlData.url,
            collectionSlug: 'favorites'
        };
        window.socket.emit('collections/save', newUrl);
        window.socket.on('collections/saved', function(data) {
            if (!data.hasOwnProperty('error')) {
                alert(data.msg);
            } else {
                window.alert(data.error.message || data.error || 'Something went wrong. You are logged in using your Ully account?');
            }
        });
    };

    chrome.contextMenus.create({
        "title": "Save link to Ully",
        "contexts": ["link"],
        "onclick": clickHandler
    });

    chrome.contextMenus.create({
        "title": "Save page to Ully",
        "contexts": ["page"],
        "onclick": clickHandler
    });
});
