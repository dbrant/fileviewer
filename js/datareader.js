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

var DataReader = function(file) {
    this.file = file;
    this._length = file.size;
    this._chunkSize = 1048576; // 1MB chunks
    this._chunkCache = new Map();
    this._maxCachedChunks = 32;

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
        return this._length;
    };

    this._ensureChunk = async function(offset) {
        var chunkIndex = Math.floor(offset / this._chunkSize);
        if (!this._chunkCache.has(chunkIndex)) {
            if (this._chunkCache.size >= this._maxCachedChunks) {
                var firstKey = this._chunkCache.keys().next().value;
                this._chunkCache.delete(firstKey);
            }
            var start = chunkIndex * this._chunkSize;
            var end = Math.min(start + this._chunkSize, this._length);
            var buf = await this.file.slice(start, end).arrayBuffer();
            this._chunkCache.set(chunkIndex, { dataView: new DataView(buf), base: start });
        }
        return this._chunkCache.get(chunkIndex);
    };

    this._readValue = async function(offset, size, readFunc) {
        var chunkIndex = Math.floor(offset / this._chunkSize);
        var chunkEndIndex = Math.floor((offset + size - 1) / this._chunkSize);
        if (chunkIndex === chunkEndIndex) {
            var chunk = await this._ensureChunk(offset);
            return readFunc(chunk.dataView, offset - chunk.base);
        } else {
            // Value spans chunk boundary - read a small slice directly
            var buf = await this.file.slice(offset, offset + size).arrayBuffer();
            return readFunc(new DataView(buf), 0);
        }
    };

    this.byteAt = async function(offset) {
        return this._readValue(offset, 1, function(dv, o) { return dv.getUint8(o); });
    };

    this.ushortLeAt = async function(offset) {
        return this._readValue(offset, 2, function(dv, o) { return dv.getUint16(o, true); });
    };

    this.ushortBeAt = async function(offset) {
        return this._readValue(offset, 2, function(dv, o) { return dv.getUint16(o, false); });
    };

    this.shortLeAt = async function(offset) {
        return this._readValue(offset, 2, function(dv, o) { return dv.getInt16(o, true); });
    };

    this.shortBeAt = async function(offset) {
        return this._readValue(offset, 2, function(dv, o) { return dv.getInt16(o, false); });
    };

    this.uintLeAt = async function(offset) {
        return this._readValue(offset, 4, function(dv, o) { return dv.getUint32(o, true); });
    };

    this.uintBeAt = async function(offset) {
        return this._readValue(offset, 4, function(dv, o) { return dv.getUint32(o, false); });
    };

    this.intLeAt = async function(offset) {
        return this._readValue(offset, 4, function(dv, o) { return dv.getInt32(o, true); });
    };

    this.intBeAt = async function(offset) {
        return this._readValue(offset, 4, function(dv, o) { return dv.getInt32(o, false); });
    };

    this.floatLeAt = async function(offset) {
        return this._readValue(offset, 4, function(dv, o) { return dv.getFloat32(o, true); });
    };

    this.floatBeAt = async function(offset) {
        return this._readValue(offset, 4, function(dv, o) { return dv.getFloat32(o, false); });
    };

    this.doubleLeAt = async function(offset) {
        return this._readValue(offset, 8, function(dv, o) { return dv.getFloat64(o, true); });
    };

    this.doubleBeAt = async function(offset) {
        return this._readValue(offset, 8, function(dv, o) { return dv.getFloat64(o, false); });
    };

    this.getAsciiStringAt = async function(offset, length) {
        var result = "";
        for (var i = 0; i < length; i++) {
            result += String.fromCharCode(await this.byteAt(offset + i));
        }
        return result;
    };

    this.getSliceAsArrayBuffer = async function(offset, length) {
        return this.file.slice(offset, offset + length).arrayBuffer();
    };

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
        if (this.position < 0) {
            this.position = 0;
        }
    };

    this.seek = function(offset, whence) {
        if (whence == 0) {
            this.reset();
            this.skip(offset);
        } else if (whence == 1) {
            this.skip(offset);
        } else if (whence == 2) {
            this.reset();
            this.skip(this.length() + offset);
        }
    };

    this.readByte = async function() {
        var b = await this.reader.byteAt(this.position);
        this.position++;
        return b;
    };

    this.readUShortLe = async function() {
        var r = await this.reader.ushortLeAt(this.position);
        this.position += 2;
        return r;
    };

    this.readUShortBe = async function() {
        var r = await this.reader.ushortBeAt(this.position);
        this.position += 2;
        return r;
    };

    this.readShortLe = async function() {
        var r = await this.reader.shortLeAt(this.position);
        this.position += 2;
        return r;
    };

    this.readShortBe = async function() {
        var r = await this.reader.shortBeAt(this.position);
        this.position += 2;
        return r;
    };

    this.readUIntLe = async function() {
        var r = await this.reader.uintLeAt(this.position);
        this.position += 4;
        return r;
    };

    this.readUIntBe = async function() {
        var r = await this.reader.uintBeAt(this.position);
        this.position += 4;
        return r;
    };

    this.readIntLe = async function() {
        var r = await this.reader.intLeAt(this.position);
        this.position += 4;
        return r;
    };

    this.readIntBe = async function() {
        var r = await this.reader.intBeAt(this.position);
        this.position += 4;
        return r;
    };

    this.readLongLe = async function() {
        var r = await this.reader.intLeAt(this.position);
        this.position += 4;
        r = ((await this.reader.intLeAt(this.position)) << 32) + r;
        this.position += 4;
        return r;
    };

    this.readLongBe = async function() {
        var r = await this.reader.intBeAt(this.position);
        this.position += 4;
        r = (r << 32) + (await this.reader.intBeAt(this.position));
        this.position += 4;
        return r;
    };

    this.readFloatLe = async function() {
        var r = await this.reader.floatLeAt(this.position);
        this.position += 4;
        return r;
    };

    this.readFloatBe = async function() {
        var r = await this.reader.floatBeAt(this.position);
        this.position += 4;
        return r;
    };

    this.readDoubleLe = async function() {
        var r = await this.reader.doubleLeAt(this.position);
        this.position += 8;
        return r;
    };

    this.readDoubleBe = async function() {
        var r = await this.reader.doubleBeAt(this.position);
        this.position += 8;
        return r;
    };

    this.readBytes = async function(length) {
        var bytes = [];
        for (var i = 0; i < length; i++) {
            bytes.push(await this.readByte());
        }
        return bytes;
    };

    this.readAsciiString = async function(length) {
        var result = "";
        for (var i = 0; i < length; i++) {
            result += String.fromCharCode(await this.readByte());
        }
        return result;
    };

    this.readUtf16BeString = async function(length, hasHeader) {
        var result = "";
        if (length <= 2) {
            return result;
        }
        var chars;
        if (hasHeader !== undefined && hasHeader == true) {
            this.skip(2);
            chars = (length - 2) / 2;
        } else {
            chars = length / 2;
        }
        for (var i = 0; i < chars; i++) {
            result += String.fromCharCode(await this.readUShortBe());
        }
        return result;
    };

    this.readUtf16LeString = async function(length, hasHeader) {
        var result = "";
        if (length <= 2) {
            return result;
        }
        var chars;
        if (hasHeader !== undefined && hasHeader == true) {
            this.skip(2);
            chars = (length - 2) / 2;
        } else {
            chars = length / 2;
        }
        for (var i = 0; i < chars; i++) {
            result += String.fromCharCode(await this.readUShortLe());
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

function wikiLinkifyString(str) {
    return "<a href='https://en.wikipedia.org/wiki/" + str + "' target='_blank'>" + str + "</a>";
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
