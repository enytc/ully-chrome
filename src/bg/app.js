/*
 * ully-chrome
 * https://github.com/ullyin/ully-chrome
 *
 * Copyright (c) 2015, EnyTC Corporation
 */

'use strict';

var ullyExtension = angular.module('ullyExtension', ['ngResetForm', 'ngProgress']);

// Bootstrap
angular.element(document).ready(function() {
    angular.bootstrap(document, ['ullyExtension']);
});

ullyExtension.factory('$utils', function utils($window) {
    return {
        uri: ULLY_URI + '/api',
        gravatar: function(email, size) {
            size = size || '80';
            return 'https://www.gravatar.com/avatar/' + email + '?s=' + size;
        },
        login: function(access_token) {
            var ully = {
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
            $window.location = '/options/index.html';
        },
        importToBookmarkTree: function(bookmarks, cb) {
            cb = cb || function(message, imported) {};
            //Create root tree
            chrome.bookmarks.create({
                title: 'Ully'
            }, function(rootTree) {
                async.eachSeries(bookmarks, function(bookmark, callback) {
                    chrome.bookmarks.create({
                        parentId: rootTree.id,
                        title: bookmark.title
                    }, function(tree) {
                        async.eachSeries(bookmark.urls, function(url, callback2) {
                            chrome.bookmarks.create({
                                parentId: tree.id,
                                title: url.title || url.url,
                                url: url.url
                            }, function(urlTree) {
                                callback2();
                            });
                        }, function(err) {
                            if (err) {
                                return callback(err);
                            }
                            callback();
                        });
                    });
                }, function(err) {
                    if (err) {
                        return cb(err);
                    } else {
                        return cb(null, chrome.i18n.getMessage('import_success'));
                    }
                });
            });
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

ullyExtension.factory('$loading', function(ngProgress) {
    return {
        start: function() {
            ngProgress.height('4px');
            ngProgress.color('#27d4a8');
            ngProgress.start();
        },
        complete: function() {
            ngProgress.complete();
        }
    };
});

ullyExtension.factory('$socket', function($rootScope) {
    //Start connection
    var socketService;
    if (window.socket && window.socket.socket.connected) {
        socketService = window.socket;
    } else {
        socketService = connectToBackend();
    }
    return {
        on: function(eventName, callback) {
            socketService.on(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function(eventName, data, callback) {
            socketService.emit(eventName, data, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            });
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

ullyExtension.controller('loginCtrl', ['$scope', '$http', '$utils', '$loading',
    function loginCtrl($scope, $http, $utils, $loading) {

        $scope.logged = $utils.logged();

        $scope.submit = function(isValid) {
            if (isValid) {
                $scope.loading = true;
                $loading.start();
                $http.post($utils.uri + '/login', $scope.user)
                    .success(function(data, status) {
                        if (status === 200 && data.response.exists) {
                            $scope.loading = false;
                            $loading.complete();
                            $utils.login(data.response.access_token);
                            $utils.refresh();
                        } else {
                            $loading.complete();
                            $scope.notification = {
                                show: true,
                                type: 'danger',
                                message: data.response.msg
                            };
                            $scope.loading = false;
                            $scope.logged = false;
                        }
                    })
                    .error(function(data, status) {
                        if (data && data.response && data.response.error) {
                            $scope.notification = {
                                show: true,
                                type: 'danger',
                                message: data.response.error
                            };
                        }
                        $scope.loading = false;
                        $scope.logged = false;
                        $loading.complete();
                    });
            }
        };
    }
]);

ullyExtension.controller('optionsCtrl', ['$scope', '$window', '$http', '$socket', '$utils', '$loading',
    function optionsCtrl($scope, $window, $http, $socket, $utils, $loading) {

        $scope.logged = $utils.logged();
        $scope.gravatar = $utils.gravatar;

        $scope.exportToUlly = function() {
            $scope.notification = {
                show: false
            };
            //Get bookmarks
            chrome.bookmarks.getTree(function(results) {
                $loading.start();
                $scope.loadingExport = true;
                $scope.notification = {
                    show: true,
                    type: 'info',
                    message: chrome.i18n.getMessage('import_info')
                };
                //Send to Ully BookmarkService
                $socket.emit('/api/importer', {
                    bookmarks: results,
                    browser: 'google-chrome'
                });
                $socket.on('/api/importer/progress', function(data) {
                    $scope.notification = {
                        show: true,
                        type: 'info',
                        message: data.msg
                    };
                    NC('', data.msg);
                });
                $socket.on('/api/importer/imported', function(data) {
                    $loading.complete();
                    $scope.loadingExport = false;
                    $scope.notification = {
                        show: true,
                        type: 'success',
                        message: data.msg
                    };
                    NC('Success', data.msg);
                    setTimeout(function() {
                        chrome.tabs.create({
                            url: ULLY_URI + '/collections'
                        });
                    }, 3000);
                });
                $socket.on('/api/importer/error', function(err) {
                    $loading.complete();
                    $scope.loadingExport = false;
                    $scope.notification = {
                        show: true,
                        type: 'danger',
                        message: err
                    };
                    NC('', err);
                });
            });
        };

        $scope.importToChrome = function() {
            $scope.notification = {
                show: false
            };
            //Get bookmarks from Ully
            $loading.start();
            $scope.loadingImport = true;
            //Send to Ully BookmarkService
            $socket.emit('/api/exporter');
            $socket.on('/api/exporter/data', function(data) {
                $loading.complete();
                $utils.importToBookmarkTree(data.bookmarks, function(err, message) {
                    if (err) {
                        $scope.loadingImport = false;
                        $scope.notification = {
                            show: true,
                            type: 'danger',
                            message: err
                        };
                        $scope.$apply();
                        NC('', err);
                    } else {
                        $scope.loadingImport = false;
                        $scope.notification = {
                            show: true,
                            type: 'success',
                            message: message
                        };
                        $scope.$apply();
                        NC('', message);
                    }
                });
            });
            $socket.on('/api/exporter/error', function(err) {
                $loading.complete();
                $scope.loadingImport = false;
                $scope.notification = {
                    show: true,
                    type: 'danger',
                    message: err
                };
                NC('', err);
            });
        };

        $scope.logout = function() {
            $utils.logout();
            $utils.refresh();
        };

        $scope.refreshAccount = function() {
            $scope.loading = true;
            $loading.start();
            $socket.emit('/api/account');
            $socket.on('/api/account/data', function(data) {
                $scope.loading = false;
                $loading.complete();
                $scope.user = data;
                $utils.setUserData(data);
            });
            $socket.on('/api/account/error', function(err) {
                $scope.notification = {
                    show: true,
                    type: 'danger',
                    message: err
                };
                $scope.loading = false;
                $loading.complete();
            });
        };

        if ($scope.logged) {
            $scope.refreshAccount();
        }
    }
]);

ullyExtension.controller('ullyCtrl', ['$scope', '$window', '$http', '$socket', '$collections', '$utils',
    function ullyCtrl($scope, $window, $http, $socket, $collections, $utils) {

        $scope.logged = $utils.logged();

        $scope.user = $utils.getUserData();

        $scope.url = {};

        $scope.optionsPage = function() {
            chrome.tabs.create({
                url: chrome.extension.getURL('options/index.html')
            });
        };

        $scope.submit = function(isValid) {
            if (isValid) {
                $scope.loading = true;
                var newUrl = {
                    title: $scope.url.title,
                    url: $scope.url.url,
                    description: $scope.url.description,
                    slug: $scope.url.collection
                };
                $socket.emit('/api/collections/add', newUrl);
                $socket.on('/api/collections/url/created', function(data) {
                    $scope.notification = {
                        show: true,
                        type: 'success',
                        message: data.msg
                    };
                    $scope.loading = false;
                    $scope.createUrlForm.$setPristine();
                    $scope.url = {};
                    NC('Success', data.msg);
                    setTimeout(function() {
                        $window.close();
                    }, 1000);
                });
                $socket.on('/api/collections/url/error', function(err) {
                    $scope.notification = {
                        show: true,
                        type: 'danger',
                        message: err
                    };
                    $scope.loading = false;
                });
            }
        };

        $scope.refreshCollectionList = function() {
            $scope.loadingPage = true;
            $socket.emit('/api/collections');
            $socket.on('/api/collections/list', function(data) {
                $scope.loadingPage = false;
                $scope.collectionsList = data;
                $collections.save(data);
            });
            $socket.on('/api/collections/error', function(err) {
                $scope.notification = {
                    show: true,
                    type: 'danger',
                    message: err
                };
                $scope.loadingPage = false;
            });
        };

        if ($scope.logged) {
            $scope.refreshCollectionList();
        }

        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tab) {
            var extUrl = chrome.extension.getURL('options/index.html');
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
