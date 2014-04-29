/*
 * ully
 * https://ully.in
 *
 * Copyright (c) 2014, EnyTC Corporation
 */

'use strict';

var ullyExtension = angular.module('ullyExtension', ['ngResetForm', 'ngMd5']);

ullyExtension.factory('$utils', function utils($window, md5) {
    return {
        uri: 'https://ully.herokuapp.com/api',
        email: function (email) {
            return md5.createHash(email || '');
        },
        gravatar: function (email, size) {
            size = size || '80';
            email = md5.createHash(email || '');
            return 'https://www.gravatar.com/avatar/' + email + '?s=' + size;
        },
        login: function (access_token) {
            var ully = {
                access_token: access_token
            };
            $window.localStorage.ully = JSON.stringify(ully);
            return true;
        },
        logged: function () {
            var userData = JSON.parse($window.localStorage.ully || '{}');
            if (userData.hasOwnProperty('access_token') && userData.access_token.length > 1) {
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
            if (userData.hasOwnProperty('access_token') && userData.access_token.length > 1) {
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
                $http.post($utils.uri + '/forgot/access_token', $scope.user)
                    .success(function (data, status) {
                        if (status == 200) {
                            $scope.loading = false;
                            $utils.login(data.response.access_token);
                            $utils.refresh();
                        }
                    })
                    .error(function (data, status) {
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
            $http.get($utils.uri + '/me?access_token=' + $utils.getData().access_token)
                .success(function (data, status) {
                    if (status == 200) {
                        $scope.loading = false;
                        $scope.user = data.response;
                        $utils.setUserData(data.response);
                    }
                })
                .error(function (data, status) {
                    $scope.notification = {
                        show: true,
                        type: 'danger',
                        message: data.response.error
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
                $http.post($utils.uri + '/collections/' + collectionSlug + '/urls?access_token=' + $utils.getData().access_token, newUrl)
                    .success(function (data, status) {
                        if (status == 200) {
                            $scope.notification = {
                                show: true,
                                type: 'success',
                                message: data.response.msg
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
                            message: data.response.error
                        };
                        $scope.loading = false;
                    });
            }
        };

        $scope.refresh = function () {
            $scope.loadingPage = true;
            $http.get($utils.uri + '/collections?access_token=' + $utils.getData().access_token)
                .success(function (data, status) {
                    if (status == 200) {
                        $scope.loadingPage = false;
                        $scope.collectionsList = data.response;
                        $collections.save(data.response);
                    }
                })
                .error(function (data, status) {
                    $scope.notification = {
                        show: true,
                        type: 'danger',
                        message: data.response.error
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
