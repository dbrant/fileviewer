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

function parseFormat(reader)
{
	var results = new ResultNode("MOV structure");
	try {
		var stream = new DataStream(reader);
        movProcessChunks(stream, stream.length(), "", results);
	} catch(e) {
		console.log("Error while reading MOV: " + e);
	}
	return results;
}

function movProcessChunks(stream, maxLen, parentChunk, results) {
    var chunkType;
    var chunkLength;

    while (stream.position < maxLen) {
        chunkLength = stream.readUIntBe();
        chunkType = stream.readAsciiString(4);

        var node = results.add(chunkType, chunkLength.toString() + " bytes");

        //if (movChunkTypes.indexOf(chunkType) < 0) {
        //    break;
        //}

        if (chunkType == "data") {
            if (parentChunk == "covr") {
                var thumbString = "data:image/png;base64," + base64FromArrayBuffer(stream.reader.dataView.buffer, stream.position + 8, chunkLength - 16);
                stream.reader.onGetPreviewImage(thumbString);
            } else if (movAsciiableChunks.indexOf(parentChunk) >= 0) {
                var numAsciiBytes = chunkLength - 8;
                console.log(">>> " + numAsciiBytes);
                if (numAsciiBytes > 0) {
                    node.add("Value", stream.reader.getAsciiStringAt(stream.position + 8, numAsciiBytes));
                }
            }
        }

        if (movSubChunkableChunks.indexOf(chunkType) >= 0) {

            movProcessChunks(stream, chunkLength, chunkType,  node);
            
        } else if (chunkType == "meta") {
            stream.skip(4);
            chunkLength -= 4;
            movProcessChunks(stream, chunkLength, chunkType, node);
        } else {
            chunkLength -= 8;
            if (chunkLength > 0) {
                stream.skip(chunkLength);
            }
        }
    }
}

var movChunkTypes = [ "ftyp", "moov", "mdat", "mvhd", "trak", "udta", "meta",
    "mdia", "minf", "stbl", "tkhd", "mdhd", "stsd", "stsc", "stts", "ctts", "stco", "co64",
    "free", "skip", "wide", "stss", "stsz", "chpl", "pdin", "ilst", "auth", "titl", "dscp",
    "cprt", "text", "tx3g", "uuid" ];

var movSubChunkableChunks = [ "moov", "trak", "mdia", "minf", "stbl", "udta", "ilst", "covr", "\xA9nam", "\xA9ART", "\xA9alb" ];

var movAsciiableChunks = [ "\xA9nam", "\xA9ART", "\xA9alb" ];
