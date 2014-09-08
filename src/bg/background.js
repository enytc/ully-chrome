/*
 * ully
 * https://ully.in
 *
 * Copyright (c) 2014, EnyTC Corporation
 */

'use strict';

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
        window.socket = io.connect('https://ully.in', {
            query: 'email=' + getAuth().email + '&access_token=' + getAuth().access_token
        });
    } else {
        console.info('You need to be logged!');
    }
}

//Start connection
connectToBackend();

chrome.runtime.onInstalled.addListener(function(details) {
    //Clear DB
    delete window.localStorage.ully;
    delete window.localStorage.ullyUser;
    delete window.localStorage.ullyCollections;
    //Redirect
    chrome.tabs.create({
        url: 'https://ully.in/installed'
    });
});

chrome.omnibox.onInputEntered.addListener(function(command) {
    var re = /^https?:\/\//;
    if (re.test(command)) {
        chrome.tabs.create({
            url: command
        });
    } else {
        chrome.tabs.create({
            url: 'https://ully.in/collections/' + command
        });
    }
});

chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
    var collectionsData = JSON.parse(window.localStorage.ullyCollections || '[]');
    var suggestsList = [];
    if (collectionsData && collectionsData.length) {
        for (var collection in collectionsData) {
            for (var url in collectionsData[collection].urls) {
                suggestsList.push({
                    content: collectionsData[collection].urls[url].url,
                    description: '<dim> ' + collectionsData[collection].urls[url].title + '</dim> ' + '<match><url>' + collectionsData[collection].urls[url].url + '</url></match>'
                });
            }
        };
        var selectedList = _.filter(suggestsList, function(val) {
            var re = new RegExp(text, 'g');
            return re.test(val.content);
        });
        suggest(selectedList);
    }
});

chrome.tabs.onActivated.addListener(function(tabId, windowId) {
    //Start connection
    connectToBackend();
    //Check user is logged
    if (isLogged()) {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tab) {
            if (/^https?:\/\//.test(tab[0].url)) {
                if (window.hasOwnProperty('socket')) {
                    window.socket.emit('url/exists', {
                        url: tab[0].url
                    });
                    window.socket.on('url/data', function(data) {
                        if (!data.hasOwnProperty('error')) {
                            if (data > 0) {
                                chrome.browserAction.setIcon({
                                    path: 'icons/icon-fav19.png'
                                });
                            } else {
                                chrome.browserAction.setIcon({
                                    path: 'icons/icon19.png'
                                });
                            }
                        } else {
                            console.log(data);
                        }
                    });
                }
            }
        });
    }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    //Start connection
    connectToBackend();
    //Check user is logged
    if (isLogged()) {
        if (/^https?:\/\//.test(tab.url)) {
            if (window.hasOwnProperty('socket')) {
                window.socket.emit('url/exists', {
                    url: tab.url
                });
                window.socket.on('url/data', function(data) {
                    if (!data.hasOwnProperty('error')) {
                        chrome.browserAction.setBadgeBackgroundColor({
                            color: '#2cad0c',
                            tabId: tabId.tabId
                        });
                        if (data > 0) {
                            chrome.browserAction.setIcon({
                                path: 'icons/icon-fav19.png'
                            });
                        } else {
                            chrome.browserAction.setIcon({
                                path: 'icons/icon19.png'
                            });
                        }
                    } else {
                        console.log(data);
                    }
                });
            }
        }
    }
});
