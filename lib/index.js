/* Copyright 2020 Drewry Pope
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https:// mozilla.org/MPL/2.0/. */

// import section
import {} from 'dotenv/config.js';
import tweet from 'twitter-tweet';
import autohook from 'twitter-autohook';
import fs from 'fs';
import Twitter from 'twitter-lite';
import unzalgo from 'unzalgo';
const { clean } = unzalgo;
import _weirdToNormalChars from 'weird-to-normal-chars';
const { weirdToNormalChars } = _weirdToNormalChars;
import replaceSpecialCharacters from 'replace-special-characters';
import anglicize from 'anglicize';
import _emojiRegex from 'emoji-regex/es2015/text.js';
import runes from 'runes';
import getPort from 'get-port';
import clone from 'rfdc';
import merge from 'deepmerge';
// import translitro from 'translitro';
// import Bleetify from 'bleetify';

// polyfill & 'custom method for standard object' sections
if (!Object.prototype.hasOwnProperty.call(RegExp, 'escape')) {
    /* jshint ignore:start */
    RegExp.escape = function (string) {
        // https:// developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
        // https:// github.com/benjamingr/RegExp.escape/issues/37
        return string.replace(/[.*+\-?^${}()|[\]\\]/gu, '\\$&'); // $& means the whole matched string
    };
    /* jshint ignore:end */
}
if (!Object.prototype.hasOwnProperty.call(String, 'replaceAll')) {
    String.prototype.replaceAll = function (find, replace) { // jshint ignore:line
        // https:// developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replaceAll
        // If you pass a RegExp to 'find', you _MUST_ include 'g' as a property.
        // TypeError: "replaceAll must be called with a global RegExp" not included, will silently cause significant errors. _MUST_ include 'g' as a property for RegExp.
        // String parameters to 'find' do not require special handling.
        // Does not conform to "special replacement patterns" when "Specifying a string as a parameter" for replace
        // Does not conform to "Specifying a function as a parameter" for replace
        return this.replace(
            Object.prototype.toString.call(find) === '[object RegExp]' ?
                find
                : new RegExp(RegExp.escape(find), 'gu'),
            replace
        );
    };
}

// global function const declaration section
const // there are more const function variables to follow,
    // until near eof where there is the 'export' section
    // github.com/josephrocca/emoji-and-symbol-regex/
    emojiRegex = () => new RegExp('('+_emojiRegex().toString().replace(/#\\\*0-9/gu, '')+'\uFE0F\u20E3|\uFE0F|\u20E3|' +
'(?:\u2658|\u2634|\u266C|\u263E|\u2624|\u2643|\u2607|\u260F|\u2625|\u266A|\u2647|\u261B|\u260C|\u2627|\u2605|\u265A|\u265E|\u2612|\u266F|\u265C|\u261A|\u260B|\u2644|\u2636|\u2667|\u2766|\u263C|\u2657|\u263D|\u260D|\u2641|\u2621|\u2637|\u2630|\u266B|\u2632|\u262D|\u2659|\u266D|\u2655|\u2654|\u2610|\u2613|\u265B|\u2628|\u2633|\u263B|\u2645|\u2664|\u2635|\u2629|\u260A|\u2661|\u2608|\u262B|\u2767|\u266E|\u270E|\u2765|\u2609|\u2662|\u265D|\u00A9|\u00AE|\u2122|\u20BF|\uD83D\uDD6C|\uD83D\uDDD4|\uD83D\uDDEB|\uD83D\uDDEE|\uD83D\uDDC9|\uD83D\uDDE0|\uD83D\uDDA2|\uD83D\uDDC0|\uD83D\uDDEA|\uD83D\uDD88|\uD83D\uDD48|\uD83D\uDDEC|\uD83D\uDD80|\uD83D\uDD97|\uD83D\uDEC6|\uD83D\uDD9F|\uD83D\uDDF2|\uD83D\uDD6B|\uD83D\uDDAF|\uD83D\uDD47|\uD83D\uDD6A|\uD83D\uDDC5|\uD83D\uDDB0|\uD83C\uDF22|\uD83D\uDDE9|\uD83D\uDDF4|\uD83D\uDD3F|\uD83D\uDDF0|\uD83D\uDD71|\uD83C\uDF98|\uD83D\uDDF6|\uD83D\uDDBD|\uD83D\uDDE4|\uD83D\uDDBF|\uD83D\uDDBB|\uD83D\uDDD5|\uD83D\uDD7C|\uD83D\uDEE8|\uD83C\uDF9D|\uD83D\uDD3E|\uD83D\uDD98|\uD83D\uDDA0|\uD83D\uDD8E|\uD83D\uDD69|\uD83D\uDDAB|\uD83D\uDDAC|\uD83D\uDDD8|\uD83D\uDDB8|\uD83D\uDEE6|\uD83D\uDDA1|\uD83D\uDD9C|\uD83D\uDDB7|\uD83D\uDEC9|\uD83C\uDFF2|\uD83D\uDEF1|\uD83D\uDD68|\uD83D\uDDC1|\uD83D\uDDC8|\uD83D\uDDCC|\uD83D\uDDE2|\uD83D\uDDB3|\uD83C\uDF95|\uD83D\uDD45|\uD83D\uDDD7|\uD83D\uDDDA|\uD83D\uDDF1|\uD83D\uDDCB|\uD83D\uDD9E|\uD83D\uDD6D|\uD83D\uDDD9|\uD83D\uDDF9|\uD83D\uDDB5|\uD83D\uDDD0|\uD83D\uDEEA|\uD83D\uDD8F|\uD83D\uDD99|\uD83D\uDDE7|\uD83C\uDF94|\uD83C\uDF23|\uD83D\uDD89|\uD83D\uDDB9|\uD83D\uDDE6|\uD83D\uDDA7|\uD83D\uDD9B|\uD83D\uDDAA|\uD83D\uDEE7|\uD83D\uDD9A|\uD83D\uDDAE|\uD83D\uDD86|\uD83D\uDDF8|\uD83D\uDDA6|\uD83C\uDF9C|\uD83D\uDDC7|\uD83D\uDEC8|\uD83D\uDDF5|\uD83D\uDD83|\uD83D\uDDBE|\uD83D\uDEC7|\uD83D\uDDBA|\uD83D\uDD93|\uD83D\uDECA|\uD83D\uDD7B|\uD83C\uDFF1|\uD83D\uDD44|\uD83D\uDD7E|\uD83D\uDD84|\uD83D\uDD9D|\uD83D\uDD92|\uD83D\uDD72|\uD83D\uDDC6|\uD83C\uDFF6|\uD83D\uDD85|\uD83D\uDDCD|\uD83D\uDDDF|\uD83D\uDDD6|\uD83D\uDDDB|\uD83D\uDDA9|\uD83D\uDD7D|\uD83D\uDDB4|\uD83D\uDD7F|\uD83D\uDD82|\uD83D\uDDE5|\uD83D\uDD91|\uD83D\uDCFE|\uD83D\uDD6E|\uD83D\uDDA3|\uD83D\uDEF2|\uD83D\uDDB6|\uD83D\uDDCE|\uD83D\uDD94|\uD83D\uDDCA|\uD83D\uDD46|\uD83D\uDDF7|\uD83D\uDDED|\uD83D\uDDAD|\uD83D\uDDCF|\uD83D\uDD81|\uD83D\uDD40|\uD83D\uDD42|\uD83D\uDD41|\uD83D\uDD43|\u26E5|\u26E2|\u26E4|\u26E6|\u26E7|\u26FB|\u26FE|\u26DA|\u26C6|\u26D9|\u26D5|\u26BF|\u26D2|\u26C9|\u26CA|\u26EB|\u26D8|\u26DB|\u26D6|\u26EE|\u26EC|\u26E8|\u269E|\u26FF|\u26DC|\u26D7|\u26E3|\u26CB|\u26DD|\u26DF|\u26D0|\u26EF|\u26FC|\u26CC|\u26F6|\u26CD|\u26E1|\u26E0|\u26DE|\u26C7|\u26ED|\u269F|\uD83C\uDC26|\uD83C\uDC1C|\uD83C\uDC13|\u26B4|\uD83C\uDC1A|\u26B6|\uD83C\uDC29|\uD83C\uDC1D|\uD83C\uDC06|\uD83C\uDC10|\uD83C\uDC0B|\uD83C\uDC28|\uD83C\uDC09|\uD83C\uDC00|\uD83C\uDC02|\uD83C\uDC16|\uD83C\uDC05|\uD83C\uDC17|\uD83C\uDC22|\u26C2|\u26C3|\uD83C\uDC0A|\uD83C\uDC20|\uD83C\uDC24|\u26BC|\uD83C\uDC1B|\uD83C\uDC11|\uD83C\uDC08|\u269D|\uD83C\uDC14|\uD83C\uDC0E|\u26BB|\uD83C\uDC21|\u26C1|\uD83C\uDC2B|\u26B9|\uD83C\uDC15|\uD83C\uDC18|\uD83C\uDC19|\u26B8|\uD83C\uDC0F|\uD83C\uDC23|\u26C0|\u26B7|\uD83C\uDC2A|\uD83C\uDC0D|\u26B5|\uD83C\uDC12|\u26BA|\uD83C\uDC1E|\u07F7\uD83C\uDC03|\u26B3|\uD83C\uDC07|\uD83C\uDC25|\uD83C\uDC27|\uD83C\uDC0C|\uD83C\uDC01|\uD83C\uDC1F|\u26B2|\u26A8|\u26AE|\u26AD|\u26A5|\u26AC|\u26A2|\u26A4|\u26AF|\u2698|\u26A6|\u269A|\u26A9|\u26A3|\u2690|\u268D|\u268E|\u268A|\u268C|\u268F|\u268B|\u2691|\u2687|\u2684|\u2676|\u267D|\u2678|\u2616|\u267C|\u2689|\u2683|\u2686|\u2682|\u2677|\u2673|\u267A|\u2688|\u2681|\u2674|\u2680|\u2679|\u2617|\u2685|\u2672|\u2675|\u2619|\u2671|\u2670|\u261F|\u262C|\u2656|\u2710|\u2669|\u261C|\u2646|\u2631|\u261E|\u2658|\u2634|\u266C|\u263E|\u2624|\u2643|\u2607|\u260F|\u2625|\u266A|\u2647|\u261B|\u260C|\u2627|\u2605|\u265A|\u265E|\u2612|\u266F|\u265C|\u261A|\u260B|\u2644|\u2636|\u2667|\u2766|\u263C|\u2657|\u263D|\u260D|\u2641|\u2621|\u2637|\u2630|\u266B|\u2632|\u262D|\u2659|\u266D|\u2655|\u2654|\u2610|\u2613|\u265B|\u2628|\u2633|\u263B|\u2645|\u2664|\u2635|\u2629|\u260A|\u2661|\u2608|\u262B|\u2767|\u266E|\u270E|\u2765|\u2609|\u2662|\u265D)|'+
'(?:(?:\u2658|\u2634|\u266C|\u263E|\u2624|\u2643|\u2607|\u260F|\u2625|\u266A|\u2647|\u261B|\u260C|\u2627|\u2605|\u265A|\u265E|\u2612|\u266F|\u265C|\u261A|\u260B|\u2644|\u2636|\u2667|\u2766|\u263C|\u2657|\u263D|\u260D|\u2641|\u2621|\u2637|\u2630|\u266B|\u2632|\u262D|\u2659|\u266D|\u2655|\u2654|\u2610|\u2613|\u265B|\u2628|\u2633|\u263B|\u2645|\u2664|\u2635|\u2629|\u260A|\u2661|\u2608|\u262B|\u2767|\u266E|\u270E|\u2765|\u2609|\u2662|\u265D|\u00A9|\u00AE|\u2122|\u20BF|\uD83D\uDD6C|\uD83D\uDDD4|\uD83D\uDDEB|\uD83D\uDDEE|\uD83D\uDDC9|\uD83D\uDDE0|\uD83D\uDDA2|\uD83D\uDDC0|\uD83D\uDDEA|\uD83D\uDD88|\uD83D\uDD48|\uD83D\uDDEC|\uD83D\uDD80|\uD83D\uDD97|\uD83D\uDEC6|\uD83D\uDD9F|\uD83D\uDDF2|\uD83D\uDD6B|\uD83D\uDDAF|\uD83D\uDD47|\uD83D\uDD6A|\uD83D\uDDC5|\uD83D\uDDB0|\uD83C\uDF22|\uD83D\uDDE9|\uD83D\uDDF4|\uD83D\uDD3F|\uD83D\uDDF0|\uD83D\uDD71|\uD83C\uDF98|\uD83D\uDDF6|\uD83D\uDDBD|\uD83D\uDDE4|\uD83D\uDDBF|\uD83D\uDDBB|\uD83D\uDDD5|\uD83D\uDD7C|\uD83D\uDEE8|\uD83C\uDF9D|\uD83D\uDD3E|\uD83D\uDD98|\uD83D\uDDA0|\uD83D\uDD8E|\uD83D\uDD69|\uD83D\uDDAB|\uD83D\uDDAC|\uD83D\uDDD8|\uD83D\uDDB8|\uD83D\uDEE6|\uD83D\uDDA1|\uD83D\uDD9C|\uD83D\uDDB7|\uD83D\uDEC9|\uD83C\uDFF2|\uD83D\uDEF1|\uD83D\uDD68|\uD83D\uDDC1|\uD83D\uDDC8|\uD83D\uDDCC|\uD83D\uDDE2|\uD83D\uDDB3|\uD83C\uDF95|\uD83D\uDD45|\uD83D\uDDD7|\uD83D\uDDDA|\uD83D\uDDF1|\uD83D\uDDCB|\uD83D\uDD9E|\uD83D\uDD6D|\uD83D\uDDD9|\uD83D\uDDF9|\uD83D\uDDB5|\uD83D\uDDD0|\uD83D\uDEEA|\uD83D\uDD8F|\uD83D\uDD99|\uD83D\uDDE7|\uD83C\uDF94|\uD83C\uDF23|\uD83D\uDD89|\uD83D\uDDB9|\uD83D\uDDE6|\uD83D\uDDA7|\uD83D\uDD9B|\uD83D\uDDAA|\uD83D\uDEE7|\uD83D\uDD9A|\uD83D\uDDAE|\uD83D\uDD86|\uD83D\uDDF8|\uD83D\uDDA6|\uD83C\uDF9C|\uD83D\uDDC7|\uD83D\uDEC8|\uD83D\uDDF5|\uD83D\uDD83|\uD83D\uDDBE|\uD83D\uDEC7|\uD83D\uDDBA|\uD83D\uDD93|\uD83D\uDECA|\uD83D\uDD7B|\uD83C\uDFF1|\uD83D\uDD44|\uD83D\uDD7E|\uD83D\uDD84|\uD83D\uDD9D|\uD83D\uDD92|\uD83D\uDD72|\uD83D\uDDC6|\uD83C\uDFF6|\uD83D\uDD85|\uD83D\uDDCD|\uD83D\uDDDF|\uD83D\uDDD6|\uD83D\uDDDB|\uD83D\uDDA9|\uD83D\uDD7D|\uD83D\uDDB4|\uD83D\uDD7F|\uD83D\uDD82|\uD83D\uDDE5|\uD83D\uDD91|\uD83D\uDCFE|\uD83D\uDD6E|\uD83D\uDDA3|\uD83D\uDEF2|\uD83D\uDDB6|\uD83D\uDDCE|\uD83D\uDD94|\uD83D\uDDCA|\uD83D\uDD46|\uD83D\uDDF7|\uD83D\uDDED|\uD83D\uDDAD|\uD83D\uDDCF|\uD83D\uDD81|\uD83D\uDD40|\uD83D\uDD42|\uD83D\uDD41|\uD83D\uDD43|\u26E5|\u26E2|\u26E4|\u26E6|\u26E7|\u26FB|\u26FE|\u26DA|\u26C6|\u26D9|\u26D5|\u26BF|\u26D2|\u26C9|\u26CA|\u26EB|\u26D8|\u26DB|\u26D6|\u26EE|\u26EC|\u26E8|\u269E|\u26FF|\u26DC|\u26D7|\u26E3|\u26CB|\u26DD|\u26DF|\u26D0|\u26EF|\u26FC|\u26CC|\u26F6|\u26CD|\u26E1|\u26E0|\u26DE|\u26C7|\u26ED|\u269F|\uD83C\uDC26|\uD83C\uDC1C|\uD83C\uDC13|\u26B4|\uD83C\uDC1A|\u26B6|\uD83C\uDC29|\uD83C\uDC1D|\uD83C\uDC06|\uD83C\uDC10|\uD83C\uDC0B|\uD83C\uDC28|\uD83C\uDC09|\uD83C\uDC00|\uD83C\uDC02|\uD83C\uDC16|\uD83C\uDC05|\uD83C\uDC17|\uD83C\uDC22|\u26C2|\u26C3|\uD83C\uDC0A|\uD83C\uDC20|\uD83C\uDC24|\u26BC|\uD83C\uDC1B|\uD83C\uDC11|\uD83C\uDC08|\u269D|\uD83C\uDC14|\uD83C\uDC0E|\u26BB|\uD83C\uDC21|\u26C1|\uD83C\uDC2B|\u26B9|\uD83C\uDC15|\uD83C\uDC18|\uD83C\uDC19|\u26B8|\uD83C\uDC0F|\uD83C\uDC23|\u26C0|\u26B7|\uD83C\uDC2A|\uD83C\uDC0D|\u26B5|\uD83C\uDC12|\u26BA|\uD83C\uDC1E|\u07F7\uD83C\uDC03|\u26B3|\uD83C\uDC07|\uD83C\uDC25|\uD83C\uDC27|\uD83C\uDC0C|\uD83C\uDC01|\uD83C\uDC1F|\u26B2|\u26A8|\u26AE|\u26AD|\u26A5|\u26AC|\u26A2|\u26A4|\u26AF|\u2698|\u26A6|\u269A|\u26A9|\u26A3|\u2690|\u268D|\u268E|\u268A|\u268C|\u268F|\u268B|\u2691|\u2687|\u2684|\u2676|\u267D|\u2678|\u2616|\u267C|\u2689|\u2683|\u2686|\u2682|\u2677|\u2673|\u267A|\u2688|\u2681|\u2674|\u2680|\u2679|\u2617|\u2685|\u2672|\u2675|\u2619|\u2671|\u2670|\u261F|\u262C|\u2656|\u2710|\u2669|\u261C|\u2646|\u2631|\u261E|\u2658|\u2634|\u266C|\u263E|\u2624|\u2643|\u2607|\u260F|\u2625|\u266A|\u2647|\u261B|\u260C|\u2627|\u2605|\u265A|\u265E|\u2612|\u266F|\u265C|\u261A|\u260B|\u2644|\u2636|\u2667|\u2766|\u263C|\u2657|\u263D|\u260D|\u2641|\u2621|\u2637|\u2630|\u266B|\u2632|\u262D|\u2659|\u266D|\u2655|\u2654|\u2610|\u2613|\u265B|\u2628|\u2633|\u263B|\u2645|\u2664|\u2635|\u2629|\u260A|\u2661|\u2608|\u262B|\u2767|\u266E|\u270E|\u2765|\u2609|\u2662|\u265D)|(?:\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67)\uDB40\uDC7F|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC68(?:\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|[\u2695\u2696\u2708]\uFE0F|\uD83D[\uDC66\uDC67]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708])\uFE0F|\uD83C[\uDFFB-\uDFFF])|\uD83E\uDDD1(?:(?:\uD83C[\uDFFB-\uDFFF])\u200D(?:\uD83E\uDD1D\u200D\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69])(?:\uD83C[\uDFFB-\uDFFE])|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69])(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69])(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69])(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83D\uDC69\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69])(?:\uD83C[\uDFFC-\uDFFF])|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83C\uDFF3\uFE0F\u200D\u26A7|\uD83E\uDDD1(?:(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDC3B\u200D\u2744|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F\u200D[\u2640\u2642]|(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642])|\uD83C\uDFF4\u200D\u2620|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E-\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3C-\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDF])\u200D[\u2640\u2642])\uFE0F|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF6\uD83C\uDDE6|\uD83C\uDDF4\uD83C\uDDF2|\uD83D\uDC08\u200D\u2B1B|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|[#*0-9]\uFE0F\u20E3|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270A-\u270D]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDCAA\uDD74\uDD7A\uDD90\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2-\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])|(?:[\u203C\u2049\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26A7\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5-\uDED7\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDD77\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD]))\uFE0F?)'  +
')', 'gu'),
    { Autohook } = autohook,
    getNewPort = async () => {
        // Will use any port from 49152 to 65535, otherwise fall back to a random port;
        return getPort({ port: getPort.makeRange(49152, 65535), });
    },
    removeWebhooks = async () => {
        const _port = await getNewPort();
        return new Autohook({ port: _port, }).removeWebhooks();
    },
    processLog = (reason) => {
        if (process.env.HEADLESS.toString().toUpperCase().trim() === 'TRUE') {
            console.log(JSON.stringify(reason));
        } else {
            console.dir(reason, { depth: null, });
        }
    },
    processError = (reason) => {
        if (
            (process.env.HEADLESS || '').toString().toUpperCase().trim() !==
            'TRUE'
        ) {
            processLog(reason);
        }
        console.error(JSON.stringify(reason));
    },
    tweetThreadReply = async (thread, id, params) => {
        if (typeof thread === 'undefined' || thread === null || thread === '') {
            return { thread, id, params, };
        } else {
            return tweet.send(
                params || {
                    subdomain: 'api',
                    version: '1.1',
                    consumer_key: process.env.TWITTER_CONSUMER_KEY,
                    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
                    access_token_key:
                        process.env.TWITTER_ACCESS_TOKEN ||
                        process.env.ACCESS_TOKEN, // oauth
                    access_token_secret:
                        process.env.TWITTER_ACCESS_TOKEN_SECRET ||
                        process.env.ACCESS_TOKEN_SECRET, // oauth
                },
                [thread,].flat(Infinity), //.map(x => Bleetify.bleet(x * 0.02))
                id,
                false
            );
        }
    },
    stringify = (json) => {
        return JSON.stringify(json) + '\n';
    },
    getSignature = (
        user_screen_name,
        bot_screen_name,
        tweet_tag_or_id,
        signature
    ) => {
        if (signature === 'none' || !signature) {
            return '';
        }
        return signature
            .toString()
            .replaceAll('USER_SCREEN_NAME', user_screen_name || 'Twitter Human')
            .replaceAll('BOT_SCREEN_NAME', bot_screen_name || 'twetJs')
            .replaceAll('TWEET_ID_OR_TAG', tweet_tag_or_id || '??');
    },
    trimPath = (text) => text.replaceAll(/[\\/]$/gu, ''),
    appendLog = (
        log_dir,
        module_name,
        log_name,
        jsonObject,
        optional_date_time
    ) => {
        const filename =
            trimPath(log_dir) +
            '/' +
            module_name +
            '.' +
            log_name +
            '.' +
            (optional_date_time || new Date().toISOString().slice(0, 10)) +
            '.json';
        fs.appendFile(filename, stringify(jsonObject), 'utf8', (err) => {
            if (err) {
                throw err;
            }
        });
        processLog({ log_append: filename, });
    },
    getProperty = (obj, prop, optional_fallback) => {
        const fallback =
            typeof optional_fallback === 'undefined' ? null : optional_fallback;
        if (typeof obj !== 'object' || obj === null) {
            return fallback;
        } else {
            if (
                Object.prototype.hasOwnProperty.call(obj, prop) &&
                obj.length === 0
            ) {
                return fallback;
            } else {
                return Object.prototype.hasOwnProperty.call(obj, prop) ?
                    obj[prop]
                    : fallback;
            }
        }
    },
    unlink = (text) => {
        return text.toString().replaceAll('@', '@ ').replaceAll('#', '# ');
    },
    normalizeCharacters = (text) => {
        // translitro Bleetify
        return anglicize(
            replaceSpecialCharacters(weirdToNormalChars(clean(text.toString())))
        )
            .toLowerCase()
            .trim();
    },
    getEmoji = (text) => {
        const regex = emojiRegex();
        return text.toString().match(regex);
    },
    normalizeSpaces = (text) => text.replaceAll(/ +/gu, ' '),
    normalizeNewlines = (text) =>
        text.replaceAll(/\n\n+/gu, '\n\n').replaceAll(/\n\n+/gu, '\n\n'),
    trimAllLines = (text) =>
        text
            .split('\n')
            .map((line) => line.trim())
            .join('\n'),
    collapseExtraSingleSpaces = (text) => {
        let output = normalizeNewlines(normalizeSpaces(trimAllLines(text)));
        const spaceMatches = output.match(/[ \n\t]\S( \S)+ \S \S[ \n\t]/gu);
        const newlineMatches = output.match(
            /(^|\n)+(\S{1}[ ?!.]{0,2}(\s|$)+)+/gu
        );
        const tabMatches = output.match(
            /[ \n\t]\S[ \n]*(\t\S[ \n]*)+[ \n\t]/gu
        );
        let count = 0;
        if (
            typeof spaceMatches !== 'undefined' &&
            spaceMatches &&
            spaceMatches.length > 0
        ) {
            spaceMatches.forEach((match) => {
                output = output.replaceAll(
                    match,
                    match.charAt(0).replaceAll(/\S/gu, '') +
                        match.replaceAll(/\s/gu, '') +
                        match.charAt(match.length - 1).replaceAll(/\S/gu, '')
                );
                count += 1;
            });
        }
        if (
            typeof newlineMatches !== 'undefined' &&
            newlineMatches &&
            newlineMatches.length > 0
        ) {
            newlineMatches.forEach((match) => {
                const intermediate = match.split('\n\n');
                count += intermediate.length;
                output = output.replaceAll(
                    match,
                    match.charAt(0).replaceAll(/\S/gu, '') +
                        intermediate
                            .map((value) => value.replaceAll(/\s/gu, ''))
                            .join('\n\n') +
                        match.charAt(match.length - 1).replaceAll(/\S/gu, '')
                );
            });
        }
        if (
            typeof tabMatches !== 'undefined' &&
            tabMatches &&
            tabMatches.length > 0
        ) {
            tabMatches.forEach((match) => {
                output = output.replaceAll(
                    match,
                    match.charAt(0).replaceAll(/\S/gu, '') +
                        match.replaceAll(/\s/gu, '') +
                        match.charAt(match.length - 1).replaceAll(/\S/gu, '')
                );
                count += 1;
            });
        }
        return { text: output, count, };
    },
    removeEmoji = (text) => {
        const regex = emojiRegex();
        return collapseExtraSingleSpaces(
            normalizeSpaces(
                text
                    .toString()
                    .replaceAll(regex, ' ')
                    .replaceAll(/\s\n\s/gu, ' \n')
            )
        );
    },
    emojiCount = (text) => (getEmoji(text.toString()) || []).length,
    isEmojiRidden = (text) => {
        const characterCount = (runes(text.toString()) || []).length;
        const _emojiCount = emojiCount(text.toString());
        const firstCharactersEmojiCount = emojiCount(
            runes.substr(text, 0, 10).toString()
        );
        const spaceCount = (text.toString().match(/ /gu) || []).length;
        const whitespaceCount = (text.toString().match(/[ ].*/gu) || []).length;
        console.dir({
            text,
            characterCount,
            _emojiCount,
            firstCharactersEmojiCount,
            spaceCount,
            whitespaceCount,
        });
        if (
            _emojiCount > 3 &&
            (_emojiCount > spaceCount * 0.5 ||
                _emojiCount > whitespaceCount ||
                _emojiCount > characterCount * 0.25 ||
                firstCharactersEmojiCount > 3)
        ) {
            return _emojiCount;
        } else {
            return false;
        }
    },
    makeUnique = (text) => String.prototype.concat(...new Set(text)),
    cleanText = (text) => {
        console.dir({ text, });
        return normalizeCharacters(unlink(text));
    },
    isObject = obj => typeof obj === 'object' && obj !== null,
    cleanEmoji = (text) => {
        if (typeof text !== 'undefined' && text !== null && text !== '') {
            const emojiCount = isEmojiRidden(text);
            const cleanedText = removeEmoji(text);
            if (emojiCount !== false) {
                return {
                    text: cleanedText.text,
                    alterations:
                        '\nRemoved ' +
                        emojiCount +
                        ' of ' +
                        runes(makeUnique(getEmoji(text).join(''))).length +
                        ' emoji, including ' +
                        makeUnique(
                            runes.substr(
                                makeUnique(getEmoji(text).join('')),
                                0,
                                runes(makeUnique(getEmoji(text).join('')))
                                    .length > 11 ? 3 : 2
                            ) +
                                makeUnique(
                                    runes.substr(
                                        makeUnique(getEmoji(text).join('')),
                                        runes(
                                            makeUnique(getEmoji(text).join(''))
                                        ).length > 7 ?
                                            runes(
                                                makeUnique(
                                                    getEmoji(text).join('')
                                                )
                                            ).length - 3
                                            : runes(
                                                makeUnique(
                                                    getEmoji(text).join('')
                                                )
                                            ).length - 2,
                                        runes(
                                            makeUnique(getEmoji(text).join(''))
                                        ).length - 1
                                    )
                                )
                        ) +
                        '.' +
                        (cleanedText.count > 0 ?
                            '\nCollapsed ' +
                              cleanedText.count +
                              'exploded word' +
                              (cleanedText.count === 1 ? '' : 's') +
                              '.'
                            : '') +
                        '\nRemoved uppercase, fonts, math, diacritics.',
                };
            } else {
                return {
                    text: collapseExtraSingleSpaces(
                        normalizeSpaces(text.toString())
                    ).text.replaceAll(/\s\n\s/gu, ' \n'),
                    alterations:
                        (cleanedText.count > 0 ?
                            '\nCollapsed ' +
                              cleanedText.count +
                              ' exploded word' +
                              (cleanedText.count === 1 ? '' : 's') +
                              '.'
                            : '') +
                        '\nRemoved Uppercase, Fonts, Math, Diacritics.',
                };
            }
        } else {
            return {
                text: text,
                alterations: '\n[ Error: Received empty text?.',
            };
        }
    },
    urlExpand = (text, urls, mediaUrls, skipUrls) => {
        let output = text;
        if (Array.isArray(urls) && urls.length > 0) {
            urls.forEach((urlValue) => {
                output = output.replaceAll(
                    new RegExp(RegExp.escape(urlValue.url), 'ig'),
                    (typeof skipUrls !== 'undefined' ?
                        [skipUrls,].flat(Infinity)
                        : []
                    ).includes(urlValue.expanded_url) ?
                        ' [\'Quote-Tweet\'] '
                        : urlValue.expanded_url
                );
            });
        }
        if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
            mediaUrls.forEach((urlValue) => {
                output = output.replaceAll(
                    new RegExp(RegExp.escape(urlValue.url), 'ig'),
                    urlValue.expanded_url
                );
            });
        }
        return output;
    },
    replaceEmptyLines = (text, replace) =>
        text.replaceAll(/\n\s*\n/gu, replace),
    reduceEmptyLinesToSingle = (text) => replaceEmptyLines(text, '\n\n'),
    // removeEmptyLines = text => replaceEmptyLines(text, '\n'),
    // leftTrimAllLines = text => text.split('\n').map(line => line.replaceAll(/^\s+/gu,'')).join('\n'),
    // rightTrimAllLines = text => text.split('\n').map(line => line.replaceAll(/\s+$/gu,'')).join('\n'),
    // oneSpaceBeforeEachNewLine = text => rightTrimAllLines(text).replaceAll('\n', ' \n'),
    fixAmp = (text) => text.replaceAll('&amp;', '&'),
    // cleaned_text = txtMap(
    //     url_expanded_text,
    //     {
    //        'preprocess': {
    //
    //         },
    //         'number' : {
    //             'true': {},
    //             'false': {
    //                 'process': text => {
    //                     cleanEmoji(
    //                         cleanText(
    //                             text
    //                         )
    //                     )
    //                 }
    //             }
    //         }
    //     }
    //     ^^^ BUILD THIS ^^^
    // txtMap( // why? i don't know
        // url_expanded_text,
        // [
        //     {
        //         'emojiRidden': obj => isEmojiRidden(obj.text) === false ? false: true,
        //     },
        //     {
        //         'type' : 'character',
        //         'if' : {
        //             'true' : 'emojiRidden',
        //             'false' : 'isNumber',
        //             'return': obj => removeEmoji(obj.return),
        //         },
        //     },
        // ],
    // )
    // rfdc
    // deepmerge
    // txt-base
    // // merge + clone is probably overkill
    procBool = (obj) => {
    },
    procMap = (obj) => { // maybe don't clone at all and just manipulate the same obj over and over?
    //maybe don't do this and find something better to do with your time
        if (Array.isArray(obj)) {
            return obj.map(procMap);
        } else if (isObject(obj)){
            if (Array.isArray(obj.map)) {
                return obj; // reduce .map(procMap);
            } else if (isObject(obj.map)){
                let types = {
                    'if' : obj => {
                        if (isObject(obj.if)) {
                            const truePass = obj.if.true.reduce((accumulator, currentValue) => accumulator &&
                                procBool(merge(clone(obj), { 'parent': clone(obj) }, {'return':currentValue}))),
                            falsePass = true; // todo
                            if (truePass && falsePass) {
                              return procMap(merge.all([clone(obj), { 'parent': clone(obj) }, {'if': undefined, 'else': undefined}, obj.if, {'true': undefined, 'false': undefined, 'else': undefined }]));
                            } else if (isObject(obj.if.else) && obj.if.else) {
                              return procMap(merge.all([clone(obj), { 'parent': clone(obj) }, {'if': undefined, 'else': undefined}, obj.if.else]));
                            } else {
                              return procMap(merge.all([clone(obj), { 'parent': clone(obj) }, {'if': undefined, 'else': undefined}, obj.else]));
                            }
                        } else {
                            return obj;
                        }
                    },
                    'else': obj => self.if(obj),
                    'process': obj => {
                        for (i = 0; i < obj.keys.length; i++) {
                            if (types.includes(obj[obj.keys[i]])) {

                            } else {
                                if (typeof obj[obj.keys[i]] === 'function') {
                                    obj[
                                } else {
                                }
                            }
                        }
                    }
                 };
                 types = merge.all([clone(types), clone(obj.types), clone(obj.map.types || {})]);
                 const type = typeof obj.type === 'string' ? types.keys.includes(obj.type) ? obj.type : 'process' : 'process';
                 return types[type](obj);
                 };
             } else {
                  return obj
              }
            // if an array is received
            // if there is a type:
            // if there is a types value as a property
            // if there is a body:
            // default to set properties
            // if a function is found in a property
        } else {
            return obj;
        }
        return obj;
    },
    txtMap = (text, map) => {
        const obj = {
            text,
            map,
            'runes': runes(text),
            'types': {
                'character': obj => {
                    let symbols = [];
                    for (i = 0; i < obj.return.length; i++) { // shallow or deep copy?
                        symbols.push(Symbol('character:' + i.toString() + ':' + Date.now().toISOString()));
                        obj.character[symbols[i]] = procMap(merge([clone(obj), { 'parent': clone(obj) }, {'return': obj.return[i], 'character': { i, 'text': obj.return[i]}}]))
                    }
                    return merge([clone(obj), { 'parent': clone(obj) }, { 'return': symbols.reduce((accumulator, currentValue) => accumulator + obj.character[currentValue].return)}]);
                }
            },
        };
        obj.return = obj.runes
        return procMap(obj);
    },
    start = async () => {
        try {
            // user_SCREEN_NAME is replaced with the user's name.
            // bot_screen_name is replaced by the bot's twitter handle in reply.
            // Set SIGNATURE to 'none' to actually have no signature.
            // 'at' @twetJs if you need 'none' as a signature and we'll see. PRs welcome!
            // todo parameterize module_screen_name
            const module_screen_name =
                    process.env.MODULE_SCREEN_NAME || 'twetJs',
                signature =
                    process.env.SIGNATURE ||
                    ' \nThanks, USER_SCREEN_NAME! \n\n@BOT_SCREEN_NAME #BOT_SCREEN_NAME \n[\'TWEET_ID_OR_TAG\']',
                bot_name = process.env.BOT_NAME || module_screen_name,
                data_dir = trimPath(process.env.DATA_DIR || './data'),
                log_dir = data_dir + '/logs',
                params = {
                    subdomain: 'api',
                    version: '1.1',
                    consumer_key: process.env.TWITTER_CONSUMER_KEY,
                    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
                    access_token_key:
                        process.env.TWITTER_ACCESS_TOKEN ||
                        process.env.ACCESS_TOKEN, // oauth
                    access_token_secret:
                        process.env.TWITTER_ACCESS_TOKEN_SECRET ||
                        process.env.ACCESS_TOKEN_SECRET, // oauth
                },
                port = await getNewPort(),
                webhook = new Autohook({ port: port, });
            if (!fs.existsSync(log_dir)) {
                fs.mkdirSync(log_dir);
            }
            await removeWebhooks();
            webhook.on('event', async (event) => {
                try {
                    appendLog(log_dir, bot_name, 'event', event);
                    processLog(event);
                    for (const [key, value] of Object.entries(event)) {
                        console.log(
                            '{ "isoString" : "' +
                                new Date().toISOString() +
                                '" }'
                        );
                        if (Array.isArray(value)) {
                            appendLog(log_dir, bot_name, key, value);
                            processLog({ type: key, });
                            if (event.tweet_create_events) {
                                const bot_user_id = event.for_user_id,
                                    tweet_create_events = event.tweet_create_events.map(
                                        async (tweet) => {
                                            const tweet_id = tweet.id_str;
                                            if (
                                                getProperty(
                                                    getProperty(
                                                        tweet,
                                                        'extended_tweet',
                                                        tweet
                                                    ),
                                                    'full_text',
                                                    getProperty(
                                                        getProperty(
                                                            tweet,
                                                            'extended_tweet',
                                                            tweet
                                                        ),
                                                        'text',
                                                        tweet.text
                                                    )
                                                )
                                                    .toString()
                                                    .toLowerCase()
                                                    .includes('bug')
                                            ) {
                                                appendLog(
                                                    log_dir,
                                                    bot_name,
                                                    key +
                                                        '.tweetThreadReply.bugReport.prelim',
                                                    { value, event, }
                                                );
                                            }
                                            if (
                                                tweet.user.id_str ===
                                                bot_user_id
                                            ) {
                                                appendLog(
                                                    log_dir,
                                                    bot_name,
                                                    key + '.self',
                                                    value
                                                );
                                                return { sub_type: 'self', };
                                            } else if (
                                                tweet.text
                                                    .toString()
                                                    .startsWith('RT')
                                            ) {
                                                appendLog(
                                                    log_dir,
                                                    bot_name,
                                                    key + '.rt',
                                                    value
                                                );
                                                return { sub_type: 'rt', };
                                            } else {
                                                appendLog(
                                                    log_dir,
                                                    bot_name,
                                                    key + '.other',
                                                    value
                                                );
                                                const in_reply_to_status_id =
                                                        tweet.in_reply_to_status_id_str,
                                                    in_reply_to_screen_name =
                                                        tweet.in_reply_to_screen_name,
                                                    user_name = tweet.user.name.toString(),
                                                    user_screen_name = tweet.user.screen_name.toString(),
                                                    extended_tweet = getProperty(
                                                        tweet,
                                                        'extended_tweet',
                                                        tweet
                                                    ),
                                                    display_text_range = getProperty(
                                                        extended_tweet,
                                                        'display_text_range',
                                                        [-Infinity, Infinity,]
                                                    ),
                                                    user_tweet_text = getProperty(
                                                        extended_tweet,
                                                        'full_text',
                                                        extended_tweet.text
                                                    ).substring(
                                                        display_text_range[0],
                                                        display_text_range[1]
                                                    ),
                                                    entities = getProperty(
                                                        extended_tweet,
                                                        'entities'
                                                    ),
                                                    user_mentions = getProperty(
                                                        entities,
                                                        'user_mentions'
                                                    ),
                                                    bot_user_mentions =
                                                        user_mentions ===
                                                            null ||
                                                        user_mentions ===
                                                            undefined ?
                                                            null
                                                            : user_mentions.find(
                                                                (obj) =>
                                                                    obj.id_str ===
                                                                      bot_user_id
                                                            ),
                                                    bot_screen_name = getProperty(
                                                        bot_user_mentions,
                                                        'screen_name',
                                                        module_screen_name
                                                    ),
                                                    client = new Twitter(
                                                        params
                                                    ),
                                                    status_reply_to =
                                                        typeof in_reply_to_status_id ===
                                                            'undefined' ||
                                                        in_reply_to_status_id ===
                                                            null ||
                                                        in_reply_to_status_id ===
                                                            '' ?
                                                            ''
                                                            : await (async () => {
                                                                try {
                                                                    return await client.get(
                                                                        'statuses/show',
                                                                        {
                                                                            id: in_reply_to_status_id,
                                                                            tweet_mode:
                                                                                  'extended',
                                                                        }
                                                                    );
                                                                } catch (e) {
                                                                    if (
                                                                        'errors' in
                                                                          e
                                                                    ) {
                                                                        if (
                                                                            e
                                                                                .errors[0]
                                                                                .code ===
                                                                              88
                                                                        ) {
                                                                            // Twitter API error
                                                                            processLog(
                                                                                {
                                                                                    e,
                                                                                    error: {
                                                                                        'x-rate-limit-reset': new Date(
                                                                                            e._headers.get(
                                                                                                'x-rate-limit-reset'
                                                                                            ) *
                                                                                                  1000
                                                                                        ),
                                                                                    },
                                                                                }
                                                                            );
                                                                        } else {
                                                                            // some other kind of error , e.g. read-only API trying to POST
                                                                        }
                                                                    } else {
                                                                        // non-API error , e.g. network problem or invalid JSON in response
                                                                    }
                                                                    processError(
                                                                        e
                                                                    );
                                                                    return '';
                                                                }
                                                            })(),
                                                    extended_tweet_reply_to = getProperty(
                                                        status_reply_to,
                                                        'extended_tweet',
                                                        status_reply_to
                                                    ),
                                                    reply_to_display_text_range = getProperty(
                                                        extended_tweet_reply_to,
                                                        'display_text_range',
                                                        [-Infinity, Infinity, ]
                                                    ),
                                                    reply_entities = getProperty(
                                                        extended_tweet_reply_to,
                                                        'entities',
                                                        null
                                                    ),
                                                    urls = getProperty(
                                                        reply_entities,
                                                        'urls',
                                                        null
                                                    ),
                                                    /* jshint ignore:start */
                                                    urlsLog = appendLog( // eslint-disable-line no-unused-vars
                                                        log_dir,
                                                        bot_name,
                                                        key +
                                                            '.tweetThreadReply.urls',
                                                        urls
                                                    ),
                                                    /* jshint ignore:end */
                                                    media_reply_entities = getProperty(
                                                        extended_tweet_reply_to,
                                                        'extended_entities',
                                                        reply_entities
                                                    ),
                                                    media = getProperty(
                                                        media_reply_entities,
                                                        'media',
                                                        null
                                                    ),
                                                    /* jshint ignore:start */
                                                    mediaLog = appendLog( // eslint-disable-line no-unused-vars
                                                        log_dir,
                                                        bot_name,
                                                        key +
                                                            '.tweetThreadReply.urls.media',
                                                        media
                                                    ),
                                                    /* jshint ignore:end */
                                                    quoted_status_permalink = getProperty(
                                                        extended_tweet_reply_to,
                                                        'quoted_status_permalink',
                                                        null
                                                    ),
                                                    quoted_status_permalink_expanded = getProperty(
                                                        quoted_status_permalink,
                                                        'expanded',
                                                        null
                                                    ),
                                                    url_expanded_text = urlExpand(
                                                        (
                                                            getProperty(
                                                                extended_tweet_reply_to,
                                                                'full_text',
                                                                extended_tweet_reply_to.text
                                                            ) || ''
                                                        ).substring(
                                                            reply_to_display_text_range[0]
                                                        ),
                                                        urls,
                                                        media,
                                                        quoted_status_permalink_expanded
                                                    ),
                                                    cleaned_text = txtMap( // why? i don't know
                                                        url_expanded_text, // could be array, could be object with properties like 'text'
                                                        [ // ordered, each process could have type: process, body:, but..
                                                            // todo: decide between property or just saying property leaning towards latter
                                                            { // type: property, body: { 'emoji..
                                                                'emojiRidden': obj => isEmojiRidden(obj.text) === false ? false: true,
                                                            },
                                                            {
                                                                'type' : 'character', // split the return of whatever you receive by char
                                                                // creates 'character' properties like 'i', 'value'
                                                                // use: body: [] if more than one thing to apply
                                                                // body: [{ // highest priority last, default = index, priority only for application, not conditional evaluation
                                                                'if' : { // if both optional properties true/false == [values] 'then'
                                                                    'true' : 'emojiRidden', // property: emojiRidden ?sugar overlaps w/plaintext?
                                                                    'false' : 'isNumber', //listDefaults
                                                                    'return': obj => removeEmoji(obj.return), //if function built for obj can just say return: 'functionName'
                                                                    // function: if one needs to manipulate the full object
                                                                    // 'or' : [{ 'true': 'emojiRidden' }, { 'true': 'isEmoji' }]
                                                                    // 'else': { return: obj.return }
                                                                }, // array for multiple if thens
                                                                //  'else': if literally every if option doesn't happen
                                                                // }]
                                                                'return': obj.return, // happens last, use body: [{},{},...] for more complexity
                                                            },
                                                        ],
                                                        // {
                                                            // 'type': 'process',
                                                            // 'body':
                                                                    // 'begin': {}, // optional, runs first, once at all, carries down, .map
                                                                    // 'process': {}// optional, runs second, per-object, if array runs each in order
                                                                    // process.type: sync||async       // todo: async/multiple at once, important, lol prolog
                                                                    // 'end': {}, //optional, runs third, once at all, carries down, if array runs each in order
                                                        // },
                                                    ),
                                                    straightened_lines = normalizeNewlines(
                                                        reduceEmptyLinesToSingle(
                                                            trimAllLines(
                                                                normalizeSpaces(
                                                                    fixAmp(
                                                                        cleaned_text.return
                                                                    )
                                                                )
                                                            )
                                                        )
                                                    ).trim(),
                                                    reply_text =
                                                        typeof in_reply_to_status_id ===
                                                            'undefined' ||
                                                        in_reply_to_status_id ===
                                                            null ||
                                                        in_reply_to_status_id ===
                                                            '' ?
                                                            ''
                                                            : '@ ' +
                                                              in_reply_to_screen_name +
                                                              ' SAYS:\n\n' +
                                                              straightened_lines +
                                                              '\n\n' +
                                                              'END @ ' +
                                                              in_reply_to_screen_name +
                                                              ' QUOTE\n' +
                                                              cleaned_text.alterations;
                                                appendLog(
                                                    log_dir,
                                                    bot_name,
                                                    key +
                                                        '.tweetThreadReply.replyTweet',
                                                    status_reply_to
                                                );
                                                if (
                                                    user_tweet_text
                                                        .toString()
                                                        .toLowerCase()
                                                        .includes('bug')
                                                ) {
                                                    appendLog(
                                                        log_dir,
                                                        bot_name,
                                                        key +
                                                            '.tweetThreadReply.bugReport',
                                                        {
                                                            status_reply_to,
                                                            event,
                                                        }
                                                    );
                                                }
                                                if (
                                                    user_tweet_text
                                                        .toString()
                                                        .toLowerCase()
                                                        .includes(
                                                            '@' +
                                                                bot_screen_name.toLowerCase()
                                                        )
                                                ) {
                                                    appendLog(
                                                        log_dir,
                                                        bot_name,
                                                        key +
                                                            '.tweetThreadReply.reply_text',
                                                        reply_text
                                                    );
                                                    const thread = [
                                                        (
                                                            '@' +
                                                            user_screen_name +
                                                            '\n' + //', here you go!\n' +
                                                            // status + '\n' +
                                                            reply_text +
                                                            '\n' +
                                                            getSignature(
                                                                user_name,
                                                                bot_screen_name,
                                                                in_reply_to_status_id ||
                                                                    tweet_id,
                                                                signature
                                                            )
                                                        ).trim(),
                                                    ].flat(Infinity);
                                                    appendLog(
                                                        log_dir,
                                                        bot_name,
                                                        key +
                                                            '.tweetThreadReply',
                                                        {
                                                            tweetThreadReply: {
                                                                thread,
                                                                tweet_id,
                                                                params,
                                                            },
                                                        }
                                                    );
                                                    processLog(status_reply_to);
                                                    tweetThreadReply(
                                                        thread,
                                                        tweet_id,
                                                        params
                                                    ).catch(processError);
                                                    return {
                                                        sub_type: 'other.tweet',
                                                    };
                                                } else {
                                                    const indirect = {};
                                                    indirect[key] = value;
                                                    appendLog(
                                                        log_dir,
                                                        bot_name,
                                                        key + '.indirect',
                                                        indirect
                                                    );
                                                    return {
                                                        sub_type:
                                                            'other.indirect',
                                                    };
                                                }
                                                return { // eslint-disable-line no-unreachable
                                                    sub_type: 'other.etc',
                                                };
                                            }
                                        }
                                    ),
                                    filtered_tweet_create_events = tweet_create_events.filter(
                                        (el) =>
                                            el &&
                                            el.then &&
                                            typeof el.then === 'function'
                                    );
                                if (
                                    Array.isArray(
                                        filtered_tweet_create_events
                                    ) &&
                                    filtered_tweet_create_events.length > 0
                                ) {
                                    Promise.all(
                                        filtered_tweet_create_events
                                    ).then((completed) =>
                                        processLog(completed)
                                    );
                                }
                            }
                        } else {
                            // likely "for_user_id:", "user_has_blocked:"...
                            const nonArray = {};
                            nonArray[key] = value;
                            appendLog(log_dir, bot_name, 'non-array', nonArray);
                            processLog(nonArray);
                        }
                    }
                } catch (e) {
                    processError(e);
                }
            });
            await webhook.start();
            await webhook.subscribe({
                oauth_token: process.env.TWITTER_ACCESS_TOKEN,
                oauth_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
            });
        } catch (e) {
            if ('errors' in e) {
                if (e.errors[0].code === 88) {
                    // Twitter API error
                    processLog(
                        '{ "e": {' +
                            e +
                            '}, "error" : { "x-rate-limit-reset" : ' +
                            new Date(
                                e._headers.get('x-rate-limit-reset') * 1000
                            ) +
                            ' } }'
                    );
                } else {
                    // some other kind of error , e.g. read-only API trying to POST
                }
            } else {
                // non-API error , e.g. network problem or invalid JSON in response
            }
            processError(e);
        }
    },
    startSync = () => {
        try {
            start();
        } catch (e) {
            if ('errors' in e) {
                if (e.errors[0].code === 88) {
                    // Twitter API error
                    processLog(
                        '{ "e": {' +
                            e +
                            '}, "error" : { "x-rate-limit-reset" : ' +
                            new Date(
                                e._headers.get('x-rate-limit-reset') * 1000
                            ) +
                            ' } }'
                    );
                } else {
                    // some other kind of error , e.g. read-only API trying to POST
                }
            } else {
                // non-API error , e.g. network problem or invalid JSON in response
            }
            processError(e);
        }
    };

// export section
export const bot = { start: start, startSync: startSync, };
export default bot;
