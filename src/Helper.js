"use strict";

exports.splitN = function(s) { return function(lim) { return function(t) { return t.split(s, lim); }; }; };
