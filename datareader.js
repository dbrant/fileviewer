/*
 Copyright (c) 2016 Dmitry Brant.
 http://dmitrybrant.com

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

var DataReader = function(dView) {
    this.dataView = dView;

    this.getCanvasContext = function() {
        // override me
    };

    this.createImageData = function(bmpWidth, bmpHeight) {
        return this.getCanvasContext().createImageData(bmpWidth, bmpHeight);
    };

    this.onGetPreviewImage = function(imageSrc) {
        // override me
    };

    this.onGetPreviewBitmap = function(imageData) {
        // override me
    };

    this.length = function() {
        return this.dataView.byteLength;
    };

    this.byteAt = function(offset) {
        return this.dataView.getUint8(offset);
    };

    this.ushortLeAt = function(offset) {
        return this.dataView.getUint16(offset, true);
    };

    this.ushortBeAt = function(offset) {
        return this.dataView.getUint16(offset, false);
    };

    this.shortLeAt = function(offset) {
        return this.dataView.getInt16(offset, true);
    };

    this.shortBeAt = function(offset) {
        return this.dataView.getInt16(offset, false);
    };

    this.uintLeAt = function(offset) {
        return this.dataView.getUint32(offset, true);
    };

    this.uintBeAt = function(offset) {
        return this.dataView.getUint32(offset, false);
    };

    this.intLeAt = function(offset) {
        return this.dataView.getInt32(offset, true);
    };

    this.intBeAt = function(offset) {
        return this.dataView.getInt32(offset, false);
    };

    this.floatLeAt = function(offset) {
        return this.dataView.getFloat32(offset, true);
    };

    this.floatBeAt = function(offset) {
        return this.dataView.getFloat32(offset, false);
    };

    this.doubleLeAt = function(offset) {
        return this.dataView.getFloat64(offset, true);
    };

    this.doubleBeAt = function(offset) {
        return this.dataView.getFloat64(offset, false);
    };

    this.getAsciiStringAt = function(offset, length) {
        var result = "";
        for (var i = 0; i < length; i++) {
            result += String.fromCharCode(this.byteAt(offset + i));
        }
        return result;
    }

};

var DataStream = function(dReader, initialOffset) {
    this.reader = dReader;
    this.initialOffset = initialOffset || 0;
    this.position = this.initialOffset;

    this.length = function() {
        return this.reader.length();
    };

    this.eof = function() {
        return this.position >= this.length();
    };

    this.reset = function() {
        this.position = this.initialOffset;
    };

    this.skip = function(offset) {
        this.position += offset;
    };

    this.rewind = function(offset) {
        this.position -= offset;
        if (this.position < 0) {
            this.position = 0;
        }
    };

    this.readByte = function() {
        var b = this.reader.byteAt(this.position);
        this.position++;
        return b;
    };

    this.readUShortLe = function() {
        var r = this.reader.ushortLeAt(this.position);
        this.position += 2;
        return r;
    };

    this.readUShortBe = function() {
        var r = this.reader.ushortBeAt(this.position);
        this.position += 2;
        return r;
    };

    this.readShortLe = function() {
        var r = this.reader.shortLeAt(this.position);
        this.position += 2;
        return r;
    };

    this.readShortBe = function() {
        var r = this.reader.shortBeAt(this.position);
        this.position += 2;
        return r;
    };

    this.readUIntLe = function() {
        var r = this.reader.uintLeAt(this.position);
        this.position += 4;
        return r;
    };

    this.readUIntBe = function() {
        var r = this.reader.uintBeAt(this.position);
        this.position += 4;
        return r;
    };

    this.readIntLe = function() {
        var r = this.reader.intLeAt(this.position);
        this.position += 4;
        return r;
    };

    this.readIntBe = function() {
        var r = this.reader.intBeAt(this.position);
        this.position += 4;
        return r;
    };

    this.readFloatLe = function() {
        var r = this.reader.floatLeAt(this.position);
        this.position += 4;
        return r;
    };

    this.readFloatBe = function() {
        var r = this.reader.floatBeAt(this.position);
        this.position += 4;
        return r;
    };

    this.readDoubleLe = function() {
        var r = this.reader.doubleLeAt(this.position);
        this.position += 8;
        return r;
    };

    this.readDoubleBe = function() {
        var r = this.reader.doubleBeAt(this.position);
        this.position += 8;
        return r;
    };


    this.readAsciiString = function(length) {
        var result = "";
        for (var i = 0; i < length; i++) {
            result += String.fromCharCode(this.readByte());
        }
        return result;
    }
};

function uintToBytesBe(value) {
    var bytes = [];
    bytes.push((value >> 24) & 0xFF);
    bytes.push((value >> 16) & 0xFF);
    bytes.push((value >> 8) & 0xFF);
    bytes.push(value & 0xFF);
    return bytes;
}

function uintToBytesLe(value) {
    var bytes = [];
    bytes.push(value & 0xFF);
    bytes.push((value >> 8) & 0xFF);
    bytes.push((value >> 16) & 0xFF);
    bytes.push((value >> 24) & 0xFF);
    return bytes;
}

function uintToShortsBe(value) {
    var shorts = [];
    shorts.push((value >> 16) & 0xFFFF);
    shorts.push(value & 0xFFFF);
    return shorts;
}

function uintToShortsLe(value) {
    var shorts = [];
    shorts.push(value & 0xFFFF);
    shorts.push((value >> 16) & 0xFFFF);
    return shorts;
}



function base64FromArrayBuffer(arrayBuffer, bOffset, bLength) {
    var base64    = '';
    var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var bytes         = new Uint8Array(arrayBuffer, bOffset, bLength);
    var byteLength    = bLength || bytes.byteLength;
    var byteRemainder = byteLength % 3;
    var mainLength    = byteLength - byteRemainder;

    var a, b, c, d;
    var chunk;

    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
        // Combine the three bytes into a single integer
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

        // Use bitmasks to extract 6-bit segments from the triplet
        a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048)   >> 12; // 258048   = (2^6 - 1) << 12
        c = (chunk & 4032)     >>  6; // 4032     = (2^6 - 1) << 6
        d = chunk & 63;               // 63       = 2^6 - 1

        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
        chunk = bytes[mainLength];

        a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

        // Set the 4 least significant bits to zero
        b = (chunk & 3)   << 4; // 3   = 2^2 - 1

        base64 += encodings[a] + encodings[b] + '==';
    } else if (byteRemainder == 2) {
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

        a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
        b = (chunk & 1008)  >>  4; // 1008  = (2^6 - 1) << 4

        // Set the 2 least significant bits to zero
        c = (chunk & 15)    <<  2; // 15    = 2^4 - 1

        base64 += encodings[a] + encodings[b] + encodings[c] + '=';
    }
    return base64;
}