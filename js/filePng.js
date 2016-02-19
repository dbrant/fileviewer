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
    return parseJpgStructure(reader);
}

function parsePngStructure(reader, offset) {
    var results = new ResultNode("PNG structure");
    try {
        var stream = new DataStream(reader);
        if (offset !== undefined) {
            stream.skip(offset);
        }
        var chunkType;
        var chunkLength;

        stream.skip(8);

        while (!stream.eof()) {
            chunkLength = stream.readUIntBe();
            chunkType = stream.readAsciiString(4);

            var node = results.add(chunkType, chunkLength.toString() + " bytes");

            // read chunk data
            if (chunkLength > 0) {

                var position = stream.position;

                if (chunkType == "tEXt" && chunkLength < 65536) {
                    var chunkStr = reader.getAsciiStringAt(position, chunkLength).replace("\0", " - ");
                    node.add("Contents", chunkStr);
                }

                stream.skip(chunkLength);
            }

            // skip crc
            stream.skip(4);

            // is this the ending chunk?
            if (chunkType == "IEND") {
                break;
            }
        }
    } catch(e) {
        console.log("Error while reading PNG: " + e);
    }
    return results;
}