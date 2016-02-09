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
		var chunkType;
        var chunkLength;

		while (!stream.eof()) {
            chunkLength = stream.readUIntBe();
            chunkType = stream.readAsciiString(4);

            results.add(chunkType, chunkLength.toString() + " bytes");

            if (movChunkTypes.indexOf(chunkType) < 0) {
                break;
            }

            chunkLength -= 8;
            if (chunkLength > 0) {
                stream.skip(chunkLength);
            }
		}
	} catch(e) {
		console.log("Error while reading MOV: " + e);
	}
	return results;
}

var movChunkTypes = [ "ftyp", "moov", "mdat", "mvhd", "trak", "udta", "meta",
    "mdia", "minf", "stbl", "tkhd", "mdhd", "stsd", "stsc", "stts", "ctts", "stco", "co64",
    "free", "skip", "wide", "stss", "stsz", "chpl", "pdin", "ilst", "auth", "titl", "dscp",
    "cprt", "text", "tx3g", "uuid" ];
