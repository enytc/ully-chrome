/*
 * ully
 * https://ully.in
 *
 * Copyright (c) 2014, EnyTC Corporation
 */

'use strict';

chrome.runtime.onInstalled.addListener(function (details) {
    chrome.tabs.create({
        url: 'https://ully.in/installed'
    });
});

chrome.omnibox.onInputEntered.addListener(function (command) {
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

chrome.omnibox.onInputChanged.addListener(function (text, suggest) {
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
        var selectedList = _.filter(suggestsList, function (val) {
            var re = new RegExp(text, 'g');
            return re.test(val.content);
        });
        suggest(selectedList);
    }
});
