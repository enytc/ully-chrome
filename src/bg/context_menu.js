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

function popupCenter(url, title, w, h) {
    // Fixes dual-screen position
    var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
    var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;

    var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

    var left = ((width / 2) - (w / 2)) + dualScreenLeft;
    var top = ((height / 2) - (h / 2)) + dualScreenTop;
    var newWindow = window.open(url, title, 'scrollbars=yes, resizable=no, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);

    // Puts focus on the newWindow
    if (window.focus) {
        newWindow.focus();
    }
}

//ClickAction
var clickHandler = function(info, tab) {
    //Start connection
    connectToBackend();
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

    if (window.hasOwnProperty('socket')) {
        if (info.menuItemId === 'ullySaveLink' || info.menuItemId === 'ullySavePage') {
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
        } else {
            //Save
            window.socket.emit('shortener/shorten', urlData);
            window.socket.on('shortener/data', function(data) {
                if (!data.hasOwnProperty('error')) {
                    NC('Success', data.msg);
                    popupCenter('https://ully.in/shortener/view/' + data.shortenedUrl.shortcode, 'Ully Shortener', 400, 528);
                } else {
                    NC('Error', data.error.message || data.error || 'Something went wrong. You are logged in using your Ully account?');
                }
            });
        }
    }
};

//Quick save

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

//Shortener

chrome.contextMenus.create({
    "id": "ullyShortenLink",
    "title": "Shorten this Link",
    "contexts": ["link"]
});

chrome.contextMenus.create({
    "id": "ullyShortenPage",
    "title": "Shorten this page",
    "contexts": ["page"]
});

chrome.contextMenus.onClicked.addListener(clickHandler);
