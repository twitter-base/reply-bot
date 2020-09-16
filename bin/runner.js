#!/usr/bin/env node
/* Copyright 2020 Drewry Pope
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import bot from '../lib/index.js'
import sleep from 'sleep-atomic'
import timeout from 'timeout' // replace with p-timeout? fix bot to not need restart?
timeout.timeout('myTimeout', (process.argv[2] || process.env.RUNNER_SECONDS || (60 * 60)) * 1000, function () {
sleep(2000);
  try {
    bot.startSunc();
    return true;
  } catch (ex) {
    bot.removeWebhooks()
    console.dir(ex, {depth: null});
    throw ex;
  }
  return false;
});
