/*
 * ully
 * https://ully.io
 *
 * Copyright (c) 2014 EnyTC Corporation
 */

'use strict';

var ullyExtension = angular.module('ullyExtension', ['ngResetForm', 'ngMd5']);

ullyExtension.factory('$utils', function utils($window, md5) {
    return {
        email: function (email) {
            return md5.createHash(email || '');
        },
        gravatar: function (email, size) {
            size = size || '80';
            email = md5.createHash(email || '');
            return 'https://www.gravatar.com/avatar/' + email + '?s=' + size;
        },
        login: function (token) {
            var ully = {
                token: token
            };
            $window.localStorage.ully = JSON.stringify(ully);
            return true;
        },
        logged: function () {
            var userData = JSON.parse($window.localStorage.ully || '{}');
            if (userData.hasOwnProperty('token') && userData.token.length > 1) {
                return true;
            } else {
                return false;
            }
        },
        logout: function () {
            delete $window.localStorage.ully;
            return true;
        },
        refresh: function () {
            $window.location = "/options/index.html";
        },
        getData: function () {
            var userData = JSON.parse($window.localStorage.ully || '{}');
            if (userData.hasOwnProperty('token') && userData.token.length > 1) {
                return userData;
            } else {
                return {};
            }
        },
        getUserData: function () {
            var userData = JSON.parse($window.localStorage.ullyUser || '{}');
            if (userData.hasOwnProperty('username') && userData.username.length > 1) {
                return userData;
            } else {
                return {};
            }
        },
        setUserData: function (user) {
            var ullyUser = {
                name: user.name,
                username: user.username
            };
            $window.localStorage.ullyUser = JSON.stringify(ullyUser);
            return true;
        }
    };
});

ullyExtension.factory('$collections', function collections($window) {
    return {
        get: function () {
            var collectionsData = JSON.parse($window.localStorage.ullyCollections || '[]');
            if (collectionsData && collectionsData.length) {
                return collectionsData;
            } else {
                return [];
            }
        },
        save: function (collections) {
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

        $scope.submit = function (isValid) {
            if (isValid) {
                $scope.loading = true;
                $http.post('https://ully.herokuapp.com' + '/forgot/token', $scope.user)
                    .success(function (data, status) {
                        if (status == 200) {
                            $scope.loading = false;
                            $utils.login(data.token);
                            $utils.refresh();
                        }
                    })
                    .error(function (data, status) {
                        $scope.notification = {
                            show: true,
                            type: 'danger',
                            message: data.error
                        };
                        $scope.loading = false;
                        $scope.logged = false;
                    });
            }
        };
    }
]);

ullyExtension.controller('optionsCtrl', ['$scope', '$http', '$utils',
    function optionsCtrl($scope, $http, $utils) {

        $scope.logged = $utils.logged();
        $scope.gravatar = $utils.gravatar;

        $scope.logout = function () {
            $utils.logout();
            $utils.refresh();
        };

        $scope.refresh = function () {
            $scope.loading = true;
            $http.get('https://ully.herokuapp.com' + '/me?access_token=' + $utils.getData().token)
                .success(function (data, status) {
                    if (status == 200) {
                        $scope.loading = false;
                        $scope.user = data;
                        $utils.setUserData(data);
                    }
                })
                .error(function (data, status) {
                    $scope.notification = {
                        show: true,
                        type: 'danger',
                        message: data.error
                    };
                    $scope.loading = false;
                    $scope.logged = false;
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

        $scope.optionsPage = function () {
            chrome.tabs.create({
                url: chrome.extension.getURL("options/index.html")
            });
        };

        $scope.submit = function (isValid) {
            if (isValid) {
                $scope.loading = true;
                var newUrl = {
                    title: $scope.url.title,
                    url: $scope.url.url,
                    description: $scope.url.description
                };
                var collectionSlug = $scope.url.collection;
                $http.post('https://ully.herokuapp.com' + '/collections/' + collectionSlug + '/urls?access_token=' + $utils.getData().token, newUrl)
                    .success(function (data, status) {
                        if (status == 200) {
                            $scope.notification = {
                                show: true,
                                type: 'success',
                                message: data.message
                            };
                            $scope.loading = false;
                            $scope.createUrlForm.$setPristine();
                            $scope.url = {};
                        }
                    })
                    .error(function (data, status) {
                        $scope.notification = {
                            show: true,
                            type: 'danger',
                            message: data.error
                        };
                        $scope.loading = false;
                    });
            }
        };

        $scope.refresh = function () {
            $scope.loadingPage = true;
            $http.get('https://ully.herokuapp.com' + '/collections?access_token=' + $utils.getData().token)
                .success(function (data, status) {
                    if (status == 200) {
                        $scope.loadingPage = false;
                        $scope.collectionsList = data;
                        $collections.save(data);
                    }
                })
                .error(function (data, status) {
                    $scope.notification = {
                        show: true,
                        type: 'danger',
                        message: data.error
                    };
                    $scope.loadingPage = false;
                });
        };

        if ($scope.logged) {
            $scope.refresh();
        }

        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function (tab) {
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
