/*
 * ully-chrome
 * https://github.com/ullyin/ully-chrome
 *
 * Copyright (c) 2015, EnyTC Corporation
 */

'use strict';

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
    //Check user is logged
    if (isLogged()) {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tab) {
            var tabUrl;
            if(tab instanceof Array && tab[0].hasOwnProperty('url')) {
                tabUrl = tab[0].url;
            } else {
                tabUrl = '';
            }
            if (/^https?:\/\//.test(tabUrl)) {
                if (window.hasOwnProperty('socket')) {
                    window.socket.emit('/api/collections/url', {
                        url: tab[0].url
                    });
                    window.socket.on('/api/collections/url/exists', function(data) {
                        if (data.exists > 0) {
                            chrome.browserAction.setIcon({
                                path: 'icons/icon-fav19.png'
                            });
                        } else {
                            chrome.browserAction.setIcon({
                                path: 'icons/icon19.png'
                            });
                        }
                    });
                    window.socket.on('/api/collections/url/exists/error', function(err) {
                        console.log(err);
                    });
                }
            } else {
                chrome.browserAction.setIcon({
                    path: 'icons/icon19.png'
                });
            }
        });
    }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    //Check user is logged
    if (isLogged()) {
        if (tab && /^https?:\/\//.test(tab.url)) {
            if (window.hasOwnProperty('socket')) {
                window.socket.emit('/api/collections/url', {
                    url: tab.url
                });
                window.socket.on('/api/collections/url/exists', function(data) {
                    if (data.exists > 0) {
                        chrome.browserAction.setIcon({
                            path: 'icons/icon-fav19.png'
                        });
                    } else {
                        chrome.browserAction.setIcon({
                            path: 'icons/icon19.png'
                        });
                    }
                });
                window.socket.on('/api/collections/url/exists/error', function(err) {
                    console.log(err);
                });
            }
        } else {
            chrome.browserAction.setIcon({
                path: 'icons/icon19.png'
            });
        }
    }
});
