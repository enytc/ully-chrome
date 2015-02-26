/*
 * ully-chrome
 * https://github.com/ullyin/ully-chrome
 *
 * Copyright (c) 2015, EnyTC Corporation
 */

'use strict';

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
            urlData.slug = 'favorites';
            //Save
            window.socket.emit('/api/collections/add', urlData);
            window.socket.on('/api/collections/url/created', function(data) {
                NC('Success', data.msg);
            });
            window.socket.on('/api/collections/url/error', function(err) {
                NC('Error', err);
            });
        } else {
            //Save
            window.socket.emit('/api/shortener/shorten', urlData);
            window.socket.on('/api/shortener/created', function(data) {
                NC('Success', data.msg);
                popupCenter(ULLY_URI +'/l/' + data.shortenedUrl.shortcode + '?view=true&success=true', 'Ully Shortener', 400, 500);
            });
            window.socket.on('/api/shortener/error', function(err) {
                NC('Error', err);
            });
        }
    }
};

//Quick save

chrome.contextMenus.create({
    "id": "ullySaveLink",
    "title": chrome.i18n.getMessage('menu_save_link'),
    "contexts": ["link"]
});

chrome.contextMenus.create({
    "id": "ullySavePage",
    "title": chrome.i18n.getMessage('menu_save_page'),
    "contexts": ["page"]
});

//Shortener

chrome.contextMenus.create({
    "id": "ullyShortenLink",
    "title": chrome.i18n.getMessage('menu_shorten_link'),
    "contexts": ["link"]
});

chrome.contextMenus.create({
    "id": "ullyShortenPage",
    "title": chrome.i18n.getMessage('menu_shorten_page'),
    "contexts": ["page"]
});

chrome.contextMenus.onClicked.addListener(clickHandler);
