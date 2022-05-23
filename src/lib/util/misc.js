import _ from 'lodash';
import striptagsPackage from 'striptags';
import jwt from 'jsonwebtoken';

import { parsePhoneNumber as parsePhoneNumberLib } from 'libphonenumber-js';

export const emailRegexPattern =
  /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

export function striptags(v) {
  return striptagsPackage(v || '');
}

export function safeGetValue(obj, path) {
  if (obj === null || obj === undefined) {
    return null;
  }

  return _.get(obj, path);
}

export function isValidEmail(email) {
  return !!(email && emailRegexPattern.test(email));
}

export function parsePhoneNumber(phone) {
  const phoneNumber = parsePhoneNumberLib(phone, 'BR');

  return {
    valid: phoneNumber.isValid(),
    nationalNumber: phoneNumber.nationalNumber.toString(),
    internationalNumber: phoneNumber.formatInternational().toString(),
    country: phoneNumber.country,
  };
}

export function randomNumber(min = 0, max = 10) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// http://stackoverflow.com/questions/4356289/php-random-string-generator
export function randomCode(size = 10, alfaNumeric = true) {
  const numbers = '0123456789';
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const characters = alfaNumeric ? numbers + letters : numbers;

  const charactersLength = characters.length;
  let randomString = '';

  for (let i = 0; i < size; i++) {
    const charIndex = randomNumber(0, charactersLength - 1);
    randomString += characters[charIndex];
  }

  return randomString;
}

export function interpolateText(text, values) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  Object.keys(values).forEach((val) => {
    const regex = new RegExp('{{' + val + '}}', 'g');
    text = (text || '').replace(regex, values[val]);
  });

  return text;
}

export function castToNumber(n) {
  try {
    return parseInt(n);
  } catch (err) {
    return 0;
  }
}

export function removeFields(obj, fields) {
  if (obj) {
    fields.forEach((f) => {
      if (obj.hasOwnProperty(f)) {
        delete obj[f];
      }
    });
  }

  return obj;
}

export function sign(val) {
  return jwt.sign(val, 'ki87tgvbnju7654esxcft5432qgfdsw234567yuio8765rew2');
}

export function verifySignature(hashed) {
  return jwt.verify(
    hashed,
    'ki87tgvbnju7654esxcft5432qgfdsw234567yuio8765rew2'
  );
}

export function getIpAddress(req) {
  const xForwardedFor = String(req.headers['x-forwarded-for'] || '').replace(
    /:\d+$/,
    ''
  );

  return xForwardedFor || req.connection.remoteAddress;
}
