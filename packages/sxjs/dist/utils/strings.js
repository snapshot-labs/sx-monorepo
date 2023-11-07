"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shortStringArrToStr = exports.shortStringToStr = exports.strToShortStringArr = exports.shortStrToFelt = void 0;
const SHORT_STR_SIZE = 31;
function shortStrToFelt(str) {
    let res = '0x';
    // String too big
    if (str.length > SHORT_STR_SIZE)
        return BigInt(0);
    for (let i = 0; i < str.length; i++) {
        let toAdd = str.charCodeAt(i).toString(16);
        // If value is < 10, prefix with a 0
        if (toAdd.length % 2 !== 0)
            toAdd = `0${toAdd}`;
        res += toAdd;
    }
    return BigInt(res);
}
exports.shortStrToFelt = shortStrToFelt;
function strToShortStringArr(str) {
    const res = [];
    for (let i = 0; i < str.length; i += SHORT_STR_SIZE) {
        const temp = str.slice(i, i + SHORT_STR_SIZE);
        res.push(shortStrToFelt(temp));
    }
    return res;
}
exports.strToShortStringArr = strToShortStringArr;
function shortStringToStr(shortStringArr) {
    let res = '';
    const hexForm = shortStringArr.toString(16);
    const chunkSize = 2;
    if (hexForm.length % chunkSize !== 0)
        throw 'ERROR IN PARSING';
    for (let i = 0; i < hexForm.length; i += chunkSize) {
        const s = parseInt(hexForm.slice(i, i + chunkSize), 16);
        res += String.fromCharCode(s);
    }
    return res;
}
exports.shortStringToStr = shortStringToStr;
function shortStringArrToStr(shortStringArr) {
    let res = '';
    for (const shortStr of shortStringArr) {
        res += shortStringToStr(shortStr);
    }
    return res;
}
exports.shortStringArrToStr = shortStringArrToStr;
