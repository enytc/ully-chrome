/*
 * ully
 * https://ully.in
 *
 * Copyright (c) 2014, EnyTC Corporation
 */

'use strict';

document.title = chrome.i18n.getMessage('app_options_title');
if (document.getElementById('i18n-copyright-year')) {
    document.getElementById('i18n-copyright-year').innerHTML = '&copy; ' + new Date().getFullYear();
}

//setMessage

function setMessage(id, key, data) {
    if (document.getElementById('i18n-' + id)) {
        document.getElementById('i18n-' + id).innerHTML = chrome.i18n.getMessage(key, data);
    }
}

function setPlaceholder(name, key, data) {
    if (document.getElementsByName(name)[0]) {
        document.getElementsByName(name)[0].placeholder = chrome.i18n.getMessage(key, data);
    }
}

//Translations

setMessage('login-title', 'login_title');
setMessage('login-note', 'login_note');
setMessage('popup-note', 'popup_note');

setPlaceholder('email', 'input_email');
setMessage('input-error-email', 'input_error_email');

setPlaceholder('password', 'input_password');
setMessage('input-error-password', 'input_error_password');

setPlaceholder('title', 'input_title');

setPlaceholder('url', 'input_url');
setMessage('input-error-url', 'input_error_url');

setPlaceholder('description', 'input_description');

setMessage('input-collection', 'input_collection');
setMessage('input-error-collection', 'input_error_collection');

setMessage('button-login', 'button_login');

setMessage('button-create-account', 'button_create_account');

setMessage('button-import', 'button_import');

setMessage('button-export', 'button_export');

setMessage('button-logout', 'button_logout');

setMessage('button-access-account', 'button_access_account');

setMessage('button-save', 'button_save');

setMessage('options-title', 'options_title');
