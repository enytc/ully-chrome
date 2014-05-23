/*
 * ully
 * https://ully.in
 *
 * Copyright (c) 2014, EnyTC Corporation
 */

'use strict';

var ullyExtension = angular.module('ullyExtension', ['ngResetForm']);

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

// Bootstrap
angular.element(document).ready(function() {
    angular.bootstrap(document, ['ullyExtension']);
});

ullyExtension.factory('$utils', function utils($window) {
    return {
        uri: 'http://localhost:22792/api',
        gravatar: function(email, size) {
            size = size || '80';
            return 'https://www.gravatar.com/avatar/' + email + '?s=' + size;
        },
        login: function(email, access_token) {
            var ully = {
                email: email,
                access_token: access_token
            };
            $window.localStorage.ully = JSON.stringify(ully);
            return true;
        },
        logged: function() {
            var userData = JSON.parse($window.localStorage.ully || '{}');
            if (userData.hasOwnProperty('access_token') && userData.access_token.length > 1) {
                return true;
            } else {
                return false;
            }
        },
        logout: function() {
            delete $window.localStorage.ully;
            $window.socket.disconnect();
            return true;
        },
        refresh: function() {
            $window.location = "/options/index.html";
        },
        getData: function() {
            var userData = JSON.parse($window.localStorage.ully || '{}');
            if (userData.hasOwnProperty('access_token') && userData.access_token.length > 1) {
                return userData;
            } else {
                return {};
            }
        },
        getUserData: function() {
            var userData = JSON.parse($window.localStorage.ullyUser || '{}');
            if (userData.hasOwnProperty('username') && userData.username.length > 1) {
                return userData;
            } else {
                return {};
            }
        },
        setUserData: function(user) {
            var ullyUser = {
                name: user.name,
                username: user.username,
                hashedEmail: user.hashedEmail
            };
            $window.localStorage.ullyUser = JSON.stringify(ullyUser);
            return true;
        }
    };
});

ullyExtension.factory('$collections', function collections($window) {
    return {
        get: function() {
            var collectionsData = JSON.parse($window.localStorage.ullyCollections || '[]');
            if (collectionsData && collectionsData.length) {
                return collectionsData;
            } else {
                return [];
            }
        },
        save: function(collections) {
            var ullyCollections = [];
            for (var i = 0; i < collections.length; i++) {
                ullyCollections.push({
                    name: collections[i].name,
                    slug: collections[i].slug,
                    urls: collections[i].urls
                });
            };
            $window.localStorage.ullyCollections = JSON.stringify(ullyCollections);
            return true;
        }
    };
});

ullyExtension.controller('loginCtrl', ['$scope', '$http', '$utils',
    function loginCtrl($scope, $http, $utils) {

        $scope.logged = $utils.logged();

        $scope.submit = function(isValid) {
            if (isValid) {
                $scope.loading = true;
                $http.post($utils.uri + '/search/check', $scope.user)
                    .success(function(data, status) {
                        if (status === 200 && data.response.exists) {
                            $scope.loading = false;
                            $utils.login($scope.user.email, Whirlpool($scope.user.password).toLowerCase());
                            $utils.refresh();
                        }
                    })
                    .error(function(data, status) {
                        $scope.notification = {
                            show: true,
                            type: 'danger',
                            message: data.response.error
                        };
                        $scope.loading = false;
                        $scope.logged = false;
                    });
            }
        };
    }
]);

ullyExtension.controller('optionsCtrl', ['$scope', '$window', '$http', '$utils',
    function optionsCtrl($scope, $window, $http, $utils) {

        $scope.logged = $utils.logged();
        $scope.gravatar = $utils.gravatar;

        $scope.logout = function() {
            $utils.logout();
            $utils.refresh();
        };

        $scope.refresh = function() {
            $scope.loading = true;
            $window.socket.emit('account/info');
            $window.socket.on('account/info', function(data) {
                if (!data.hasOwnProperty('error')) {
                    $scope.loading = false;
                    $scope.user = data;
                    $scope.$apply();
                    $utils.setUserData(data);
                } else {
                    $scope.notification = {
                        show: true,
                        type: 'danger',
                        message: data.error.message || data.error
                    };
                    $scope.loading = false;
                    $scope.logged = false;
                    $scope.$apply();
                }
            });
        };

        if ($scope.logged) {
            $scope.refresh();
        }
    }
]);

ullyExtension.controller('ullyCtrl', ['$scope', '$window', '$http', '$collections', '$utils',
    function ullyCtrl($scope, $window, $http, $collections, $utils) {

        $scope.logged = $utils.logged();

        $scope.user = $utils.getUserData();

        $scope.url = {};

        $scope.optionsPage = function() {
            chrome.tabs.create({
                url: chrome.extension.getURL("options/index.html")
            });
        };

        $scope.submit = function(isValid) {
            if (isValid) {
                $scope.loading = true;
                var newUrl = {
                    title: $scope.url.title,
                    url: $scope.url.url,
                    description: $scope.url.description,
                    collectionSlug: $scope.url.collection
                };
                $window.socket.emit('collections/save', newUrl);
                $window.socket.on('collections/saved', function(data) {
                    if (!data.hasOwnProperty('error')) {
                        $scope.notification = {
                            show: true,
                            type: 'success',
                            message: data.msg
                        };
                        $scope.loading = false;
                        $scope.createUrlForm.$setPristine();
                        $scope.url = {};
                        $scope.$apply();
                        setTimeout(function(){
                            $window.close();
                        }, 3000);
                    } else {
                        $scope.notification = {
                            show: true,
                            type: 'danger',
                            message: data.error.message || data.error
                        };
                        $scope.loading = false;
                        $scope.$apply();
                    }
                });
            }
        };

        $scope.refresh = function() {
            $scope.loadingPage = true;
            $window.socket.emit('collections/get');
            $window.socket.on('collections/list', function(data) {
                if (!data.hasOwnProperty('error')) {
                    $scope.loadingPage = false;
                    $scope.collectionsList = data;
                    $collections.save(data);
                    $scope.$apply();
                } else {
                    $scope.notification = {
                        show: true,
                        type: 'danger',
                        message: data.error.message || data.error
                    };
                    $scope.loadingPage = false;
                    $scope.$apply();
                }
            });
        };

        if ($scope.logged) {
            $scope.refresh();
        }

        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tab) {
            var extUrl = chrome.extension.getURL("options/index.html");
            var regex = /^https?:\/\//;
            if (regex.test(tab[0].url)) {
                $scope.url.title = tab[0].title;
                $scope.url.url = tab[0].url;
                $scope.$apply();
            } else {
                if (tab[0].url !== extUrl) {
                    $window.close();
                }
            }
        });
    }
]);
