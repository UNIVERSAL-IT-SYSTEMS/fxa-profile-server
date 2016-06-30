/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// NOTE: this code is from fxa-auth-server with minor changes.

var P = require('./promise')
var Pool = require('./pool')

// NOTE: instead of getting error here probably need to use `const AppError = require('./error');` see other files in this server
module.exports = function (log, error) {

  function Customs(url) {
    if (url === 'none') {
      this.pool = {
        post: function () { return P.resolve({ block: false })},
        close: function () {}
      }
    }
    else {
      this.pool = new Pool(url, { timeout: 1000 })
    }
  }

  // NOTE: this probably hit a different endpoint such as "checkApi" or "checkAuthenticated"
  // which means this customs check was via an authenticated access.
  Customs.prototype.check = function (ip, email, action) {
    log.trace({ op: 'customs.check', email: email, action: action })
    return this.pool.post(
      '/check',
      {
        ip: ip,
        email: email,
        action: action
      }
    )
      .then(
        function (result) {
          if (result.block) {
          
            throw error.tooManyRequests(result.retryAfter)
          }
        },
        function (err) {
          log.error({ op: 'customs.check.1', email: email, action: action, err: err })
          // If this happens, either:
          // - (1) the url in config doesn't point to a real customs server
          // - (2) the customs server returned an internal server error
          // Either way, allow the request through so we fail open.
        }
      )
  }

  Customs.prototype.close = function () {
    return this.pool.close()
  }

  return Customs
}
